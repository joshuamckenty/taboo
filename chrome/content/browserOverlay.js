var taboo;

(function() { // keep our privates to ourselves

var $ = function $(id) { return document.getElementById(id); };
var log = function log(msg) {}; // maybe overridden in init
var debug = false;
var prefs;

function currentUrl() {
  return gBrowser.selectedBrowser.webNavigation.currentURI.spec.replace(/#.*/, '');
}

function Taboo() {
  const SVC = Cc['@oy/taboo;1'].getService(Ci.oyITaboo);

  const START_URL = 'chrome://taboo/content/start.html';

  function saved(state) {
    if ($('taboo-toolbarbutton-add')) {
      if (state) {
        $('taboo-toolbarbutton-add').setAttribute('saved', true);
      }
      else {
        $('taboo-toolbarbutton-add').removeAttribute('saved');
      }
    }
  }

  this.focusDetails = function() {
    document.getElementById('taboo-notes').focus();
  };

  function editDetails(url) {
    url = url || currentUrl();

    var tab = SVC.getForURL(url);

    var panel = document.getElementById('taboo-details');

    document.getElementById('taboo-image').setAttribute('src', tab.thumbURL);
    document.getElementById('taboo-title').setAttribute('value', (tab.title || ''));
    document.getElementById('taboo-notes').setAttribute('value', (tab.description || ''));

    // FIXME: where should this be positioned???
    panel.openPopup(document.getElementById('taboo-toolbarbutton-add'), 'after_start', -1, -1);
    panel.focus();
  };

  this.panelRemove = function() {
    SVC.delete(currentUrl());
    saved(false);
    document.getElementById('taboo-details').hidePopup();
  };

  this.panelUpdate = function() {
    var title = document.getElementById('taboo-title').value;
    var notes = document.getElementById('taboo-notes').value;
    SVC.update(currentUrl(), title, notes);
    document.getElementById('taboo-details').hidePopup();
  };

  this.gotoRecent = function(targetNode, event) {
    event.preventDefault();
    event.stopPropagation();
    SVC.open(targetNode.getAttribute('url'), 'tabforeground');
  };

  this.showRecentList = function(domId) {
    var popup = $(domId);
    while (popup.firstChild) {
      popup.removeChild(popup.firstChild);
    };

    function addRecent(tab) {
      var item = document.createElement('menuitem');
      item.setAttribute('class', 'menuitem-iconic');
      item.setAttribute('label', tab.title);
      item.setAttribute('oncommand', 'taboo.gotoRecent(this, event);');
      item.setAttribute('url', tab.url);
      item.setAttribute('image', tab.favicon);
      item.setAttribute('tooltiptext', tab.url);
      popup.appendChild(item);
    }

    var taboos = SVC.getRecent(15);

    if (taboos.hasMoreElements()) {
      while (taboos.hasMoreElements()) {
        var tab = taboos.getNext();
        tab.QueryInterface(Components.interfaces.oyITabooInfo);
        addRecent(tab);
      }
    }
    else {
      var item = document.createElement('menuitem');
      item.setAttribute('label', 'No Tabs Saved');
      item.setAttribute('disabled', true);
      popup.appendChild(item);
    }
  };

  this.toggleTaboo = function(event) {
    var url = currentUrl();

    if (SVC.isSaved(url)) {
      SVC.delete(url);
      saved(false);
    } else {
      SVC.save(null);
      saved(true);
    }
  };

  this.addTaboo = function(event) {
    SVC.save(null);
    saved(true);
    editDetails();
  };

  this.addTabooAndClose = function(event) {
    SVC.save(null);
    saved(true);

    var url = currentUrl();
    if (SVC.isSaved(url)) {
      BrowserCloseTabOrWindow();
    }
  };

  this.removeTaboo = function(event) {
    var url = currentUrl();
    SVC.delete(url);
    saved(false);
  };

  this.show = function(event) {
    var tab = getTabIdxForUrl(START_URL);
    if (tab !== null) {
      gBrowser.mTabContainer.selectedIndex = tab;
      return;
    }

    var url = gBrowser.selectedBrowser.webNavigation.currentURI.spec;
    if (event.shiftKey ||
        url == 'about:blank') {
      openUILinkIn(START_URL, 'current');
      return;
    }

    openUILinkIn(START_URL, 'tab');
  };

  this.showPanel = function(event) {
    // FIXME: on showing the popup we should move keyboard focus to this, and
    // using the cursors selects a taboo then return loads it.

    log('showPanel');

    var panel = document.getElementById('taboo-quickShow')
    var groupbox = document.getElementById('taboo-groupbox');
    var grid = document.getElementById('taboo-grid');
    var rows = document.getElementById('tabs-rows');

    log('showPanel: grid, rows', grid, rows);

    var numCols = 2;
    var numRows = 2;

    //  groupbox.style.maxHeight = (numRows * 150) + 'px';

    var columns = document.createElement('columns');

    for (var i = 0; i < numCols; i++) {
      var col = document.createElement('column');
      col.setAttribute('flex', '1');
      columns.appendChild(col);
    }

    log('showPanel: here 1');

    while (rows.firstChild) {
      rows.removeChild(rows.firstChild);
    }

    log('showPanel: here 2');

    function addRecent(tab, row) {
      var item = document.createElement('image');
      item.setAttribute('src', tab.thumbURL);
      item.setAttribute('title', tab.title);
      item.setAttribute('url', tab.url);
      item.setAttribute('tooltiptext', tab.url);

      row.appendChild(item);
      item.onclick = function(event) {
        taboo.gotoRecent(this, event);
        panel.hidePopup();
      }
    }

    log('showPanel: here 3');

    var taboos = SVC.get('', false);

    log('showPanel: here 4');

    if (taboos.hasMoreElements()) {
      var gridCount = 0;
      var row = null;
      while (gridCount < numRows * numCols) {
        if (taboos.hasMoreElements()) {
          if (gridCount % numRows == 0) {
            row = document.createElement('row');
            rows.appendChild(row);
          }
          var tab = taboos.getNext();
          tab.QueryInterface(Components.interfaces.oyITabooInfo);
          addRecent(tab, row);
          gridCount++;
        }
        else break;
      }
    }
    else {
      var row = document.createElement('row');
      var item = document.createElement('label');
      item.setAttribute('value', 'No Tabs Saved');
      row.appendChild(item);
      rows.appendChild(row);
    }

    var button = document.getElementById('taboo-moreButton');

    button.onclick = function() {
      if (taboos.hasMoreElements()) {
        var row = document.createElement('row');
        for (var i = 0; i < numCols; i++) {
          if (taboos.hasMoreElements()) {
            var tab = taboos.getNext();
            tab.QueryInterface(Components.interfaces.oyITabooInfo);
            addRecent(tab, row);
          }
          else break;
        }
        rows.appendChild(row);
      }
    }
    
    panel.openPopup(document.getElementById('taboo-toolbarbarbutton-add'), 'after_start', 100, 0, false, false);
  }
  
  this.quickShow = function(event) {
    // FIXME: on showing the popup we should move keyboard focus to this, and
    // using the cursors selects a taboo then return loads it.

    // FIXME: some of this code should be combined with showRecentList since
    // they are almost identical.. this is a hack-and-paste just to
    // learn how panel worsk

    var panel = document.getElementById('taboo-panel');
    var box = document.getElementById('tabs-box');

    while (box.firstChild) {
      box.removeChild(box.firstChild);
    };

    function addRecent(tab) {
      var item = document.createElement('image');
      item.setAttribute('src', tab.thumbURL);
      item.setAttribute('title', tab.title);
      item.setAttribute('url', tab.url);
      item.setAttribute('tooltiptext', tab.url);
      box.appendChild(item);
      item.onclick = function(event) {
        taboo.gotoRecent(this, event);
        panel.hidePopup();
      }
    }

    var taboos = SVC.getRecent(5);

    if (taboos.hasMoreElements()) {
      while (taboos.hasMoreElements()) {
        var tab = taboos.getNext();
        tab.QueryInterface(Components.interfaces.oyITabooInfo);
        addRecent(tab);
      }
    }
    else {
      var item = document.createElement('label');
      item.setAttribute('value', 'No Tabs Saved');
      box.appendChild(item);
    }

    // FIXME - the positioning of the panel is "random" - eg I did something that seems
    // to work on my browser, but no thought behind any of the parameters
    panel.openPopup(document.getElementById('taboo-toolbarbarbutton-add'), 'after_start', 100, 0, false, false);
  }

  this.updateButton = function(url) {
    if (url && SVC.isSaved(url)) {
      saved(true);
    }
    else {
      saved(false);
    }
  };
}

function init() {
  if (debug) {
    if ("undefined" != typeof console) {
      log = console.log;
    } else {
      var t = Cc['@mozilla.org/consoleservice;1'].
        getService(Ci.nsIConsoleService);
      log = function log(x) { t.logStringMessage(x); };
    }
  }

  prefs = Cc['@mozilla.org/preferences-service;1'].
    getService(Ci.nsIPrefService).getBranch('extensions.taboo.');

  taboo = new Taboo();

  installInToolbar();
  updateKeybindings();

  gBrowser.addProgressListener(progressListener,
                               Ci.nsIWebProgress.NOTIFY_LOCATION);
}

function uninit() {
  gBrowser.removeProgressListener(progressListener);
}

window.addEventListener("load", init, false);
window.addEventListener("unload", uninit, false);

function nop() {}

var progressListener = {
  last: 'none',
  onLocationChange: function(aWebProgress, aRequest, aLocation) {
    var url;
    try {
      url = aLocation.spec.replace(/#.*/, '');
    } catch (e) {}
    if (url != this.last) {
      taboo.updateButton(url);
      this.last = url;
    }
  },
  onStateChange: nop,
  onStatusChange: nop,
  onProgressChange: nop,
  onSecurityChange: nop,
};

// Check whether we installed the toolbar button already and install if not
function installInToolbar() {
  var addid = "taboo-toolbarbutton-add";
  var viewid = "taboo-toolbarbutton-view";
  if (prefs.getPrefType("setup") || $(addid))
    return; // exit early -- already installed

  var before = $("urlbar-container");
  var toolbar = $("nav-bar");
  if (toolbar && "function" == typeof toolbar.insertItem) {
    if (before && before.parentNode != toolbar)
      before = null;

    toolbar.insertItem(addid, before, null, false);
    toolbar.insertItem(viewid, before, null, false);

    toolbar.setAttribute("currentset", toolbar.currentSet);
    document.persist(toolbar.id, "currentset");
  }

  prefs.setBoolPref("setup", true); // Done! Never do this again.
}

function setKeyBinding(keyId, key, modifiers) {
  try {
    prefs.setCharPref(key_id + '.key', key);
    prefs.setCharPref(key_id + '.modifiers', modifiers);
  } catch (e) {}
}

function getKeyBinding(keyId) {
  var binding = {};
  try {
    binding.key = prefs.getPrefType(key_id + '.key');
    binding.mods = prefs.setCharPref(key_id + '.modifiers');
  } catch (e) {
    var command = document.getElementById(key_id);
    binding.key = command.key;
    binding.mods = command.modifiers;
  }
  return binding;
}

function updateKeybindings() {

  function update(key_id, attribute) {
    try {
      if (prefs.getPrefType(key_id + '.' + attribute)) {
        var val = prefs.getCharPref(key_id + '.' + attribute);
        if (val && val.length > 0) {
          var binding = document.getElementById(key_id);
          binding.setAttribute(attribute, val);
        }
      }
    } catch (e) {}
  }

  ["key_showTaboos", "key_addTaboo", "key_addTabooAndClose", "key_removeTaboo"].forEach(function(key_id) {
    update(key_id, 'key');
    update(key_id, 'modifiers');
  });
}

function getTabIdxForUrl(aURL) {
  var num = gBrowser.browsers.length;
  for (var i = 0; i < num; i++) {
    var b = gBrowser.getBrowserAtIndex(i);
    try {
      if (b.currentURI.spec == aURL) {
        return i;
      }
    } catch(e) {
      // can't get the URL?
    }
  }
  return null;
}

})();
