
(function() {
  var cleanTimeFromDate, drawOverDueTasks, getCurrentUserId, getDateOffsetFromNow, getOverdueTasks, getTaskLink, start, utils;
  utils = null;
  start = function(ut) {
    utils = ut;
    return getOverdueTasks(drawOverDueTasks);
  };
  getOverdueTasks = function(callback) {
    var tasksRequest;
    tasksRequest = {
      filter: {
        deadlineStop: (cleanTimeFromDate(new Date)).toISOString(),
        status: "open",
        participant: getCurrentUserId(),
        sortBy: 'deadline',
        sortOrder: 'ascending'
      },
      success: function() {
        return callback(arguments[1]);
      }
    };
    return window.Teamlab.getPrjTasks(null, tasksRequest);
  };
  drawOverDueTasks = function(tasks) {
    var headerStyle, overdueTasksExist, overdueTasksUrl, task, tasksContainer, widgetContainer, _i, _len;
    overdueTasksUrl = "/products/projects/tasks.aspx#sortBy=deadline&sortOrder=ascending&tasks_responsible=" + (getCurrentUserId()) + "&overdue=true";
    overdueTasksExist = tasks.length > 0;
    widgetContainer = jQuery("<div style=\"text-align: left;\"></div>");
    headerStyle = overdueTasksExist ? "color: red;" : "";
    widgetContainer.append("<a style=\"" + headerStyle + "\" class=\"linkHeaderLightBig\" href=\"" + overdueTasksUrl + "\">Overdue tasks: </a><br/>");
    tasksContainer = jQuery('<div style="margin-left: 40px"></div>');
    widgetContainer.append(tasksContainer);
    if (overdueTasksExist) {
      for (_i = 0, _len = tasks.length; _i < _len; _i++) {
        task = tasks[_i];
        tasksContainer.append(getTaskLink(task), '<br/>');
      }
    } else {
      tasksContainer.append('<div style="font-style: italic">No task is overdue. Congrats!</div>');
    }
    return jQuery('.header-base-big').after(widgetContainer);
  };
  getTaskLink = function(task) {
    var overdueDays, overdueDaysHtml, overdueDaysText, taskTitleHtml, taskUrl;
    taskUrl = "/products/projects/tasks.aspx?prjID=" + task.projectId + "&id=" + task.id;
    overdueDays = getDateOffsetFromNow(task.deadline);
    overdueDaysText = overdueDays === 0 ? 'today' : overdueDays === 1 ? 'yesterday' : overdueDays + ' days';
    overdueDaysHtml = "<span style=\"color: red; margin-left: 20px;\">" + overdueDaysText + "</span>";
    taskTitleHtml = "<span style=\"color: #333;\">" + task.title + "</span>";
    return "<div style=\"margin-top: 5px;\"><a style=\"font-weight: bold\" href=\"" + taskUrl + "\">" + (taskTitleHtml + overdueDaysHtml) + "</a></div>";
  };
  getDateOffsetFromNow = function(pastDate) {
    var cleanedPastDate, millisecondsInDay, today;
    today = cleanTimeFromDate(new Date());
    cleanedPastDate = cleanTimeFromDate(pastDate);
    millisecondsInDay = 1000 * 60 * 60 * 24;
    return (today - cleanedPastDate) / millisecondsInDay;
  };
  cleanTimeFromDate = function(date) {
    var cleanedDate, timepart, _i, _len, _ref;
    cleanedDate = new Date(date);
    _ref = ['Hours', 'Minutes', 'Seconds', 'Milliseconds'];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      timepart = _ref[_i];
      cleanedDate['set' + timepart](0);
    }
    return cleanedDate;
  };
  getCurrentUserId = function() {
    return window.ServiceFactory.profile.id;
  };
  return {
    start: start
  };
});
