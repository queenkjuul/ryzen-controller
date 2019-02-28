/**
 * Will create a nodes from an html string.
 * @param {string} str An html string
 */
function parseHTML(str) {
  var tmp = document.implementation.createHTMLDocument();
  tmp.body.innerHTML = str;
  return tmp.body.children;
};

/**
 * Return the current working directory.
 */
function getCurrentWorkingDirectory() {
  return require('electron').remote.app.getAppPath();
}

/**
 * Conversion from int to hex.
 * @param {int} number A number.
 */
function decimalToHexString(number) {
  if (number < 0)
  {
    number = 0xFFFFFFFF + number + 1;
  }
  
  return number.toString(16).toUpperCase();
}

/**
 * Will execute the given callback once document is ready.
 * @param {function} fn A callback to be executed.
 */
function ready(fn) {
  if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading"){
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

/**
 * Will make sure inputs are repeated when needed.
 * 
 * Use the "repeat" html attribute to define where the current value must be repeated.
 */
function registerRepeaterForAllInput() {
  var ranges = document.querySelectorAll('[repeat]');
  for (const range in ranges) {
    if (ranges.hasOwnProperty(range)) {
      const element = ranges[range];
      element.addEventListener('change', function(event) {
        var repeater = document.getElementById(event.target.attributes.repeat.value);
        repeater.value = event.target.value;
      });
    }
  }
}

/**
 * Check that the app is running with admin right.
 * 
 * Will display a warning if not.
 */
function checkForAdminRights() {
  var exec = require('child_process').exec; 
  exec('NET SESSION', function(err,so,se) {
    if (se.length !== 0) {
      notification('warning',
       `Warning: you should launch this app as administrator,
        ryzenadj.exe doesn't seems to work correctly without administrator rights.
      `);
    }
  });
}

/**
 * Will display a notification in ".notification-zone".
 * @param {string} type "primary", "warning", "danger" or "success".
 * @param {string} message The message to be displayed, new line will be replaced by <br/>.
 */
function notification(type, message) {
  UIkit.notification({
    message: (''+message).replace(/(?:\r\n|\r|\n)/g, '<br/>'),
    status: type,
    pos: 'top-right',
    timeout: 5000
  });
}

/**
 * Will return the ryzenadj.exe path registered, or default one if not provided.
 */
function getRyzenAdjExecutablePath() {
  const settings = require('electron-settings');
  var ryzen_adj_path = settings.get('settings.ryzen_adj_path');
  if (!ryzen_adj_path) {
    ryzen_adj_path = getCurrentWorkingDirectory() + "\\bin\\ryzenadj.exe";
  }
  return ryzen_adj_path;
}

/**
 * Will fill settings page on render with saved data.
 */
function preFillSettings() {
  var ryzen_adj_path = document.getElementById('ryzen_adj_path');
  var fs = require('fs'); 
  ryzen_adj_path.value = getRyzenAdjExecutablePath();
  if (!fs.existsSync(ryzen_adj_path.value)) { 
    notification('danger', "Path to ryzenadj.exe is wrong, please fix it in settings tab.");
  }
}

function askingForRyzenAdjExecutablePath() {
  var remote = require('electron').remote;
  var dialog = remote.require('electron').dialog;
  
  var path = dialog.showOpenDialog({
      properties: ['openFile']
  }, function (filePaths) {
    if (typeof filePaths[0] !== 'undefined') {
      const settings = require('electron-settings');
      settings.set("settings", {
        ryzen_adj_path: filePaths[0]
      });
      notification('primary', 'Path to ryzenAdj.exe has been saved.');
    } else {
      notification('warning', 'No path given, nothing changed.');
    }
    preFillSettings();
  });
}