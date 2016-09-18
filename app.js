function DaysSinceTaskBuilder(input) {
  var daysSinceTask = {
    id: input.id,
    task_name: input.task_name,
    appear_x_days_before_due: input.appear_x_days_before_due,
    due_after_x_days: input.due_after_x_days,
    last_completed_at: moment.unix(input.last_completed_at)
  }

  daysSinceTask.due_date = function() {
    var due_date = this.last_completed_at.clone().add(this.due_after_x_days,'days');
    return moment.max(due_date,this.last_completed_at);
  };
  daysSinceTask.days_since_last_completion = function() {
    var current_date = moment();
    var days_diff = current_date.diff(this.last_completed_at, 'days');
    return days_diff;
  };
  daysSinceTask.appearance_date = function() {
    var appearance_date = this.due_date().subtract(this.appear_x_days_before_due,'days');
    var due_date = this.due_date();
    return moment.min(appearance_date,due_date);
  };
  daysSinceTask.task_status = function() {
    var appearance_date = this.appearance_date();
    var due_date = this.due_date();
    var current_time = moment();
    var state;
    if (current_time.isAfter(due_date)) {
      state = 'due';
    }
    else if (current_time.isAfter(appearance_date)) {
      state = 'warning';
    }
    else {
      state = 'hide';
    }
    return state;
  };
  daysSinceTask.output_info = function() {
    var task_status = this.task_status();
    var days_since_last_completion = this.days_since_last_completion();
    var output = {
      id: this.id,
      task_name: this.task_name,
      task_status: task_status,
      days_since: days_since_last_completion,
      appear_x_days_before_due: this.appear_x_days_before_due,
      due_after_x_days: this.due_after_x_days
    }
    return output;
  }
  return daysSinceTask;
}

function runChromeAppStorage(taskBuilder) {
  var appState = 'active';
  var taskName = document.getElementById('task-name'),
      appearXDaysBeforeDue = document.getElementById('appear-x-days-before-due'),
      dueAfterXDays = document.getElementById('due-after-x-days'),
      numDaysSinceLastCompleted = document.getElementById('num-days-since-last-completed'),
      form = document.querySelector('form');

  function populateTask(task, displayHidden) {
    if ((task.task_status !== 'hide' && displayHidden === false) || (task.task_status === 'hide' && displayHidden === true)) {
      var taskId = task.id;
      $('ol').append('<li><label id="' + task.id + '" class="' + task.task_status + '" title="Task: ' + task.task_name + '&#10;&#10;Last completed: ' + task.days_since + ' days ago&#10;&#10;Due: after ' + task.due_after_x_days + ' days&#10;&#10;Appears: ' + task.appear_x_days_before_due + ' days before due">' + task.task_name + ' - ' + task.days_since +' days</label><img class="remove" id="remove-' + task.id + '" src="remove.png" /></li>');
      $("#" + task.id).hover(function() {
        $(this).addClass('hover');
      }, function() {
        $(this).removeClass('hover');
      });
      $("#" + task.id).click(function() {
        markTaskCompleted(taskId);
      });
      $('#remove-' + task.id).click(function() {
        var taskId = this.id.replace('remove-','');
        removeTask(taskId);
      });
    }
  }

  function markTaskCompleted(taskId) {
    var taskIdToMarkComplete = taskId;
    chrome.storage.sync.get(taskIdToMarkComplete, function(tasks) {
      var task = tasks[taskIdToMarkComplete];
      task.last_completed_at = moment().unix();
      var syncStore = {}
      syncStore[taskIdToMarkComplete] = task;
      chrome.storage.sync.set(syncStore);
    });
  }

  function removeTask(taskId) {
    var id = taskId;
    chrome.storage.sync.remove(id);
  }

  form.addEventListener('submit', function(evt) {
    evt.preventDefault();

    var four_digit_rand = Math.floor(1000 + Math.random() * 9000);
    var id = "" + moment().unix() + four_digit_rand;

    var syncStore = {};
    var daysSinceLastCompleted = Number(numDaysSinceLastCompleted.value);
    var last_completed_at = moment().subtract(daysSinceLastCompleted,'days').unix();

    syncStore[id] = {
      task_name: taskName.value,
      appear_x_days_before_due: Number(appearXDaysBeforeDue.value),
      due_after_x_days: Number(dueAfterXDays.value),
      last_completed_at: last_completed_at
    };
    chrome.storage.sync.set(syncStore,function() {
      form.reset();
      displayActive();
    });
  });

  chrome.storage.onChanged.addListener(function(tasks, namespace) {
    refreshPage();
  });

  function loadTasks(displayHidden) {
    chrome.storage.sync.get(null, function(tasks) {
      console.log(tasks);
      for (id in tasks) {
        var raw_task_info = tasks[id];
        raw_task_info.id = id;
        var task = taskBuilder(raw_task_info).output_info();
        populateTask(task, displayHidden);
      }
    });
  }

  function resetTasks(displayHidden) {
    $('ol > li').remove();
    loadTasks(displayHidden);
  }

  function hideForm() {
    $('.task-submission').hide();
    $('.list').show();
  }

  function displayForm() {
    $('.list').hide();
    $('.view-hidden-tasks').hide();
    $('.view-active-tasks').hide();
    $('.task-submission').show();
    appState = 'form';
  }

  function displayInactive() {
    hideForm();
    resetTasks(true);
    $('.view-hidden-tasks').hide();
    $('.view-active-tasks').show();
    appState = 'inactive';
  }

  function displayActive() {
    hideForm();
    resetTasks(false);
    $('.view-active-tasks').hide();
    $('.view-hidden-tasks').show();
    appState = 'active';
  }

  function refreshPage() {
    if (appState === 'form') {
      displayForm();
    } else if (appState === 'inactive') {
      displayInactive();
    } else if (appState === 'active') {
      displayActive();
    }
  }

  $('.view-hidden-tasks').click(function() {
    displayInactive();
  });

  $('.view-active-tasks, .header > span').click(function() {
    displayActive();
  });

  $('.header img').click(function() {
    displayForm();
  });

  refreshPage();

}
runChromeAppStorage(DaysSinceTaskBuilder);
