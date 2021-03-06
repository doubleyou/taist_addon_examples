
(function() {
  var colorsStorage, docTypesByHashes, rowsPainter, settingsUI, start, utils;
  utils = null;
  start = function(utilities, entryPoint) {
    utils = utilities;
    return colorsStorage.init(function() {
      if (entryPoint === 'user') {
        return rowsPainter.watchForRowsToRedraw();
      } else {
        return settingsUI.waitToRedraw();
      }
    });
  };
  colorsStorage = {
    _stateColors: {},
    init: function(callback) {
      var _this = this;
      return utils.wait.once((function() {
        return _this._getCompanyIdForSharedSettings().length > 0;
      }), function() {
        return _this._loadColorData(_this._getCompanyIdForSharedSettings(), callback);
      });
    },
    _getCompanyIdForSharedSettings: function() {
      return $('.companyName>span').text();
    },
    _colorsKey: 'stateColors',
    _loadColorData: function(companyId, callback) {
      var _this = this;
      return utils.userData.get(this._colorsKey, (function(error, stateColors) {
        _this._stateColors = stateColors != null ? stateColors : {};
        return callback();
      }), companyId);
    },
    getStateColor: function(docType, state) {
      var _ref;
      return (_ref = this._stateColors[docType]) != null ? _ref[state] : void 0;
    },
    _storeColorsOnServer: function(cb) {
      return utils.userData.set(this._colorsKey, this._stateColors, cb, this._getCompanyIdForSharedSettings());
    },
    storeColor: function(docType, state, color, callback) {
      var docTypeColors, _base, _ref;
      docTypeColors = (_ref = (_base = this._stateColors)[docType]) != null ? _ref : _base[docType] = {};
      docTypeColors[state] = color;
      return this._storeColorsOnServer(callback);
    }
  };
  rowsPainter = {
    watchForRowsToRedraw: function() {
      var _this = this;
      return utils.wait.elementRender((function() {
        return _this._getDocsTable().find("tbody tr");
      }), function(row) {
        return _this._redrawRow(row);
      });
    },
    _redrawRow: function(row) {
      var color, state, stateColumnIndex;
      stateColumnIndex = this._getStateColumnIndex(this._getDocsTable());
      if (stateColumnIndex != null) {
        state = this._getRowStateByIndex(row, stateColumnIndex);
        color = colorsStorage.getStateColor(this.getCurrentDocType(), state);
        if (color != null) return this._colorRow(row, color);
      }
    },
    _getRowStateByIndex: function(row, index) {
      return $(row.find('td')[index]).find('[title]').text();
    },
    _colorRow: function(row, color) {
      return row.children().attr('style', 'background:' + color + '!important');
    },
    getCurrentDocType: function() {
      var hashContents;
      hashContents = location.hash.substring(1);
      if (hashContents.indexOf('?') >= 0) {
        hashContents = hashContents.substr(0, hashContents.indexOf('?'));
      }
      return docTypesByHashes[hashContents];
    },
    _getDocsTable: function() {
      return $('table.b-document-table');
    },
    _getStateColumnIndex: function(docsTable) {
      var column, columnNames, i, _len;
      columnNames = docsTable.find('thead').find('tr[class!="floating-header"]').find('th');
      for (i = 0, _len = columnNames.length; i < _len; i++) {
        column = columnNames[i];
        if ($(column).find('[title="Статус"]').length > 0) return i;
      }
      return null;
    }
  };
  settingsUI = {
    waitToRedraw: function() {
      var _this = this;
      this._waitDrawButton(function(saveButton) {
        return saveButton.click(function() {
          return _this._redrawColorPickers();
        });
      });
      return this._onCurrentDocTypeChange(function() {
        return _this._drawColorPickers();
      });
    },
    _waitDrawButton: function(callback) {
      return utils.wait.elementRender(this._saveButtonSelector, callback);
    },
    _onCurrentDocTypeChange: function(callback) {
      var _this = this;
      return utils.wait.repeat((function() {
        return _this._checkIfDocTypeChanged();
      }), callback);
    },
    _checkIfDocTypeChanged: function() {
      var newDocType;
      newDocType = this._getCurrentDocType();
      if ((newDocType != null) && newDocType !== this._currentDocType) {
        this._currentDocType = newDocType;
        return true;
      } else {
        return false;
      }
    },
    _getCurrentDocType: function() {
      var docTypeText;
      if (location.hash === '#states' && (docTypeText = $('.gwt-TreeItem-selected').text()).length > 0) {
        return docTypeText;
      } else {
        return null;
      }
    },
    _currentDocType: null,
    _saveButtonSelector: '.b-popup-button-green',
    _getStateInputs: function() {
      return $('input.gwt-TextBox[size="40"]');
    },
    _redrawColorPickers: function() {
      var _this = this;
      return utils.wait.once((function() {
        return _this._colorPickersRemoved();
      }), (function() {
        return _this._drawColorPickers();
      }));
    },
    _colorPickersRemoved: function() {
      return $('.taistColorPicker').length === 0;
    },
    _getStateFromInput: function(input) {
      return input.val();
    },
    _drawColorPickers: function() {
      var stateNameInput, _i, _len, _ref, _results;
      _ref = this._getStateInputs();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        stateNameInput = _ref[_i];
        _results.push(this._drawColorPicker($(stateNameInput)));
      }
      return _results;
    },
    _drawColorPicker: function(jqStateInput) {
      this._updateStateInputWithStoredColor(jqStateInput);
      return this._addColorPicker(jqStateInput);
    },
    _updateStateInputWithStoredColor: function(input) {
      var storedColor;
      storedColor = colorsStorage.getStateColor(this._getCurrentDocType(), this._getStateFromInput(input));
      return this._setInputColor(input, storedColor != null ? storedColor : 'white');
    },
    _setInputColor: function(input, color) {
      return input.css({
        background: color
      });
    },
    _changeStateColor: function(input, newColor) {
      var _this = this;
      return colorsStorage.storeColor(this._getCurrentDocType(), this._getStateFromInput(input), newColor, function() {
        return _this._updateStateInputWithStoredColor(input);
      });
    },
    _addColorPicker: function(input) {
      var colorPickCallback, oldPickerCell, picker,
        _this = this;
      oldPickerCell = input.parent().next();
      oldPickerCell.hide();
      picker = $('<td class="taistColorPicker"></td>');
      oldPickerCell.after(picker);
      colorPickCallback = function(hexColor) {
        return _this._changeStateColor(input, '#' + hexColor);
      };
      return picker.colourPicker({
        colorPickCallback: colorPickCallback
      });
    }
  };
  jQuery.fn.colourPicker = function(conf) {
    var colors, colourPicker, config, hexInvert;
    config = jQuery.extend({
      id: 'jquery-colour-picker',
      title: 'Pick a colour',
      speed: 500,
      openTxt: 'Open colour picker',
      inputId: 0,
      colorPickCallback: function() {}
    }, conf);
    colors = ['99', 'CC', 'FF'];
    hexInvert = function(hex) {
      var b, g, r, _ref;
      r = hex.substr(0, 2);
      g = hex.substr(2, 2);
      b = hex.substr(4, 2);
      return (_ref = 0.212671 * r + 0.715160 * g + 0.072169 * b < 0.5) != null ? _ref : {
        'ffffff': '000000'
      };
    };
    colourPicker = jQuery('#' + config.id);
    if (!colourPicker.length) {
      colourPicker = jQuery('<div id="' + config.id + '"></div>').appendTo(document.body).hide();
      jQuery(document.body).click(function(event) {
        if (!(jQuery(event.target).is('#' + config.id) || jQuery(event.target).parents('#' + config.id).length)) {
          return colourPicker.hide(config.speed);
        }
      });
    }
    return this.each(function() {
      var bColor, gColor, hex, icon, iconDiv, loc, rColor, select, _i, _j, _k, _len, _len2, _len3;
      select = jQuery(this);
      iconDiv = jQuery('<img icondiv src="data:image/gif;base64,R0lGODlhFwATAPcAAM/R0WKXY9/j5bm8wWCUY+lmaquyt9LV1PPz81VwpVp1rX3lZXniZ67iZFh2qld1qlhyqeTmaX3jZMLGyuZpZ6/jZ+e2Z+iAZq2zueZlZV6UY8/P0c3Nz8vLz+qCaVmm3KngYVVzqea2aHbhX6extVZadWR8ZmB4YuuCbGGTYYvb3F98YmJ7ZVan26qut9fX17i7wMrLzbvAw7i8v7e8v6mssdnZ2crOz6itscfLznvhYonY3Om1aldbeGOXZlZad1ip3ufoaKistdTU1Nvb29DQ0OhracjMzcTFybm+wrW4vVSl3PHx8eizZ8rKzMnKzqats7e8wMDEx8HFxujobP/+/+q2a8bHybi7wtLR1tLS1KivtamttqqvtbG2uleo3cjJzc3Pzuq3Zqiws+traGKTZNXT1ofa3rDkZsvO1cfLzFZdd1V1plZac1yp4eayZld2rKivt1eq3F2p3eflaqzjYWOVZOO0ZrW6vsvLzednaGGXZsPDxbO2u+bnaFlaeauws6attaSvs7a+wLW9wMHCx6+3ulxceOPl5OaBaeLnaYnX2+Pj47/EyuiyaLO6wLa5wMnQ1mSVZsnKzGN9ZFx2qtrY2bq7wMTJzNfZ2Ku0uehoZ6uvunfhZaqvs+Pk5tHT0tPT01ek2rCzur7ExOlpaOlpamCSX+tpa6qusepqa47c3ova3pDc3LO4u+fpbOm0aMrMy63hZYvZ2b3Ax7/AxLG5vL7DxszKzeXnaujo6MbHy6zgYYvc3a/jZIza3rm8w8PDy66zucDDzHffYrS5v7a7v6yxtFNXdFem3ubmbHniYo3c4HrgYHrjY2GVZOi3a2CWZbzCwlRYdby/xldYdOTk5LS+v7/DxOmBaKqxuemDauuDaavhZf///YjY2crKyora267gY8TKytPS1+eEZ6ausefpaufqacXJyltddsfIyud/Zq20vIfY27DlY2F/Zefn52N8ZuWAZLC3va+0umJ8Y1xbeuXmZ+eCZunpba+2vP7//9bW1tjY2P///yH5BAAAAAAALAAAAAAXABMAAAj/AP/9Q2CNiD8bNvwpXLjQBhFGCAT+i+evn78XLxhqrHjxha5/TPqJHEmyZL8XJJlYOkDlnD4qZqBZsWDlALdt3FAMMYJKFZkhmUBleYUuSJBQFniIgaUFRbZyHrSUomDEVBZyRYrkouNH2QYeIpqIAHAhX6JEGwpQ2EQBwAYON/D5iaDoxps7TRzdYJdo3oUwGfQE5sChA64Yk2LkyPPkSI4Y4GI4eeIkRwc1OWKBOYLpSgU0vt7tWiBBwoJ1Pvb4CJDOBCV4JsZdCTalge06E3Q4k8Bggh1JBKJNWWFCHgskSPjckiWuQTdSyxg004HtWYoyBArZY7FihRQptWSA3OAFAgStEcRGdJJxSkN7GSfin5BGbQYNYFiiXJuB5dIAGDAMYgwMMwxAAww0EBLFDEpAwkorqzDjihtAADEHHgpUUgkcxdyjTg+HKPGIIV708osKs9jywRdfyOEFHGw84AA9bZSwRg997JPEKGeEs4MKGLTQQjIttPMABEcKU8IfP/xQTxICGLDIDu58w8kSonywxDEJhBACBNqUgEw102gjQBVpAMKFJ12Q4MKbLmwRxxgukLAFF12k4kIkVfDzzyfDaIKDEDXgEIggNQhhDg5Q1AAFBo0g4s0/AQEAOw==" />');
      icon = jQuery('<a href="#"></a>');
      select.append(icon);
      icon.append(iconDiv);
      loc = '';
      for (_i = 0, _len = colors.length; _i < _len; _i++) {
        rColor = colors[_i];
        for (_j = 0, _len2 = colors.length; _j < _len2; _j++) {
          gColor = colors[_j];
          for (_k = 0, _len3 = colors.length; _k < _len3; _k++) {
            bColor = colors[_k];
            hex = rColor + gColor + bColor;
            loc += '<li><a href="#"  rel="' + hex + '" style="background: #' + hex + '; colour: ' + hexInvert(hex) + ';"></a></li>';
          }
        }
      }
      return icon.click(function() {
        var heading, iconPos, _ref;
        iconPos = icon.offset();
        heading = (_ref = config.title) != null ? _ref : '<h2>' + config.title + {
          '</h2>': ''
        };
        colourPicker.html(heading + '<ul>' + loc + '</ul>').css({
          position: 'absolute',
          left: iconPos.left + 'px',
          top: iconPos.top + 'px'
        });
        colourPicker.show(config.speed);
        jQuery('a', colourPicker).click(function() {
          hex = jQuery(this).attr('rel');
          config.colorPickCallback(hex, config.inputId);
          colourPicker.hide(config.speed);
          return false;
        });
        return false;
      });
    });
  };
  docTypesByHashes = {
    purchaseorder: "Заказ поставщику",
    invoicein: "Счет поставщика",
    supply: "Приёмка",
    purchasereturn: "Возврат поставщику",
    facturein: "Счёт-фактура полученный",
    customerorder: "Заказ покупателя",
    invoiceout: "Счет покупателю",
    demand: "Отгрузка",
    salesreturn: "Возврат покупателя",
    factureout: "Счёт-фактура выданный",
    pricelist: "Прайс-лист",
    loss: "Списание",
    enter: "Оприходование",
    move: "Перемещение",
    inventory: "Инвентаризация",
    processing: "Технологическая операция",
    processingorder: "Заказ на производство",
    internalorder: "Внутренний заказ",
    paymentin: "Входящий платеж",
    cashin: "Приходный ордер",
    paymentout: "Исходящий платеж",
    cashout: "Расходный ордер"
  };
  return {
    start: start
  };
});
