
(function() {
  var ApproveState, StateMachine, WrikeFilterCheckbox, WrikeFilterPanel, prepareStateButtons, render, renderFilterPanel, start, utils, wrikeUtils;
  utils = null;
  start = function(utilities) {
    utils = utilities;
    return wrikeUtils.onTaskViewRender(render);
  };
  render = function(task, taskView) {
    prepareStateButtons(taskView);
    return taskView.stateMachine.applyCurrentState(task);
  };
  prepareStateButtons = function(taskView) {
    var prevElement, state, stateMachine, _i, _len, _ref, _results;
    if (!(taskView.stateMachine != null)) {
      stateMachine = taskView.stateMachine = new StateMachine(taskView);
      prevElement = $('.wspace-task-importance-button');
      _ref = stateMachine.allStates;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        state = _ref[_i];
        _results.push((function(state) {
          var button, buttonClass, newButtonContainer;
          buttonClass = "approval-button-" + state.id;
          newButtonContainer = $("<div class=\"" + buttonClass + "\"></div>");
          prevElement.after(newButtonContainer);
          prevElement = newButtonContainer;
          button = new Ext.Button({
            renderTo: newButtonContainer[0],
            text: state.buttonCaption,
            handler: function() {
              var task;
              task = taskView.record;
              utils.log("updating task: ", task);
              return stateMachine.applyState(state, task, true);
            },
            style: "float: left;margin-left: 15px;"
          });
          return state.button = button;
        })(state));
      }
      return _results;
    }
  };
  renderFilterPanel = function() {
    var filterCheckbox, filterPanel, state, _i, _len, _ref;
    filterPanel = new WrikeFilterPanel('Approval');
    _ref = ApproveState.allStates;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      state = _ref[_i];
      filterCheckbox = new WrikeFilterCheckbox(state.filterName, state.tagText);
      filterPanel.addCheckbox(filterCheckbox);
    }
    return filterPanel.waitToRender();
  };
  StateMachine = (function() {

    StateMachine.prototype.allStates = [];

    StateMachine.prototype._initialNextStateIds = "toApprove";

    StateMachine.prototype._taskView = null;

    function StateMachine(_taskView) {
      this._taskView = _taskView;
      this.allStates.push(new ApproveState("toApprove", "To approve", "To approve", "[ToApprove] ", ["declined", "approved"], "responsible", null));
      this.allStates.push(new ApproveState("declined", "Decline", "Declined", "[Declined] ", ["toApprove"], "author", null));
      this.allStates.push(new ApproveState("approved", "Approve", "Approved", "[Approved] ", [], "responsible", "1"));
    }

    StateMachine.prototype.applyCurrentState = function(task) {
      var currentState, state, _i, _len, _ref;
      currentState = null;
      _ref = this.allStates;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        state = _ref[_i];
        if (state.isUsedBy(task)) currentState = state;
      }
      return this.applyState(currentState, task, false);
    };

    StateMachine.prototype.applyState = function(currentState, task, needUpdate) {
      var nextStateIds, state, visible, _i, _len, _ref, _ref2, _results;
      if ((currentState != null) && needUpdate) {
        this._updateTaskWithState(currentState, task);
      }
      nextStateIds = (_ref = currentState != null ? currentState.nextStateIds : void 0) != null ? _ref : this._initialNextStateIds;
      _ref2 = this.allStates;
      _results = [];
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        state = _ref2[_i];
        visible = nextStateIds.indexOf(state.id) >= 0 && (state.canBeSetOn(task));
        _results.push(state.button.setVisible(visible));
      }
      return _results;
    };

    StateMachine.prototype._updateTaskWithState = function(currentState, task) {
      var state, _i, _len, _ref;
      _ref = this.allStates;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        state = _ref[_i];
        state.removeFromTask(task);
      }
      currentState.addToTask(task);
      return task.save(this._taskView.callback);
    };

    return StateMachine;

  })();
  ApproveState = (function() {

    function ApproveState(id, buttonCaption, filterName, tagText, nextStateIds, availableFor, newTaskState) {
      this.id = id;
      this.buttonCaption = buttonCaption;
      this.filterName = filterName;
      this.tagText = tagText;
      this.nextStateIds = nextStateIds;
      this.availableFor = availableFor;
      this.newTaskState = newTaskState;
    }

    ApproveState.prototype.isUsedBy = function(task) {
      return (task.get("title")).indexOf(this.tagText) >= 0;
    };

    ApproveState.prototype.canBeSetOn = function(task) {
      return (this.availableFor === "responsible" && wrikeUtils.currentUserIsResponsibleForTask(task)) || (this.availableFor === "author" && wrikeUtils.currentUserIsAuthor(task));
    };

    ApproveState.prototype.addToTask = function(task) {
      task.set('title', this.tagText + (task.get('title')));
      if (this.newTaskState != null) return task.set("state", this.newTaskState);
    };

    ApproveState.prototype.removeFromTask = function(task) {
      return task.set('title', (task.get('title')).replace(this.tagText, ''));
    };

    return ApproveState;

  })();
  WrikeFilterCheckbox = (function() {

    function WrikeFilterCheckbox(caption, tagText) {
      var container, form, label,
        _this = this;
      this.caption = caption;
      this.tagText = tagText;
      this.contents = $("<div style=\"padding-left:10px;\"></div>");
      container = $("<div class=\"x-form-check-wrap\"></div>");
      form = $("<div></div>", {
        "class": "x-form-checkbox-inner"
      });
      this.checkbox = $("<input>", {
        type: "checkbox",
        autocomplete: "off",
        "class": "x-form-checkbox x-form-field",
        click: function() {
          form.toggleClass("x-form-check-checked");
          return _this.updateQuery();
        }
      });
      label = $("<label></label>", {
        "class": "x-form-cb-label",
        text: this.caption
      });
      form.append(this.checkbox);
      container.append(form, label);
      this.contents.append(container);
    }

    WrikeFilterCheckbox.prototype.updateQuery = function() {
      var query, text;
      query = Wrike.env.FILTERS.get('text');
      if (this.checked()) {
        query.push(this.tagText);
      } else {
        query = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = query.length; _i < _len; _i++) {
            text = query[_i];
            if (text !== this.tagText) _results.push(text);
          }
          return _results;
        }).call(this);
      }
      return BUS.fireEvent('list.filter.changed', {
        text: query
      });
    };

    WrikeFilterCheckbox.prototype.checked = function() {
      return this.checkbox.is(":checked");
    };

    return WrikeFilterCheckbox;

  })();
  WrikeFilterPanel = (function() {

    WrikeFilterPanel.prototype.template = null;

    WrikeFilterPanel.prototype.checkboxContainer = null;

    WrikeFilterPanel.prototype._parentClass = 'w2-folder-listview-filters-filterspane-body';

    WrikeFilterPanel.prototype._getParent = function() {
      return $('.' + this._parentClass);
    };

    function WrikeFilterPanel(title) {
      this.contents = $("<div class=\"w2-folder-listview-filters-filterpane\">\n	<div class=\"w2-folder-listview-filters-filterpane-title x-unselectable\">" + title + "</div>\n	<div  class=\"x-form-check-group x-column-layout-ct x-form-field w2-folder-listview-filters-filterpane-chgroup\">\n		<div class=\"x-column-inner\" id=\"ext-gen1145\" style=\"width: 170px;\">\n			<div  class=\" x-column\" style=\"width: 170px;\">\n				<div class=\"x-form-item  x-hide-label\" tabindex=\"-1\"></div>\n				<div class=\"x-form-clear-left\"></div>\n			</div>\n		</div>\n	</div>\n</div>");
      this.checkboxContainer = this.contents.find(".x-form-item");
    }

    WrikeFilterPanel.prototype.waitToRender = function() {
      var that;
      that = this;
      utils.aspect.after(Ext.Panel, "afterRender", function() {
        if (this.bodyCssClass === that._parentClass) return that._render();
      });
      return this._render();
    };

    WrikeFilterPanel.prototype._render = function() {
      return this._getParent().append(this.contents);
    };

    WrikeFilterPanel.prototype.addCheckbox = function(checkbox) {
      return this.checkboxContainer.append(checkbox.contents);
    };

    return WrikeFilterPanel;

  })();
  wrikeUtils = {
    getCurrentUserId: function() {
      return w2.user.getUid();
    },
    currentUserIsResponsibleForTask: function(task) {
      return task.data["responsibleList"].indexOf(this.getCurrentUserId()) >= 0;
    },
    currentUserIsAuthor: function(task) {
      return (task.get('author')) === this.getCurrentUserId();
    },
    getTask: function(taskId, callback) {
      return Wrike.Task.get(taskId, function(task) {
        return callback(task);
      });
    },
    getCurrentTaskView: function() {
      return window.Ext.ComponentMgr.get($('.w3-task-view').attr('id'));
    },
    getCurrentTask: function() {
      var _ref;
      return (_ref = this.getCurrentTaskView()) != null ? _ref["record"] : void 0;
    },
    onTaskViewRender: function(callback) {
      var callbackClosure, liveEditorClass,
        _this = this;
      callbackClosure = function() {
        return callback(_this.getCurrentTask(), _this.getCurrentTaskView());
      };
      liveEditorClass = w2.task.widget.liveeditor.View;
      utils.aspect.after(liveEditorClass, "onShowRecord", callbackClosure);
      if (this.getCurrentTaskView()) return callbackClosure();
    },
    onTaskChange: function(callback) {
      return utils.aspect.after(Wrike.Task, "getChanges", (function() {
        return callback(this);
      }));
    }
  };
  return {
    start: start
  };
});
