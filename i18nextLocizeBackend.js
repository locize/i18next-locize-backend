(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.i18nextLocizeBackend = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _utils = require("./utils.js");
var _request = _interopRequireDefault(require("./request.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
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
    failLoadingOnEmptyJSON: false,
    allowedAddOrUpdateHosts: ['localhost'],
    onSaved: false,
    reloadInterval: typeof window !== 'undefined' ? false : 60 * 60 * 1000,
    checkForProjectTimeout: 3 * 1000,
    storageExpiration: 60 * 60 * 1000,
    writeDebounce: 5 * 1000
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
      try {
        document.cookie = "".concat(name, "=").concat(Date.now()).concat(expires, ";path=/");
      } catch (err) {}
    };
    isProjectNotExisting = function isProjectNotExisting(projectId) {
      var name = "notExistingLocizeProject_".concat(projectId);
      var nameEQ = "".concat(name, "=");
      try {
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
          var c = ca[i];
          while (c.charAt(0) === ' ') c = c.substring(1, c.length);
          if (c.indexOf(nameEQ) === 0) return true;
        }
      } catch (err) {}
      return false;
    };
  }
  return {
    setProjectNotExisting: setProjectNotExisting,
    isProjectNotExisting: isProjectNotExisting
  };
}
var getCustomRequestInfo = function getCustomRequestInfo(url, options, payload) {
  var headers = {};
  if (options.authorize && options.apiKey) {
    headers.Authorization = options.apiKey;
  }
  if (payload || options.setContentTypeJSON) {
    headers['Content-Type'] = 'application/json';
  }
  return {
    method: payload ? 'POST' : 'GET',
    url: url,
    headers: headers,
    body: payload
  };
};
var handleCustomRequest = function handleCustomRequest(opt, info, cb) {
  if (opt.request.length === 1) {
    try {
      var r = opt.request(info);
      if (r && typeof r.then === 'function') {
        r.then(function (data) {
          return cb(null, data);
        }).catch(cb);
      } else {
        cb(null, r);
      }
    } catch (err) {
      cb(err);
    }
    return;
  }
  opt.request(info, cb);
};
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
  return _createClass(I18NextLocizeBackend, [{
    key: "init",
    value: function init(services) {
      var _this = this;
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var allOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      var callback = arguments.length > 3 ? arguments[3] : undefined;
      if (!options.referenceLng && allOptions.fallbackLng && Array.isArray(allOptions.fallbackLng) && allOptions.fallbackLng[0] !== 'dev') {
        options.referenceLng = allOptions.fallbackLng[0];
      }
      this.services = services;
      var defOpt = getDefaults();
      var passedOpt = (0, _utils.defaults)(options, this.options || {});
      if (passedOpt.reloadInterval && passedOpt.reloadInterval < 5 * 60 * 1000) {
        console.warn('Your configured reloadInterval option is to low.');
        passedOpt.reloadInterval = defOpt.reloadInterval;
      }
      this.options = (0, _utils.defaults)(options, this.options || {}, defOpt);
      this.allOptions = allOptions;
      this.somethingLoaded = false;
      this.isProjectNotExisting = false;
      this.storage = getStorage(this.options.storageExpiration);
      if (this.options.pull) {
        console.warn('The pull API was removed use "private: true" option instead: https://www.locize.com/docs/api#fetch-private-namespace-resources');
      }
      var hostname = typeof window !== 'undefined' && window.location && window.location.hostname;
      if (hostname) {
        this.isAddOrUpdateAllowed = typeof this.options.allowedAddOrUpdateHosts === 'function' ? this.options.allowedAddOrUpdateHosts(hostname) : this.options.allowedAddOrUpdateHosts.indexOf(hostname) > -1;
        if (services && services.logger && (allOptions.saveMissing || allOptions.updateMissing)) {
          if (!this.isAddOrUpdateAllowed) {
            services.logger.warn(typeof this.options.allowedAddOrUpdateHosts === 'function' ? "locize-backend: will not save or update missings because allowedAddOrUpdateHosts returned false for the host \"".concat(hostname, "\".") : "locize-backend: will not save or update missings because the host \"".concat(hostname, "\" was not in the list of allowedAddOrUpdateHosts: ").concat(this.options.allowedAddOrUpdateHosts.join(', '), " (matches need to be exact)."));
          } else if (hostname !== 'localhost') {
            services.logger.warn("locize-backend: you are using the save or update missings feature from this host \"".concat(hostname, "\".\nMake sure you will not use it in production!\nhttps://www.locize.com/docs/going-to-production"));
          }
        }
      } else {
        this.isAddOrUpdateAllowed = true;
      }
      if (typeof callback === 'function') {
        this.getOptions(function (err, opts, languages) {
          if (err) return callback(err);
          _this.options.referenceLng = options.referenceLng || opts.referenceLng || _this.options.referenceLng;
          callback(null, opts, languages);
        });
      }
      this.queuedWrites = {
        pending: {}
      };
      this.debouncedProcess = (0, _utils.debounce)(this.process, this.options.writeDebounce);
      if (this.interval) clearInterval(this.interval);
      if (this.options.reloadInterval && this.options.projectId) {
        this.interval = setInterval(function () {
          return _this.reload();
        }, this.options.reloadInterval);
        if (_typeof(this.interval) === 'object' && typeof this.interval.unref === 'function') this.interval.unref();
      }
    }
  }, {
    key: "reload",
    value: function reload() {
      var _this2 = this;
      var _ref = this.services || {
          logger: console
        },
        backendConnector = _ref.backendConnector,
        languageUtils = _ref.languageUtils,
        logger = _ref.logger;
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
      var deferred;
      if (!callback) {
        deferred = (0, _utils.defer)();
        callback = function callback(err, ret) {
          if (err) return deferred.reject(err);
          deferred.resolve(ret);
        };
      }
      var isMissing = (0, _utils.isMissingOption)(this.options, ['projectId']);
      if (isMissing) {
        callback(new Error(isMissing));
        return deferred;
      }
      var url = (0, _utils.interpolate)(this.options.getLanguagesPath, {
        projectId: this.options.projectId
      });
      if (!this.isProjectNotExisting && this.storage.isProjectNotExisting(this.options.projectId)) {
        this.isProjectNotExisting = true;
      }
      if (this.isProjectNotExisting) {
        callback(new Error("locize project ".concat(this.options.projectId, " does not exist!")));
        return deferred;
      }
      this.getLanguagesCalls = this.getLanguagesCalls || [];
      this.getLanguagesCalls.push(callback);
      if (this.getLanguagesCalls.length > 1) return deferred;
      this.loadUrl({}, url, function (err, ret, info) {
        if (!_this3.somethingLoaded && info && info.resourceNotExisting) {
          _this3.isProjectNotExisting = true;
          _this3.storage.setProjectNotExisting(_this3.options.projectId);
          var e = new Error("locize project ".concat(_this3.options.projectId, " does not exist!"));
          var _clbs = _this3.getLanguagesCalls;
          _this3.getLanguagesCalls = [];
          return _clbs.forEach(function (clb) {
            return clb(e);
          });
        }
        if (ret) {
          var referenceLng = Object.keys(ret).reduce(function (mem, k) {
            var item = ret[k];
            if (item.isReferenceLanguage) mem = k;
            return mem;
          }, '');
          if (referenceLng && _this3.options.referenceLng !== referenceLng) {
            _this3.options.referenceLng = referenceLng;
          }
        }
        _this3.somethingLoaded = true;
        var clbs = _this3.getLanguagesCalls;
        _this3.getLanguagesCalls = [];
        clbs.forEach(function (clb) {
          return clb(err, ret);
        });
      });
      return deferred;
    }
  }, {
    key: "getOptions",
    value: function getOptions(callback) {
      var _this4 = this;
      var deferred;
      if (!callback) {
        deferred = (0, _utils.defer)();
        callback = function callback(err, ret) {
          if (err) return deferred.reject(err);
          deferred.resolve(ret);
        };
      }
      this.getLanguages(function (err, data) {
        if (err) return callback(err);
        var keys = Object.keys(data);
        if (!keys.length) {
          return callback(new Error('was unable to load languages via API'));
        }
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
          fallbackLng: _this4.options.referenceLng,
          referenceLng: _this4.options.referenceLng,
          supportedLngs: lngs.length === 0 && _this4.options.referenceLng ? [_this4.options.referenceLng] : lngs,
          load: hasRegion ? 'all' : 'languageOnly'
        }, data);
      });
      return deferred;
    }
  }, {
    key: "checkIfProjectExists",
    value: function checkIfProjectExists(callback) {
      var _this5 = this;
      var _ref2 = this.services || {
          logger: console
        },
        logger = _ref2.logger;
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
      var _ref3 = this.services || {
          logger: console
        },
        logger = _ref3.logger;
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
      var clb = function clb(err, res) {
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
        if (!res && err && err.message) {
          var errorMessage = err.message.toLowerCase();
          var isNetworkError = ['failed', 'fetch', 'network', 'load'].find(function (term) {
            return errorMessage.indexOf(term) > -1;
          });
          if (isNetworkError) {
            return callback('failed loading ' + url + ': ' + err.message, true, {
              resourceNotExisting: resourceNotExisting
            });
          }
        }
        if (err) return callback(err, false);
        var ret, parseErr;
        try {
          if (typeof res.data === 'string') {
            ret = JSON.parse(res.data);
          } else {
            ret = res.data;
          }
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
      };
      if (!this.options.request || url.indexOf("/languages/".concat(options.projectId)) > 0) return (0, _request.default)(options, url, payload, clb);
      var info = getCustomRequestInfo(url, options, payload);
      handleCustomRequest(this.options, info, clb);
    }
  }, {
    key: "create",
    value: function create(languages, namespace, key, fallbackValue, callback, options) {
      var _this8 = this;
      if (typeof callback !== 'function') callback = function callback() {};
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
      if (typeof callback !== 'function') callback = function callback() {};
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
        if (!this.options.request) {
          (0, _request.default)((0, _utils.defaults)({
            authorize: true
          }, this.options), missingUrl, payloadMissing, doneOne);
        } else {
          var info = getCustomRequestInfo(missingUrl, (0, _utils.defaults)({
            authorize: true
          }, this.options), payloadMissing);
          handleCustomRequest(this.options, info, doneOne);
        }
      }
      if (hasUpdates) {
        if (!this.options.request) {
          (0, _request.default)((0, _utils.defaults)({
            authorize: true
          }, this.options), updatesUrl, payloadUpdate, doneOne);
        } else {
          var _info = getCustomRequestInfo(updatesUrl, (0, _utils.defaults)({
            authorize: true
          }, this.options), payloadUpdate);
          handleCustomRequest(this.options, _info, doneOne);
        }
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
      var clbs = missings.filter(function (m) {
        return m.callback;
      }).map(function (missing) {
        return missing.callback;
      });
      if (missings.length) {
        (0, _utils.setPath)(this.queuedWrites, ['locks', lng, namespace], true);
        var namespaceSaved = function namespaceSaved() {
          (0, _utils.setPath)(_this10.queuedWrites, ['locks', lng, namespace], false);
          clbs.forEach(function (clb) {
            return clb();
          });
          if (_this10.options.onSaved) _this10.options.onSaved(lng, namespace);
          _this10.debouncedProcess(lng, namespace);
        };
        var amountOfPages = missings.length / pageSize;
        var pagesDone = 0;
        var page = missings.splice(0, pageSize);
        this.writePage(lng, namespace, page, function () {
          pagesDone++;
          if (pagesDone >= amountOfPages) namespaceSaved();
        });
        while (page.length === pageSize) {
          page = missings.splice(0, pageSize);
          if (page.length) {
            this.writePage(lng, namespace, page, function () {
              pagesDone++;
              if (pagesDone >= amountOfPages) namespaceSaved();
            });
          }
        }
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
}();
I18NextLocizeBackend.type = 'backend';
var _default = exports.default = I18NextLocizeBackend;
module.exports = exports.default;
},{"./request.js":2,"./utils.js":3}],2:[function(require,module,exports){
(function (global){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != _typeof(e) && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
var fetchApi = typeof fetch === 'function' ? fetch : undefined;
if (typeof global !== 'undefined' && global.fetch) {
  fetchApi = global.fetch;
} else if (typeof window !== 'undefined' && window.fetch) {
  fetchApi = window.fetch;
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
if (typeof fetchApi !== 'function') fetchApi = undefined;
if (!fetchApi && !XmlHttpRequestApi && !ActiveXObjectApi) {
  try {
    fetchApi = require('cross-fetch');
  } catch (e) {}
}
var requestWithFetch = function requestWithFetch(options, url, payload, callback) {
  var headers = {};
  if (typeof window === 'undefined' && typeof global !== 'undefined' && typeof global.process !== 'undefined' && global.process.versions && global.process.versions.node) {
    headers['User-Agent'] = "i18next-locize-backend (node/".concat(global.process.version, "; ").concat(global.process.platform, " ").concat(global.process.arch, ")");
  }
  if (options.authorize && options.apiKey) {
    headers.Authorization = options.apiKey;
  }
  if (payload || options.setContentTypeJSON) {
    headers['Content-Type'] = 'application/json';
  }
  var resolver = function resolver(response) {
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
  };
  if (typeof fetch === 'function') {
    fetch(url, {
      method: payload ? 'POST' : 'GET',
      body: payload ? JSON.stringify(payload) : undefined,
      headers: headers
    }).then(resolver).catch(callback);
  } else {
    fetchApi(url, {
      method: payload ? 'POST' : 'GET',
      body: payload ? JSON.stringify(payload) : undefined,
      headers: headers
    }).then(resolver).catch(callback);
  }
};
var requestWithXmlHttpRequest = function requestWithXmlHttpRequest(options, url, payload, callback) {
  try {
    var x = XmlHttpRequestApi ? new XmlHttpRequestApi() : new ActiveXObjectApi('MSXML2.XMLHTTP.3.0');
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
  callback(new Error('No fetch and no xhr implementation found!'));
};
var _default = exports.default = request;
module.exports = exports.default;
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"cross-fetch":4}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.debounce = debounce;
exports.defaults = defaults;
exports.defer = defer;
exports.getPath = getPath;
exports.interpolate = interpolate;
exports.isMissingOption = isMissingOption;
exports.optionExist = optionExist;
exports.pushPath = pushPath;
exports.setPath = setPath;
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
function defer() {
  var res;
  var rej;
  var promise = new Promise(function (resolve, reject) {
    res = resolve;
    rej = reject;
  });
  promise.resolve = res;
  promise.reject = rej;
  return promise;
}
},{}],4:[function(require,module,exports){

},{}]},{},[1])(1)
});
