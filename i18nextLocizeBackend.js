(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.i18nextLocizeBackend = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){(function (){
var fetchApi
if (typeof fetch === 'function') {
  if (typeof global !== 'undefined' && global.fetch) {
    fetchApi = global.fetch
  } else if (typeof window !== 'undefined' && window.fetch) {
    fetchApi = window.fetch
  }
}

if (typeof require !== 'undefined' && (typeof window === 'undefined' || typeof window.document === 'undefined')) {
  var f = fetchApi || require('cross-fetch')
  if (f.default) f = f.default
  exports.default = f
  module.exports = exports.default
}

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"cross-fetch":5}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _utils = require("./utils.js");

var _request = _interopRequireDefault(require("./request.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var getDefaults = function getDefaults() {
  return {
    loadPath: 'https://api.locize.app/{{projectId}}/{{version}}/{{lng}}/{{ns}}',
    privatePath: 'https://api.locize.app/private/{{projectId}}/{{version}}/{{lng}}/{{ns}}',
    getLanguagesPath: 'https://api.locize.app/languages/{{projectId}}',
    addPath: 'https://api.locize.app/missing/{{projectId}}/{{version}}/{{lng}}/{{ns}}',
    updatePath: 'https://api.locize.app/update/{{projectId}}/{{version}}/{{lng}}/{{ns}}',
    referenceLng: 'en',
    crossDomain: true,
    setContentTypeJSON: false,
    version: 'latest',
    private: false,
    translatedPercentageThreshold: 0.9,
    whitelistThreshold: 0.9,
    failLoadingOnEmptyJSON: false,
    allowedAddOrUpdateHosts: ['localhost'],
    onSaved: false,
    reloadInterval: typeof window !== 'undefined' ? false : 60 * 60 * 1000,
    checkForProjectTimeout: 3 * 1000,
    storageExpiration: 60 * 60 * 1000
  };
};

var hasLocalStorageSupport;

try {
  hasLocalStorageSupport = typeof window !== 'undefined' && window.localStorage !== null;
  var testKey = 'notExistingLocizeProject';
  window.localStorage.setItem(testKey, 'foo');
  window.localStorage.removeItem(testKey);
} catch (e) {
  hasLocalStorageSupport = false;
}

function getStorage(storageExpiration) {
  var setProjectNotExisting = function setProjectNotExisting() {};

  var isProjectNotExisting = function isProjectNotExisting() {};

  if (hasLocalStorageSupport) {
    setProjectNotExisting = function setProjectNotExisting(projectId) {
      window.localStorage.setItem("notExistingLocizeProject_".concat(projectId), Date.now());
    };

    isProjectNotExisting = function isProjectNotExisting(projectId) {
      var ret = window.localStorage.getItem("notExistingLocizeProject_".concat(projectId));
      if (!ret) return false;

      if (Date.now() - ret > storageExpiration) {
        window.localStorage.removeItem("notExistingLocizeProject_".concat(projectId));
        return false;
      }

      return true;
    };
  } else if (typeof document !== 'undefined') {
    setProjectNotExisting = function setProjectNotExisting(projectId) {
      var date = new Date();
      date.setTime(date.getTime() + storageExpiration);
      var expires = "; expires=".concat(date.toGMTString());
      var name = "notExistingLocizeProject_".concat(projectId);
      document.cookie = "".concat(name, "=").concat(Date.now()).concat(expires, ";path=/");
    };

    isProjectNotExisting = function isProjectNotExisting(projectId) {
      var name = "notExistingLocizeProject_".concat(projectId);
      var nameEQ = "".concat(name, "=");
      var ca = document.cookie.split(';');

      for (var i = 0; i < ca.length; i++) {
        var c = ca[i];

        while (c.charAt(0) === ' ') {
          c = c.substring(1, c.length);
        }

        if (c.indexOf(nameEQ) === 0) return true;
      }

      return false;
    };
  }

  return {
    setProjectNotExisting: setProjectNotExisting,
    isProjectNotExisting: isProjectNotExisting
  };
}

var I18NextLocizeBackend = function () {
  function I18NextLocizeBackend(services) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var allOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var callback = arguments.length > 3 ? arguments[3] : undefined;

    _classCallCheck(this, I18NextLocizeBackend);

    this.services = services;
    this.options = options;
    this.allOptions = allOptions;
    this.type = 'backend';

    if (services && services.projectId) {
      this.init(null, services, allOptions, options);
    } else {
      this.init(services, options, allOptions, callback);
    }
  }

  _createClass(I18NextLocizeBackend, [{
    key: "init",
    value: function init(services) {
      var _this = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var allOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      var callback = arguments.length > 3 ? arguments[3] : undefined;
      this.services = services;

      if (options.whitelistThreshold !== undefined && options.translatedPercentageThreshold === undefined) {
        if (services && services.logger) services.logger.deprecate('whitelistThreshold', 'option "whitelistThreshold" will be renamed to "translatedPercentageThreshold" in the next major - please make sure to rename this option asap.');
        options.translatedPercentageThreshold = options.whitelistThreshold;
      }

      this.options = (0, _utils.defaults)(options, this.options || {}, getDefaults());
      this.allOptions = allOptions;
      this.somethingLoaded = false;
      this.isProjectNotExisting = false;
      this.storage = getStorage(this.options.storageExpiration);

      if (this.options.pull) {
        console.warn('The pull API was removed use "private: true" option instead: https://docs.locize.com/integration/api#fetch-private-namespace-resources');
      }

      var hostname = typeof window !== 'undefined' && window.location && window.location.hostname;

      if (hostname) {
        this.isAddOrUpdateAllowed = typeof this.options.allowedAddOrUpdateHosts === 'function' ? this.options.allowedAddOrUpdateHosts(hostname) : this.options.allowedAddOrUpdateHosts.indexOf(hostname) > -1;

        if (services && services.logger && (allOptions.saveMissing || allOptions.updateMissing)) {
          if (!this.isAddOrUpdateAllowed) {
            services.logger.warn(typeof this.options.allowedAddOrUpdateHosts === 'function' ? "locize-backend: will not save or update missings because allowedAddOrUpdateHosts returned false for the host \"".concat(hostname, "\".") : "locize-backend: will not save or update missings because the host \"".concat(hostname, "\" was not in the list of allowedAddOrUpdateHosts: ").concat(this.options.allowedAddOrUpdateHosts.join(', '), " (matches need to be exact)."));
          } else if (hostname !== 'localhost') {
            services.logger.warn("locize-backend: you are using the save or update missings feature from this host \"".concat(hostname, "\".\nMake sure you will not use it in production!\nhttps://docs.locize.com/guides-tips-and-tricks/going-production"));
          }
        }
      } else {
        this.isAddOrUpdateAllowed = true;
      }

      if (typeof callback === 'function') {
        this.getOptions(function (err, opts) {
          if (err) return callback(err);
          _this.options.referenceLng = options.referenceLng || opts.referenceLng || _this.options.referenceLng;
          callback(null, opts);
        });
      }

      this.queuedWrites = {
        pending: {}
      };
      this.debouncedProcess = (0, _utils.debounce)(this.process, 10000);
      if (this.interval) clearInterval(this.interval);

      if (this.options.reloadInterval && this.options.projectId) {
        this.interval = setInterval(function () {
          return _this.reload();
        }, this.options.reloadInterval);
      }
    }
  }, {
    key: "reload",
    value: function reload() {
      var _this2 = this;

      var _this$services = this.services,
          backendConnector = _this$services.backendConnector,
          languageUtils = _this$services.languageUtils,
          logger = _this$services.logger;
      if (!backendConnector) return;
      var currentLanguage = backendConnector.language;
      if (currentLanguage && currentLanguage.toLowerCase() === 'cimode') return;
      var toLoad = [];

      var append = function append(lng) {
        var lngs = languageUtils.toResolveHierarchy(lng);
        lngs.forEach(function (l) {
          if (toLoad.indexOf(l) < 0) toLoad.push(l);
        });
      };

      append(currentLanguage);
      if (this.allOptions.preload) this.allOptions.preload.forEach(function (l) {
        return append(l);
      });
      toLoad.forEach(function (lng) {
        _this2.allOptions.ns.forEach(function (ns) {
          backendConnector.read(lng, ns, 'read', null, null, function (err, data) {
            if (err) logger.warn("loading namespace ".concat(ns, " for language ").concat(lng, " failed"), err);
            if (!err && data) logger.log("loaded namespace ".concat(ns, " for language ").concat(lng), data);
            backendConnector.loaded("".concat(lng, "|").concat(ns), err, data);
          });
        });
      });
    }
  }, {
    key: "getLanguages",
    value: function getLanguages(callback) {
      var _this3 = this;

      var isMissing = (0, _utils.isMissingOption)(this.options, ['projectId']);
      if (isMissing) return callback(new Error(isMissing));
      var url = (0, _utils.interpolate)(this.options.getLanguagesPath, {
        projectId: this.options.projectId
      });

      if (!this.isProjectNotExisting && this.storage.isProjectNotExisting(this.options.projectId)) {
        this.isProjectNotExisting = true;
      }

      if (this.isProjectNotExisting) return callback(new Error("locize project ".concat(this.options.projectId, " does not exist!")));
      this.loadUrl({}, url, function (err, ret, info) {
        if (!_this3.somethingLoaded && info && info.resourceNotExisting) {
          _this3.isProjectNotExisting = true;

          _this3.storage.setProjectNotExisting(_this3.options.projectId);

          return callback(new Error("locize project ".concat(_this3.options.projectId, " does not exist!")));
        }

        _this3.somethingLoaded = true;
        callback(err, ret);
      });
    }
  }, {
    key: "getOptions",
    value: function getOptions(callback) {
      var _this4 = this;

      this.getLanguages(function (err, data) {
        if (err) return callback(err);
        var keys = Object.keys(data);

        if (!keys.length) {
          return callback(new Error('was unable to load languages via API'));
        }

        var referenceLng = keys.reduce(function (mem, k) {
          var item = data[k];
          if (item.isReferenceLanguage) mem = k;
          return mem;
        }, '');
        var lngs = keys.reduce(function (mem, k) {
          var item = data[k];

          if (item.translated[_this4.options.version] && item.translated[_this4.options.version] >= _this4.options.translatedPercentageThreshold) {
            mem.push(k);
          }

          return mem;
        }, []);
        var hasRegion = keys.reduce(function (mem, k) {
          if (k.indexOf('-') > -1) return true;
          return mem;
        }, false);
        callback(null, {
          fallbackLng: referenceLng,
          referenceLng: referenceLng,
          supportedLngs: lngs,
          whitelist: lngs,
          load: hasRegion ? 'all' : 'languageOnly'
        });
      });
    }
  }, {
    key: "checkIfProjectExists",
    value: function checkIfProjectExists(callback) {
      var _this5 = this;

      var logger = this.services.logger;

      if (this.somethingLoaded) {
        if (callback) callback(null);
        return;
      }

      if (this.alreadyRequestedCheckIfProjectExists) {
        setTimeout(function () {
          return _this5.checkIfProjectExists(callback);
        }, this.options.checkForProjectTimeout);
        return;
      }

      this.alreadyRequestedCheckIfProjectExists = true;
      this.getLanguages(function (err) {
        if (err && err.message && err.message.indexOf('does not exist') > 0) {
          if (logger) logger.error(err.message);
        }

        if (callback) callback(err);
      });
    }
  }, {
    key: "read",
    value: function read(language, namespace, callback) {
      var _this6 = this;

      var _ref = this.services || {
        logger: console
      },
          logger = _ref.logger;

      var url;
      var options = {};

      if (this.options.private) {
        var isMissing = (0, _utils.isMissingOption)(this.options, ['projectId', 'version', 'apiKey']);
        if (isMissing) return callback(new Error(isMissing), false);
        url = (0, _utils.interpolate)(this.options.privatePath, {
          lng: language,
          ns: namespace,
          projectId: this.options.projectId,
          version: this.options.version
        });
        options = {
          authorize: true
        };
      } else {
        var _isMissing = (0, _utils.isMissingOption)(this.options, ['projectId', 'version']);

        if (_isMissing) return callback(new Error(_isMissing), false);
        url = (0, _utils.interpolate)(this.options.loadPath, {
          lng: language,
          ns: namespace,
          projectId: this.options.projectId,
          version: this.options.version
        });
      }

      if (!this.isProjectNotExisting && this.storage.isProjectNotExisting(this.options.projectId)) {
        this.isProjectNotExisting = true;
      }

      if (this.isProjectNotExisting) {
        var err = new Error("locize project ".concat(this.options.projectId, " does not exist!"));
        if (logger) logger.error(err.message);
        if (callback) callback(err);
        return;
      }

      this.loadUrl(options, url, function (err, ret, info) {
        if (!_this6.somethingLoaded) {
          if (info && info.resourceNotExisting) {
            setTimeout(function () {
              return _this6.checkIfProjectExists();
            }, _this6.options.checkForProjectTimeout);
          } else {
            _this6.somethingLoaded = true;
          }
        }

        callback(err, ret);
      });
    }
  }, {
    key: "loadUrl",
    value: function loadUrl(options, url, payload, callback) {
      var _this7 = this;

      options = (0, _utils.defaults)(options, this.options);

      if (typeof payload === 'function') {
        callback = payload;
        payload = undefined;
      }

      callback = callback || function () {};

      (0, _request.default)(options, url, payload, function (err, res) {
        var resourceNotExisting = res && res.resourceNotExisting;

        if (res && (res.status === 408 || res.status === 400)) {
          return callback('failed loading ' + url, true, {
            resourceNotExisting: resourceNotExisting
          });
        }

        if (res && (res.status >= 500 && res.status < 600 || !res.status)) {
          return callback('failed loading ' + url, true, {
            resourceNotExisting: resourceNotExisting
          });
        }

        if (res && res.status >= 400 && res.status < 500) {
          return callback('failed loading ' + url, false, {
            resourceNotExisting: resourceNotExisting
          });
        }

        if (!res && err && err.message && err.message.indexOf('Failed to fetch') > -1) {
          return callback('failed loading ' + url, true, {
            resourceNotExisting: resourceNotExisting
          });
        }

        if (err) return callback(err, false);
        var ret, parseErr;

        try {
          ret = JSON.parse(res.data);
        } catch (e) {
          parseErr = 'failed parsing ' + url + ' to json';
        }

        if (parseErr) return callback(parseErr, false);

        if (_this7.options.failLoadingOnEmptyJSON && !Object.keys(ret).length) {
          return callback('loaded result empty for ' + url, false, {
            resourceNotExisting: resourceNotExisting
          });
        }

        callback(null, ret, {
          resourceNotExisting: resourceNotExisting
        });
      });
    }
  }, {
    key: "create",
    value: function create(languages, namespace, key, fallbackValue, callback, options) {
      var _this8 = this;

      if (!callback) callback = function callback() {};
      this.checkIfProjectExists(function (err) {
        if (err) return callback(err);
        var isMissing = (0, _utils.isMissingOption)(_this8.options, ['projectId', 'version', 'apiKey', 'referenceLng']);
        if (isMissing) return callback(new Error(isMissing));

        if (!_this8.isAddOrUpdateAllowed) {
          return callback('host is not allowed to create key.');
        }

        if (typeof languages === 'string') languages = [languages];

        if (languages.filter(function (l) {
          return l === _this8.options.referenceLng;
        }).length < 1) {
          _this8.services && _this8.services.logger && _this8.services.logger.warn("locize-backend: will not save missings because the reference language \"".concat(_this8.options.referenceLng, "\" was not in the list of to save languages: ").concat(languages.join(', '), " (open your site in the reference language to save missings)."));
        }

        languages.forEach(function (lng) {
          if (lng === _this8.options.referenceLng) {
            _this8.queue.call(_this8, _this8.options.referenceLng, namespace, key, fallbackValue, callback, options);
          }
        });
      });
    }
  }, {
    key: "update",
    value: function update(languages, namespace, key, fallbackValue, callback, options) {
      var _this9 = this;

      if (!callback) callback = function callback() {};
      this.checkIfProjectExists(function (err) {
        if (err) return callback(err);
        var isMissing = (0, _utils.isMissingOption)(_this9.options, ['projectId', 'version', 'apiKey', 'referenceLng']);
        if (isMissing) return callback(new Error(isMissing));

        if (!_this9.isAddOrUpdateAllowed) {
          return callback('host is not allowed to update key.');
        }

        if (!options) options = {};
        if (typeof languages === 'string') languages = [languages];
        options.isUpdate = true;
        languages.forEach(function (lng) {
          if (lng === _this9.options.referenceLng) {
            _this9.queue.call(_this9, _this9.options.referenceLng, namespace, key, fallbackValue, callback, options);
          }
        });
      });
    }
  }, {
    key: "writePage",
    value: function writePage(lng, namespace, missings, callback) {
      var missingUrl = (0, _utils.interpolate)(this.options.addPath, {
        lng: lng,
        ns: namespace,
        projectId: this.options.projectId,
        version: this.options.version
      });
      var updatesUrl = (0, _utils.interpolate)(this.options.updatePath, {
        lng: lng,
        ns: namespace,
        projectId: this.options.projectId,
        version: this.options.version
      });
      var hasMissing = false;
      var hasUpdates = false;
      var payloadMissing = {};
      var payloadUpdate = {};
      missings.forEach(function (item) {
        var value = item.options && item.options.tDescription ? {
          value: item.fallbackValue || '',
          context: {
            text: item.options.tDescription
          }
        } : item.fallbackValue || '';

        if (item.options && item.options.isUpdate) {
          if (!hasUpdates) hasUpdates = true;
          payloadUpdate[item.key] = value;
        } else {
          if (!hasMissing) hasMissing = true;
          payloadMissing[item.key] = value;
        }
      });
      var todo = 0;
      if (hasMissing) todo++;
      if (hasUpdates) todo++;

      var doneOne = function doneOne(err) {
        todo--;
        if (!todo) callback(err);
      };

      if (!todo) doneOne();

      if (hasMissing) {
        (0, _request.default)((0, _utils.defaults)({
          authorize: true
        }, this.options), missingUrl, payloadMissing, doneOne);
      }

      if (hasUpdates) {
        (0, _request.default)((0, _utils.defaults)({
          authorize: true
        }, this.options), updatesUrl, payloadUpdate, doneOne);
      }
    }
  }, {
    key: "write",
    value: function write(lng, namespace) {
      var _this10 = this;

      var lock = (0, _utils.getPath)(this.queuedWrites, ['locks', lng, namespace]);
      if (lock) return;
      var missings = (0, _utils.getPath)(this.queuedWrites, [lng, namespace]);
      (0, _utils.setPath)(this.queuedWrites, [lng, namespace], []);
      var pageSize = 1000;

      if (missings.length) {
        (function () {
          (0, _utils.setPath)(_this10.queuedWrites, ['locks', lng, namespace], true);

          var namespaceSaved = function namespaceSaved() {
            (0, _utils.setPath)(_this10.queuedWrites, ['locks', lng, namespace], false);
            missings.forEach(function (missing) {
              if (missing.callback) missing.callback();
            });
            if (_this10.options.onSaved) _this10.options.onSaved(lng, namespace);

            _this10.debouncedProcess(lng, namespace);
          };

          var amountOfPages = missings.length / pageSize;
          var pagesDone = 0;
          var page = missings.splice(0, pageSize);

          _this10.writePage(lng, namespace, page, function () {
            pagesDone++;
            if (pagesDone >= amountOfPages) namespaceSaved();
          });

          while (page.length === pageSize) {
            page = missings.splice(0, pageSize);

            if (page.length) {
              _this10.writePage(lng, namespace, page, function () {
                pagesDone++;
                if (pagesDone >= amountOfPages) namespaceSaved();
              });
            }
          }
        })();
      }
    }
  }, {
    key: "process",
    value: function process() {
      var _this11 = this;

      Object.keys(this.queuedWrites).forEach(function (lng) {
        if (lng === 'locks') return;
        Object.keys(_this11.queuedWrites[lng]).forEach(function (ns) {
          var todo = _this11.queuedWrites[lng][ns];

          if (todo.length) {
            _this11.write(lng, ns);
          }
        });
      });
    }
  }, {
    key: "queue",
    value: function queue(lng, namespace, key, fallbackValue, callback, options) {
      (0, _utils.pushPath)(this.queuedWrites, [lng, namespace], {
        key: key,
        fallbackValue: fallbackValue || '',
        callback: callback,
        options: options
      });
      this.debouncedProcess();
    }
  }]);

  return I18NextLocizeBackend;
}();

I18NextLocizeBackend.type = 'backend';
var _default = I18NextLocizeBackend;
exports.default = _default;
module.exports = exports.default;
},{"./request.js":3,"./utils.js":4}],3:[function(require,module,exports){
(function (global){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var fetchNode = _interopRequireWildcard(require("./getFetch.js"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var fetchApi;

if (typeof fetch === 'function') {
  if (typeof global !== 'undefined' && global.fetch) {
    fetchApi = global.fetch;
  } else if (typeof window !== 'undefined' && window.fetch) {
    fetchApi = window.fetch;
  }
}

var XmlHttpRequestApi;

if (typeof XMLHttpRequest === 'function' || (typeof XMLHttpRequest === "undefined" ? "undefined" : _typeof(XMLHttpRequest)) === 'object') {
  if (typeof global !== 'undefined' && global.XMLHttpRequest) {
    XmlHttpRequestApi = global.XMLHttpRequest;
  } else if (typeof window !== 'undefined' && window.XMLHttpRequest) {
    XmlHttpRequestApi = window.XMLHttpRequest;
  }
}

var ActiveXObjectApi;

if (typeof ActiveXObject === 'function') {
  if (typeof global !== 'undefined' && global.ActiveXObject) {
    ActiveXObjectApi = global.ActiveXObject;
  } else if (typeof window !== 'undefined' && window.ActiveXObject) {
    ActiveXObjectApi = window.ActiveXObject;
  }
}

if (!fetchApi && fetchNode && !XmlHttpRequestApi && !ActiveXObjectApi) fetchApi = fetchNode.default || fetchNode;
if (typeof fetchApi !== 'function') fetchApi = undefined;

var requestWithFetch = function requestWithFetch(options, url, payload, callback) {
  fetchApi(url, {
    method: payload ? 'POST' : 'GET',
    body: payload ? JSON.stringify(payload) : undefined,
    headers: {
      Authorization: options.authorize && options.apiKey ? options.apiKey : undefined,
      'Content-Type': 'application/json'
    }
  }).then(function (response) {
    var resourceNotExisting = response.headers && response.headers.get('x-cache') === 'Error from cloudfront';
    if (!response.ok) return callback(response.statusText || 'Error', {
      status: response.status,
      resourceNotExisting: resourceNotExisting
    });
    response.text().then(function (data) {
      callback(null, {
        status: response.status,
        data: data,
        resourceNotExisting: resourceNotExisting
      });
    }).catch(callback);
  }).catch(callback);
};

var requestWithXmlHttpRequest = function requestWithXmlHttpRequest(options, url, payload, callback) {
  try {
    var x;

    if (XmlHttpRequestApi) {
      x = new XmlHttpRequestApi();
    } else {
      x = new ActiveXObjectApi('MSXML2.XMLHTTP.3.0');
    }

    x.open(payload ? 'POST' : 'GET', url, 1);

    if (!options.crossDomain) {
      x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    }

    if (options.authorize && options.apiKey) {
      x.setRequestHeader('Authorization', options.apiKey);
    }

    if (payload || options.setContentTypeJSON) {
      x.setRequestHeader('Content-Type', 'application/json');
    }

    x.onreadystatechange = function () {
      var resourceNotExisting = x.getResponseHeader('x-cache') === 'Error from cloudfront';
      x.readyState > 3 && callback(x.status >= 400 ? x.statusText : null, {
        status: x.status,
        data: x.responseText,
        resourceNotExisting: resourceNotExisting
      });
    };

    x.send(JSON.stringify(payload));
  } catch (e) {
    console && console.log(e);
  }
};

var request = function request(options, url, payload, callback) {
  if (typeof payload === 'function') {
    callback = payload;
    payload = undefined;
  }

  callback = callback || function () {};

  if (fetchApi) {
    return requestWithFetch(options, url, payload, callback);
  }

  if (typeof XMLHttpRequest === 'function' || (typeof XMLHttpRequest === "undefined" ? "undefined" : _typeof(XMLHttpRequest)) === 'object' || typeof ActiveXObject === 'function') {
    return requestWithXmlHttpRequest(options, url, payload, callback);
  }
};

var _default = request;
exports.default = _default;
module.exports = exports.default;
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./getFetch.js":1}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaults = defaults;
exports.debounce = debounce;
exports.setPath = setPath;
exports.pushPath = pushPath;
exports.getPath = getPath;
exports.interpolate = interpolate;
exports.isMissingOption = isMissingOption;
exports.optionExist = optionExist;
var arr = [];
var each = arr.forEach;
var slice = arr.slice;

function defaults(obj) {
  each.call(slice.call(arguments, 1), function (source) {
    if (source) {
      for (var prop in source) {
        if (obj[prop] === undefined) obj[prop] = source[prop];
      }
    }
  });
  return obj;
}

function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this;
    var args = arguments;

    var later = function later() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

;

function getLastOfPath(object, path, Empty) {
  function cleanKey(key) {
    return key && key.indexOf('###') > -1 ? key.replace(/###/g, '.') : key;
  }

  var stack = typeof path !== 'string' ? [].concat(path) : path.split('.');

  while (stack.length > 1) {
    if (!object) return {};
    var key = cleanKey(stack.shift());
    if (!object[key] && Empty) object[key] = new Empty();
    object = object[key];
  }

  if (!object) return {};
  return {
    obj: object,
    k: cleanKey(stack.shift())
  };
}

function setPath(object, path, newValue) {
  var _getLastOfPath = getLastOfPath(object, path, Object),
      obj = _getLastOfPath.obj,
      k = _getLastOfPath.k;

  obj[k] = newValue;
}

function pushPath(object, path, newValue, concat) {
  var _getLastOfPath2 = getLastOfPath(object, path, Object),
      obj = _getLastOfPath2.obj,
      k = _getLastOfPath2.k;

  obj[k] = obj[k] || [];
  if (concat) obj[k] = obj[k].concat(newValue);
  if (!concat) obj[k].push(newValue);
}

function getPath(object, path) {
  var _getLastOfPath3 = getLastOfPath(object, path),
      obj = _getLastOfPath3.obj,
      k = _getLastOfPath3.k;

  if (!obj) return undefined;
  return obj[k];
}

var regexp = new RegExp('{{(.+?)}}', 'g');

function makeString(object) {
  if (object == null) return '';
  return '' + object;
}

function interpolate(str, data, lng) {
  var match, value;

  function regexSafe(val) {
    return val.replace(/\$/g, '$$$$');
  }

  while (match = regexp.exec(str)) {
    value = match[1].trim();
    if (typeof value !== 'string') value = makeString(value);
    if (!value) value = '';
    value = regexSafe(value);
    str = str.replace(match[0], data[value] || value);
    regexp.lastIndex = 0;
  }

  return str;
}

function isMissingOption(obj, props) {
  return props.reduce(function (mem, p) {
    if (mem) return mem;

    if (!obj || !obj[p] || typeof obj[p] !== 'string' || !obj[p].toLowerCase() === p.toLowerCase()) {
      var err = "i18next-locize-backend :: got \"".concat(obj[p], "\" in options for ").concat(p, " which is invalid.");
      console.warn(err);
      return err;
    }

    return false;
  }, false);
}

function optionExist(obj, props) {
  return !isMissingOption(obj, props);
}
},{}],5:[function(require,module,exports){
var global = typeof self !== 'undefined' ? self : this;
var __self__ = (function () {
function F() {
this.fetch = false;
this.DOMException = global.DOMException
}
F.prototype = global;
return new F();
})();
(function(self) {

var irrelevant = (function (exports) {

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob:
      'FileReader' in self &&
      'Blob' in self &&
      (function() {
        try {
          new Blob();
          return true
        } catch (e) {
          return false
        }
      })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  };

  function isDataView(obj) {
    return obj && DataView.prototype.isPrototypeOf(obj)
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ];

    var isArrayBufferView =
      ArrayBuffer.isView ||
      function(obj) {
        return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
      };
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name);
    }
    if (/[^a-z0-9\-#$%&'*+.^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value);
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift();
        return {done: value === undefined, value: value}
      }
    };

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      };
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {};

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value);
      }, this);
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1]);
      }, this);
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name]);
      }, this);
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name);
    value = normalizeValue(value);
    var oldValue = this.map[name];
    this.map[name] = oldValue ? oldValue + ', ' + value : value;
  };

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)];
  };

  Headers.prototype.get = function(name) {
    name = normalizeName(name);
    return this.has(name) ? this.map[name] : null
  };

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  };

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value);
  };

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this);
      }
    }
  };

  Headers.prototype.keys = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push(name);
    });
    return iteratorFor(items)
  };

  Headers.prototype.values = function() {
    var items = [];
    this.forEach(function(value) {
      items.push(value);
    });
    return iteratorFor(items)
  };

  Headers.prototype.entries = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push([name, value]);
    });
    return iteratorFor(items)
  };

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true;
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result);
      };
      reader.onerror = function() {
        reject(reader.error);
      };
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsArrayBuffer(blob);
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsText(blob);
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf);
    var chars = new Array(view.length);

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i]);
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength);
      view.set(new Uint8Array(buf));
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false;

    this._initBody = function(body) {
      this._bodyInit = body;
      if (!body) {
        this._bodyText = '';
      } else if (typeof body === 'string') {
        this._bodyText = body;
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body;
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body;
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString();
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer);
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer]);
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body);
      } else {
        this._bodyText = body = Object.prototype.toString.call(body);
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8');
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type);
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
        }
      }
    };

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this);
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      };

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      };
    }

    this.text = function() {
      var rejected = consumed(this);
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    };

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      };
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    };

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

  function normalizeMethod(method) {
    var upcased = method.toUpperCase();
    return methods.indexOf(upcased) > -1 ? upcased : method
  }

  function Request(input, options) {
    options = options || {};
    var body = options.body;

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url;
      this.credentials = input.credentials;
      if (!options.headers) {
        this.headers = new Headers(input.headers);
      }
      this.method = input.method;
      this.mode = input.mode;
      this.signal = input.signal;
      if (!body && input._bodyInit != null) {
        body = input._bodyInit;
        input.bodyUsed = true;
      }
    } else {
      this.url = String(input);
    }

    this.credentials = options.credentials || this.credentials || 'same-origin';
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers);
    }
    this.method = normalizeMethod(options.method || this.method || 'GET');
    this.mode = options.mode || this.mode || null;
    this.signal = options.signal || this.signal;
    this.referrer = null;

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body);
  }

  Request.prototype.clone = function() {
    return new Request(this, {body: this._bodyInit})
  };

  function decode(body) {
    var form = new FormData();
    body
      .trim()
      .split('&')
      .forEach(function(bytes) {
        if (bytes) {
          var split = bytes.split('=');
          var name = split.shift().replace(/\+/g, ' ');
          var value = split.join('=').replace(/\+/g, ' ');
          form.append(decodeURIComponent(name), decodeURIComponent(value));
        }
      });
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers();
    // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
    // https://tools.ietf.org/html/rfc7230#section-3.2
    var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
    preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':');
      var key = parts.shift().trim();
      if (key) {
        var value = parts.join(':').trim();
        headers.append(key, value);
      }
    });
    return headers
  }

  Body.call(Request.prototype);

  function Response(bodyInit, options) {
    if (!options) {
      options = {};
    }

    this.type = 'default';
    this.status = options.status === undefined ? 200 : options.status;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = 'statusText' in options ? options.statusText : 'OK';
    this.headers = new Headers(options.headers);
    this.url = options.url || '';
    this._initBody(bodyInit);
  }

  Body.call(Response.prototype);

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  };

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''});
    response.type = 'error';
    return response
  };

  var redirectStatuses = [301, 302, 303, 307, 308];

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  };

  exports.DOMException = self.DOMException;
  try {
    new exports.DOMException();
  } catch (err) {
    exports.DOMException = function(message, name) {
      this.message = message;
      this.name = name;
      var error = Error(message);
      this.stack = error.stack;
    };
    exports.DOMException.prototype = Object.create(Error.prototype);
    exports.DOMException.prototype.constructor = exports.DOMException;
  }

  function fetch(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init);

      if (request.signal && request.signal.aborted) {
        return reject(new exports.DOMException('Aborted', 'AbortError'))
      }

      var xhr = new XMLHttpRequest();

      function abortXhr() {
        xhr.abort();
      }

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        };
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
        var body = 'response' in xhr ? xhr.response : xhr.responseText;
        resolve(new Response(body, options));
      };

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'));
      };

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'));
      };

      xhr.onabort = function() {
        reject(new exports.DOMException('Aborted', 'AbortError'));
      };

      xhr.open(request.method, request.url, true);

      if (request.credentials === 'include') {
        xhr.withCredentials = true;
      } else if (request.credentials === 'omit') {
        xhr.withCredentials = false;
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob';
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value);
      });

      if (request.signal) {
        request.signal.addEventListener('abort', abortXhr);

        xhr.onreadystatechange = function() {
          // DONE (success or failure)
          if (xhr.readyState === 4) {
            request.signal.removeEventListener('abort', abortXhr);
          }
        };
      }

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
    })
  }

  fetch.polyfill = true;

  if (!self.fetch) {
    self.fetch = fetch;
    self.Headers = Headers;
    self.Request = Request;
    self.Response = Response;
  }

  exports.Headers = Headers;
  exports.Request = Request;
  exports.Response = Response;
  exports.fetch = fetch;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

}({}));
})(__self__);
__self__.fetch.ponyfill = true;
// Remove "polyfill" property added by whatwg-fetch
delete __self__.fetch.polyfill;
// Choose between native implementation (global) or custom implementation (__self__)
// var ctx = global.fetch ? global : __self__;
var ctx = __self__; // this line disable service worker support temporarily
exports = ctx.fetch // To enable: import fetch from 'cross-fetch'
exports.default = ctx.fetch // For TypeScript consumers without esModuleInterop.
exports.fetch = ctx.fetch // To enable: import {fetch} from 'cross-fetch'
exports.Headers = ctx.Headers
exports.Request = ctx.Request
exports.Response = ctx.Response
module.exports = exports

},{}]},{},[2])(2)
});
