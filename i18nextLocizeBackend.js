var i18nextLocizeBackend = (function() {
	//#region lib/utils.js
	const arr = [];
	const each = arr.forEach;
	const slice = arr.slice;
	const UNSAFE_KEYS = [
		"__proto__",
		"constructor",
		"prototype"
	];
	function defaults(obj) {
		each.call(slice.call(arguments, 1), (source) => {
			if (source) for (const prop of Object.keys(source)) {
				if (UNSAFE_KEYS.indexOf(prop) > -1) continue;
				if (obj[prop] === void 0) obj[prop] = source[prop];
			}
		});
		return obj;
	}
	function isSafeUrlSegment(v) {
		if (typeof v !== "string") return false;
		if (v.length === 0 || v.length > 128) return false;
		if (UNSAFE_KEYS.indexOf(v) > -1) return false;
		if (v.indexOf("..") > -1) return false;
		if (v.indexOf("/") > -1 || v.indexOf("\\") > -1) return false;
		if (/[?#%\s@]/.test(v)) return false;
		if (/[\x00-\x1F\x7F]/.test(v)) return false;
		return true;
	}
	function sanitizeLogValue(v) {
		if (typeof v !== "string") return v;
		return v.replace(/[\r\n\x00-\x1F\x7F]/g, " ");
	}
	function debounce(func, wait, immediate) {
		let timeout;
		return function() {
			const context = this;
			const args = arguments;
			const later = function() {
				timeout = null;
				if (!immediate) func.apply(context, args);
			};
			const callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) func.apply(context, args);
		};
	}
	function getLastOfPath(object, path, Empty) {
		function cleanKey(key) {
			return key && key.indexOf("###") > -1 ? key.replace(/###/g, ".") : key;
		}
		const stack = typeof path !== "string" ? [].concat(path) : path.split(".");
		while (stack.length > 1) {
			if (!object) return {};
			const key = cleanKey(stack.shift());
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
		const { obj, k } = getLastOfPath(object, path, Object);
		obj[k] = newValue;
	}
	function pushPath(object, path, newValue, concat) {
		const { obj, k } = getLastOfPath(object, path, Object);
		obj[k] = obj[k] || [];
		if (concat) obj[k] = obj[k].concat(newValue);
		if (!concat) obj[k].push(newValue);
	}
	function getPath(object, path) {
		const { obj, k } = getLastOfPath(object, path);
		if (!obj) return void 0;
		return obj[k];
	}
	const regexp = /* @__PURE__ */ new RegExp("{{(.+?)}}", "g");
	function makeString(object) {
		if (object == null) return "";
		return "" + object;
	}
	function interpolateUrl(str, data) {
		let match;
		let unsafe = false;
		while (match = regexp.exec(str)) {
			const key = match[1].trim();
			if (UNSAFE_KEYS.indexOf(key) > -1) {
				regexp.lastIndex = 0;
				continue;
			}
			const raw = data[key];
			if (raw == null) {
				regexp.lastIndex = 0;
				continue;
			}
			const segments = makeString(raw).split("+");
			let segmentsOk = true;
			for (const seg of segments) if (!isSafeUrlSegment(seg)) {
				segmentsOk = false;
				break;
			}
			if (!segmentsOk) {
				unsafe = true;
				break;
			}
			str = str.replace(match[0], segments.join("+"));
			regexp.lastIndex = 0;
		}
		regexp.lastIndex = 0;
		return unsafe ? null : str;
	}
	function isMissingOption(obj, props) {
		return props.reduce((mem, p) => {
			if (mem) return mem;
			if (!obj || !obj[p] || typeof obj[p] !== "string" || !obj[p].toLowerCase() === p.toLowerCase()) {
				const err = `i18next-locize-backend :: got "${obj[p]}" in options for ${p} which is invalid.`;
				console.warn(err);
				return err;
			}
			return false;
		}, false);
	}
	function defer() {
		let res;
		let rej;
		const promise = new Promise((resolve, reject) => {
			res = resolve;
			rej = reject;
		});
		promise.resolve = res;
		promise.reject = rej;
		return promise;
	}
	//#endregion
	//#region lib/request.js
	const g = typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : typeof window !== "undefined" ? window : void 0;
	let fetchApi;
	if (typeof fetch === "function") fetchApi = fetch;
	else if (g && typeof g.fetch === "function") fetchApi = g.fetch;
	const XmlHttpRequestApi = (typeof XMLHttpRequest === "function" || typeof XMLHttpRequest === "object") && g ? g.XMLHttpRequest : void 0;
	const ActiveXObjectApi = typeof ActiveXObject === "function" && g ? g.ActiveXObject : void 0;
	const storage = {};
	const parseMaxAge = (headerString) => {
		if (!headerString) return 0;
		const matches = headerString.match(/max-age=([0-9]+)/);
		return matches ? parseInt(matches[1], 10) : 0;
	};
	const requestWithFetch = (options, url, payload, callback) => {
		const headers = {};
		if (typeof window === "undefined" && typeof global !== "undefined" && typeof global.process !== "undefined" && global.process.versions && global.process.versions.node) headers["User-Agent"] = `i18next-locize-backend (node/${global.process.version}; ${global.process.platform} ${global.process.arch})`;
		if (options.authorize && options.apiKey) headers.Authorization = options.apiKey;
		if (payload || options.setContentTypeJSON) headers["Content-Type"] = "application/json";
		const resolver = (response) => {
			let resourceNotExisting = response.headers && response.headers.get("x-cache") === "Error from cloudfront";
			if (options.cdnType === "standard" && response.status === 404 && (!response.headers || !response.headers.get("x-cache"))) {
				resourceNotExisting = true;
				return callback(null, {
					status: 200,
					data: "{}",
					resourceNotExisting
				});
			}
			if (!response.ok) return callback(response.statusText || "Error", {
				status: response.status,
				resourceNotExisting
			});
			const cacheControl = response.headers && response.headers.get("cache-control");
			response.text().then((data) => {
				callback(null, {
					status: response.status,
					data,
					resourceNotExisting,
					cacheControl
				});
			}).catch(callback);
		};
		if (typeof fetch === "function") fetch(url, {
			method: payload ? "POST" : "GET",
			body: payload ? JSON.stringify(payload) : void 0,
			headers
		}).then(resolver).catch(callback);
		else fetchApi(url, {
			method: payload ? "POST" : "GET",
			body: payload ? JSON.stringify(payload) : void 0,
			headers
		}).then(resolver).catch(callback);
	};
	const requestWithXmlHttpRequest = (options, url, payload, callback) => {
		try {
			const x = XmlHttpRequestApi ? new XmlHttpRequestApi() : new ActiveXObjectApi("MSXML2.XMLHTTP.3.0");
			x.open(payload ? "POST" : "GET", url, 1);
			if (!options.crossDomain) x.setRequestHeader("X-Requested-With", "XMLHttpRequest");
			if (options.authorize && options.apiKey) x.setRequestHeader("Authorization", options.apiKey);
			if (payload || options.setContentTypeJSON) x.setRequestHeader("Content-Type", "application/json");
			x.onreadystatechange = () => {
				let resourceNotExisting = x.getResponseHeader("x-cache") === "Error from cloudfront";
				if (options.cdnType === "standard" && x.status === 404 && !x.getResponseHeader("x-cache")) {
					resourceNotExisting = true;
					return x.readyState > 3 && callback(null, {
						status: 200,
						data: "{}",
						resourceNotExisting
					});
				}
				const cacheControl = x.getResponseHeader("Cache-Control");
				x.readyState > 3 && callback(x.status >= 400 ? x.statusText : null, {
					status: x.status,
					data: x.responseText,
					resourceNotExisting,
					cacheControl
				});
			};
			x.send(JSON.stringify(payload));
		} catch (e) {
			console && console.log(e);
		}
	};
	const request = (options, url, payload, callback) => {
		if (typeof payload === "function") {
			callback = payload;
			payload = void 0;
		}
		callback = callback || (() => {});
		const useCacheLayer = typeof window === "undefined" && options.useCacheLayer;
		if (useCacheLayer && !payload && !options.noCache && storage[url] && storage[url].expires > Date.now()) return callback(null, storage[url].data);
		const originalCallback = callback;
		callback = (err, res) => {
			if (useCacheLayer && !err && res && !payload && res.cacheControl) {
				const maxAge = parseMaxAge(res.cacheControl);
				if (maxAge > 0) storage[url] = {
					data: res,
					expires: Date.now() + maxAge * 1e3
				};
			}
			originalCallback(err, res);
		};
		if (!payload && options.noCache && options.cdnType === "standard") url += (url.indexOf("?") >= 0 ? "&" : "?") + "cache=no";
		if (fetchApi) return requestWithFetch(options, url, payload, callback);
		if (XmlHttpRequestApi || ActiveXObjectApi) return requestWithXmlHttpRequest(options, url, payload, callback);
		callback(/* @__PURE__ */ new Error("No fetch and no xhr implementation found!"));
	};
	//#endregion
	//#region lib/index.js
	const getApiPaths = (cdnType) => {
		if (!cdnType) cdnType = "standard";
		return {
			loadPath: `https://api${cdnType === "standard" ? ".lite" : ""}.locize.app/{{projectId}}/{{version}}/{{lng}}/{{ns}}`,
			privatePath: `https://api${cdnType === "standard" ? ".lite" : ""}.locize.app/private/{{projectId}}/{{version}}/{{lng}}/{{ns}}`,
			getLanguagesPath: `https://api${cdnType === "standard" ? ".lite" : ""}.locize.app/languages/{{projectId}}`,
			addPath: `https://api${cdnType === "standard" ? ".lite" : ""}.locize.app/missing/{{projectId}}/{{version}}/{{lng}}/{{ns}}`,
			updatePath: `https://api${cdnType === "standard" ? ".lite" : ""}.locize.app/update/{{projectId}}/{{version}}/{{lng}}/{{ns}}`
		};
	};
	const getDefaults = (cdnType) => {
		if (!cdnType) cdnType = "standard";
		return defaults({
			cdnType,
			noCache: false,
			referenceLng: "en",
			crossDomain: true,
			setContentTypeJSON: false,
			version: "latest",
			private: false,
			translatedPercentageThreshold: .9,
			failLoadingOnEmptyJSON: false,
			allowedAddOrUpdateHosts: ["localhost"],
			onSaved: false,
			reloadInterval: typeof window !== "undefined" ? false : 3600 * 1e3,
			checkForProjectTimeout: 3 * 1e3,
			storageExpiration: 3600 * 1e3,
			writeDebounce: 5 * 1e3,
			useCacheLayer: typeof window === "undefined"
		}, getApiPaths(cdnType));
	};
	let hasLocalStorageSupport;
	try {
		hasLocalStorageSupport = typeof window !== "undefined" && window.localStorage !== null;
		const testKey = "notExistingLocizeProject";
		window.localStorage.setItem(testKey, "foo");
		window.localStorage.removeItem(testKey);
	} catch (e) {
		hasLocalStorageSupport = false;
	}
	function getStorage(storageExpiration) {
		let setProjectNotExisting = () => {};
		let isProjectNotExisting = () => {};
		if (hasLocalStorageSupport) {
			setProjectNotExisting = (projectId) => {
				window.localStorage.setItem(`notExistingLocizeProject_${projectId}`, Date.now());
			};
			isProjectNotExisting = (projectId) => {
				const ret = window.localStorage.getItem(`notExistingLocizeProject_${projectId}`);
				if (!ret) return false;
				if (Date.now() - ret > storageExpiration) {
					window.localStorage.removeItem(`notExistingLocizeProject_${projectId}`);
					return false;
				}
				return true;
			};
		} else if (typeof document !== "undefined") {
			setProjectNotExisting = (projectId) => {
				const date = /* @__PURE__ */ new Date();
				date.setTime(date.getTime() + storageExpiration);
				const expires = `; expires=${date.toGMTString()}`;
				const name = `notExistingLocizeProject_${projectId}`;
				try {
					document.cookie = `${name}=${Date.now()}${expires};path=/`;
				} catch (err) {}
			};
			isProjectNotExisting = (projectId) => {
				const nameEQ = `${`notExistingLocizeProject_${projectId}`}=`;
				try {
					const ca = document.cookie.split(";");
					for (let i = 0; i < ca.length; i++) {
						let c = ca[i];
						while (c.charAt(0) === " ") c = c.substring(1, c.length);
						if (c.indexOf(nameEQ) === 0) return true;
					}
				} catch (err) {}
				return false;
			};
		}
		return {
			setProjectNotExisting,
			isProjectNotExisting
		};
	}
	const getCustomRequestInfo = (url, options, payload) => {
		const headers = {};
		if (options.authorize && options.apiKey) headers.Authorization = options.apiKey;
		if (payload || options.setContentTypeJSON) headers["Content-Type"] = "application/json";
		return {
			method: payload ? "POST" : "GET",
			url,
			headers,
			body: payload
		};
	};
	const handleCustomRequest = (opt, info, cb) => {
		if (opt.request.length === 1) {
			try {
				const r = opt.request(info);
				if (r && typeof r.then === "function") r.then((data) => cb(null, data)).catch(cb);
				else cb(null, r);
			} catch (err) {
				cb(err);
			}
			return;
		}
		opt.request(info, cb);
	};
	function randomizeTimeout(base) {
		const variance = base * .25;
		const min = Math.max(0, base - variance);
		const max = base + variance;
		return Math.floor(min + Math.random() * (max - min));
	}
	var I18NextLocizeBackend = class {
		constructor(services, options = {}, allOptions = {}, callback) {
			this.services = services;
			this.options = options;
			this.allOptions = allOptions;
			this.type = "backend";
			if (services && services.projectId) this.init(null, services, allOptions, options);
			else this.init(services, options, allOptions, callback);
		}
		init(services, options = {}, allOptions = {}, callback) {
			if (!options.referenceLng && allOptions.fallbackLng && Array.isArray(allOptions.fallbackLng) && allOptions.fallbackLng[0] !== "dev") options.referenceLng = allOptions.fallbackLng[0];
			this.services = services;
			const orgPassedOptions = defaults({}, options);
			const passedOpt = defaults(options, this.options || {});
			const defOpt = getDefaults(passedOpt.cdnType);
			if (passedOpt.reloadInterval && passedOpt.reloadInterval < 300 * 1e3) {
				console.warn("Your configured reloadInterval option is to low.");
				passedOpt.reloadInterval = defOpt.reloadInterval;
			}
			this.options = defaults(options, this.options || {}, defOpt);
			this.allOptions = allOptions;
			this.somethingLoaded = false;
			this.isProjectNotExisting = false;
			this.storage = getStorage(this.options.storageExpiration);
			const apiPaths = getApiPaths(this.options.cdnType);
			Object.keys(apiPaths).forEach((ap) => {
				if (!orgPassedOptions[ap]) this.options[ap] = apiPaths[ap];
			});
			if (allOptions.debug && orgPassedOptions.noCache === void 0 && this.options.cdnType === "standard") this.options.noCache = true;
			if (this.options.noCache && this.options.cdnType !== "standard") console.warn(`The 'noCache' option is not available for 'cdnType' '${this.options.cdnType}'!`);
			const hostname = typeof window !== "undefined" && window.location && window.location.hostname;
			if (hostname) {
				this.isAddOrUpdateAllowed = typeof this.options.allowedAddOrUpdateHosts === "function" ? this.options.allowedAddOrUpdateHosts(hostname) : this.options.allowedAddOrUpdateHosts.indexOf(hostname) > -1;
				if (services && services.logger && (allOptions.saveMissing || allOptions.updateMissing)) {
					if (!this.isAddOrUpdateAllowed) services.logger.warn(typeof this.options.allowedAddOrUpdateHosts === "function" ? `locize-backend: will not save or update missings because allowedAddOrUpdateHosts returned false for the host "${hostname}".` : `locize-backend: will not save or update missings because the host "${hostname}" was not in the list of allowedAddOrUpdateHosts: ${this.options.allowedAddOrUpdateHosts.join(", ")} (matches need to be exact).`);
					else if (hostname !== "localhost") services.logger.warn(`locize-backend: you are using the save or update missings feature from this host "${hostname}".\nMake sure you will not use it in production!\nhttps://www.locize.com/docs/going-to-production`);
				}
			} else this.isAddOrUpdateAllowed = true;
			if (typeof callback === "function") this.getOptions((err, opts, languages) => {
				if (err) return callback(err);
				this.options.referenceLng = options.referenceLng || opts.referenceLng || this.options.referenceLng;
				callback(null, opts, languages);
			});
			this.queuedWrites = { pending: {} };
			this.debouncedProcess = debounce(this.process, this.options.writeDebounce);
			if (this.interval) clearInterval(this.interval);
			if (this.options.reloadInterval && this.options.projectId) {
				this.interval = setInterval(() => this.reload(), this.options.reloadInterval);
				if (typeof this.interval === "object" && typeof this.interval.unref === "function") this.interval.unref();
			}
		}
		reload() {
			const { backendConnector, languageUtils, logger } = this.services || { logger: console };
			if (!backendConnector) return;
			const currentLanguage = backendConnector.language;
			if (currentLanguage && currentLanguage.toLowerCase() === "cimode") return;
			const toLoad = [];
			const append = (lng) => {
				languageUtils.toResolveHierarchy(lng).forEach((l) => {
					if (toLoad.indexOf(l) < 0) toLoad.push(l);
				});
			};
			append(currentLanguage);
			if (this.allOptions.preload) this.allOptions.preload.forEach((l) => append(l));
			toLoad.forEach((lng) => {
				this.allOptions.ns.forEach((ns) => {
					backendConnector.read(lng, ns, "read", null, null, (err, data) => {
						if (err) logger.warn(`loading namespace ${ns} for language ${lng} failed`, err);
						if (!err && data) logger.log(`loaded namespace ${ns} for language ${lng}`, data);
						backendConnector.loaded(`${lng}|${ns}`, err, data);
					});
				});
			});
		}
		getLanguages(callback) {
			let deferred;
			if (!callback) {
				deferred = defer();
				callback = (err, ret) => {
					if (err) return deferred.reject(err);
					deferred.resolve(ret);
				};
			}
			const isMissing = isMissingOption(this.options, ["projectId"]);
			if (isMissing) {
				callback(new Error(isMissing));
				return deferred;
			}
			const url = interpolateUrl(this.options.getLanguagesPath, { projectId: this.options.projectId });
			if (url == null) {
				callback(/* @__PURE__ */ new Error("i18next-locize-backend: unsafe projectId — refusing to build request URL for projectId=" + sanitizeLogValue(String(this.options.projectId))));
				return deferred;
			}
			if (!this.isProjectNotExisting && this.storage.isProjectNotExisting(this.options.projectId)) this.isProjectNotExisting = true;
			if (this.isProjectNotExisting) {
				callback(new Error(this.isProjectNotExistingErrorMessage || `Locize project ${this.options.projectId} does not exist!`));
				return deferred;
			}
			this.getLanguagesCalls = this.getLanguagesCalls || [];
			this.getLanguagesCalls.push(callback);
			if (this.getLanguagesCalls.length > 1) return deferred;
			this.loadUrl({}, url, (err, ret, info) => {
				if (!this.somethingLoaded && info && info.resourceNotExisting) {
					this.isProjectNotExisting = true;
					let errMsg = `Locize project ${this.options.projectId} does not exist!`;
					this.isProjectNotExistingErrorMessage = errMsg;
					const cdnTypeAlt = this.options.cdnType === "standard" ? "pro" : "standard";
					const urlAlt = interpolateUrl(getApiPaths(cdnTypeAlt).getLanguagesPath, { projectId: this.options.projectId });
					if (urlAlt == null) return;
					this.loadUrl({}, urlAlt, (errAlt, retAlt, infoAlt) => {
						if (!errAlt && retAlt && (!infoAlt || !infoAlt.resourceNotExisting)) {
							errMsg += ` It seems you're using the wrong cdnType. Your Locize project is configured to use "${cdnTypeAlt}" but here you've configured "${this.options.cdnType}".`;
							this.isProjectNotExistingErrorMessage = errMsg;
						} else if (!this.somethingLoaded && infoAlt && infoAlt.resourceNotExisting) {
							this.isProjectNotExisting = true;
							this.storage.setProjectNotExisting(this.options.projectId);
						}
						const e = new Error(errMsg);
						const clbs = this.getLanguagesCalls;
						this.getLanguagesCalls = [];
						clbs.forEach((clb) => clb(e));
					});
					return;
				}
				if (ret) {
					this.loadedLanguages = Object.keys(ret);
					const referenceLng = this.loadedLanguages.reduce((mem, k) => {
						if (ret[k].isReferenceLanguage) mem = k;
						return mem;
					}, "");
					if (referenceLng && this.options.referenceLng !== referenceLng) this.options.referenceLng = referenceLng;
				}
				this.somethingLoaded = true;
				const clbs = this.getLanguagesCalls;
				this.getLanguagesCalls = [];
				clbs.forEach((clb) => clb(err, ret));
			});
			return deferred;
		}
		getOptions(callback) {
			let deferred;
			if (!callback) {
				deferred = defer();
				callback = (err, ret) => {
					if (err) return deferred.reject(err);
					deferred.resolve(ret);
				};
			}
			this.getLanguages((err, data) => {
				if (err) return callback(err);
				const keys = Object.keys(data);
				if (!keys.length) return callback(/* @__PURE__ */ new Error("was unable to load languages via API"));
				const lngs = keys.reduce((mem, k) => {
					const item = data[k];
					if (item.translated[this.options.version] && item.translated[this.options.version] >= this.options.translatedPercentageThreshold) mem.push(k);
					return mem;
				}, []);
				const hasRegion = keys.reduce((mem, k) => {
					if (k.indexOf("-") > -1) return true;
					return mem;
				}, false);
				callback(null, {
					fallbackLng: this.options.referenceLng,
					referenceLng: this.options.referenceLng,
					supportedLngs: lngs.length === 0 && this.options.referenceLng ? [this.options.referenceLng] : lngs,
					load: hasRegion ? "all" : "languageOnly"
				}, data);
			});
			return deferred;
		}
		checkIfProjectExists(callback) {
			const { logger } = this.services || { logger: console };
			if (this.somethingLoaded) {
				if (callback) callback(null);
				return;
			}
			if (this.alreadyRequestedCheckIfProjectExists) {
				setTimeout(() => this.checkIfProjectExists(callback), randomizeTimeout(this.options.checkForProjectTimeout));
				return;
			}
			this.alreadyRequestedCheckIfProjectExists = true;
			this.getLanguages((err) => {
				if (err && err.message && err.message.indexOf("does not exist") > 0) {
					if (logger) logger.error(err.message);
				}
				if (callback) callback(err);
			});
		}
		checkIfLanguagesLoaded(callback) {
			const { logger } = this.services || { logger: console };
			if (this.loadedLanguages) {
				if (callback) callback(null);
				return;
			}
			this.getLanguages((err) => {
				if (err && err.message && err.message.indexOf("does not exist") > 0) {
					if (logger) logger.error(err.message);
				}
				if (callback) callback(err);
			});
		}
		read(language, namespace, callback) {
			const { logger } = this.services || { logger: console };
			let url;
			let options = {};
			if (this.options.private) {
				const isMissing = isMissingOption(this.options, [
					"projectId",
					"version",
					"apiKey"
				]);
				if (isMissing) return callback(new Error(isMissing), false);
				url = interpolateUrl(this.options.privatePath, {
					lng: language,
					ns: namespace,
					projectId: this.options.projectId,
					version: this.options.version
				});
				options = { authorize: true };
			} else {
				const isMissing = isMissingOption(this.options, ["projectId", "version"]);
				if (isMissing) return callback(new Error(isMissing), false);
				url = interpolateUrl(this.options.loadPath, {
					lng: language,
					ns: namespace,
					projectId: this.options.projectId,
					version: this.options.version
				});
			}
			if (url == null) return callback(/* @__PURE__ */ new Error("i18next-locize-backend: unsafe lng/ns/projectId/version — refusing to build request URL for lng=" + sanitizeLogValue(String(language)) + " ns=" + sanitizeLogValue(String(namespace))), false);
			if (!this.isProjectNotExisting && this.storage.isProjectNotExisting(this.options.projectId)) this.isProjectNotExisting = true;
			if (this.isProjectNotExisting) {
				const err = new Error(this.isProjectNotExistingErrorMessage || `Locize project ${this.options.projectId} does not exist!`);
				if (logger) logger.error(err.message);
				if (callback) callback(err);
				return;
			}
			if (this.warnedLanguages && this.warnedLanguages.indexOf(language) > -1) {
				const err = /* @__PURE__ */ new Error(`Will not continue to load language "${language}" since it is not available in Locize project ${this.options.projectId}!`);
				if (logger) logger.error(err.message);
				if (callback) callback(err);
				return;
			}
			this.loadUrl(options, url, (err, ret, info) => {
				const resourceNotExisting = info && info.resourceNotExisting;
				if (!resourceNotExisting) {
					this.hasResourcesForLng || (this.hasResourcesForLng = {});
					this.hasResourcesForLng[language] = true;
				}
				if (resourceNotExisting && (!this.hasResourcesForLng || !this.hasResourcesForLng[language])) setTimeout(() => {
					this.checkIfLanguagesLoaded(() => {
						if (!this.loadedLanguages) return;
						if (this.loadedLanguages.indexOf(language) > -1) return;
						if (this.warnedLanguages && this.warnedLanguages.indexOf(language) > -1) return;
						this.warnedLanguages || (this.warnedLanguages = []);
						this.warnedLanguages.push(language);
						if (logger) logger.error(`Language "${language}" is not available in Locize project ${this.options.projectId}!`);
					});
				}, randomizeTimeout(this.options.checkForProjectTimeout));
				if (!this.somethingLoaded) if (resourceNotExisting) setTimeout(() => this.checkIfProjectExists(), randomizeTimeout(this.options.checkForProjectTimeout));
				else this.somethingLoaded = true;
				callback(err, ret);
			});
		}
		loadUrl(options, url, payload, callback) {
			options = defaults(options, this.options);
			if (typeof payload === "function") {
				callback = payload;
				payload = void 0;
			}
			callback = callback || (() => {});
			const clb = (err, res) => {
				const resourceNotExisting = res && res.resourceNotExisting;
				if (res && (res.status === 408 || res.status === 400)) return callback("failed loading " + url, true, { resourceNotExisting });
				if (res && (res.status >= 500 && res.status < 600 || !res.status)) return callback("failed loading " + url, true, { resourceNotExisting });
				if (res && res.status >= 400 && res.status < 500) return callback("failed loading " + url, false, { resourceNotExisting });
				if (!res && err && err.message) {
					const errorMessage = err.message.toLowerCase();
					if ([
						"failed",
						"fetch",
						"network",
						"load"
					].find((term) => errorMessage.indexOf(term) > -1)) return callback("failed loading " + url + ": " + err.message, true, { resourceNotExisting });
				}
				if (err) return callback(err, false);
				let ret, parseErr;
				try {
					if (typeof res.data === "string") ret = JSON.parse(res.data);
					else ret = res.data;
				} catch (e) {
					parseErr = "failed parsing " + url + " to json";
				}
				if (parseErr) return callback(parseErr, false);
				if (this.options.failLoadingOnEmptyJSON && !Object.keys(ret).length) return callback("loaded result empty for " + url, false, { resourceNotExisting });
				callback(null, ret, { resourceNotExisting });
			};
			if (!this.options.request || url.indexOf(`/languages/${options.projectId}`) > 0) return request(options, url, payload, clb);
			const info = getCustomRequestInfo(url, options, payload);
			handleCustomRequest(this.options, info, clb);
		}
		create(languages, namespace, key, fallbackValue, callback, options) {
			if (typeof callback !== "function") callback = () => {};
			this.checkIfProjectExists((err) => {
				if (err) return callback(err);
				const isMissing = isMissingOption(this.options, [
					"projectId",
					"version",
					"apiKey",
					"referenceLng"
				]);
				if (isMissing) return callback(new Error(isMissing));
				if (!this.isAddOrUpdateAllowed) return callback("host is not allowed to create key.");
				if (typeof languages === "string") languages = [languages];
				if (languages.filter((l) => l === this.options.referenceLng).length < 1) this.services && this.services.logger && this.services.logger.warn(`locize-backend: will not save missings because the reference language "${this.options.referenceLng}" was not in the list of to save languages: ${languages.join(", ")} (open your site in the reference language to save missings).`);
				languages.forEach((lng) => {
					if (lng === this.options.referenceLng) this.queue.call(this, this.options.referenceLng, namespace, key, fallbackValue, callback, options);
				});
			});
		}
		update(languages, namespace, key, fallbackValue, callback, options) {
			if (typeof callback !== "function") callback = () => {};
			this.checkIfProjectExists((err) => {
				if (err) return callback(err);
				const isMissing = isMissingOption(this.options, [
					"projectId",
					"version",
					"apiKey",
					"referenceLng"
				]);
				if (isMissing) return callback(new Error(isMissing));
				if (!this.isAddOrUpdateAllowed) return callback("host is not allowed to update key.");
				if (!options) options = {};
				if (typeof languages === "string") languages = [languages];
				options.isUpdate = true;
				languages.forEach((lng) => {
					if (lng === this.options.referenceLng) this.queue.call(this, this.options.referenceLng, namespace, key, fallbackValue, callback, options);
				});
			});
		}
		writePage(lng, namespace, missings, callback) {
			const missingUrl = interpolateUrl(this.options.addPath, {
				lng,
				ns: namespace,
				projectId: this.options.projectId,
				version: this.options.version
			});
			const updatesUrl = interpolateUrl(this.options.updatePath, {
				lng,
				ns: namespace,
				projectId: this.options.projectId,
				version: this.options.version
			});
			if (missingUrl == null || updatesUrl == null) {
				if (typeof callback === "function") callback(/* @__PURE__ */ new Error("i18next-locize-backend: unsafe lng/ns/projectId/version — refusing to persist missing keys for lng=" + sanitizeLogValue(String(lng)) + " ns=" + sanitizeLogValue(String(namespace))));
				return;
			}
			let hasMissing = false;
			let hasUpdates = false;
			const payloadMissing = {};
			const payloadUpdate = {};
			missings.forEach((item) => {
				const value = item.options && item.options.tDescription ? {
					value: item.fallbackValue || "",
					context: { text: item.options.tDescription }
				} : item.fallbackValue || "";
				if (item.options && item.options.isUpdate) {
					if (!hasUpdates) hasUpdates = true;
					payloadUpdate[item.key] = value;
				} else {
					if (!hasMissing) hasMissing = true;
					payloadMissing[item.key] = value;
				}
			});
			let todo = 0;
			if (hasMissing) todo++;
			if (hasUpdates) todo++;
			const doneOne = (err) => {
				todo--;
				if (!todo) callback(err);
			};
			if (!todo) doneOne();
			if (hasMissing) if (!this.options.request) request(defaults({ authorize: true }, this.options), missingUrl, payloadMissing, doneOne);
			else {
				const info = getCustomRequestInfo(missingUrl, defaults({ authorize: true }, this.options), payloadMissing);
				handleCustomRequest(this.options, info, doneOne);
			}
			if (hasUpdates) if (!this.options.request) request(defaults({ authorize: true }, this.options), updatesUrl, payloadUpdate, doneOne);
			else {
				const info = getCustomRequestInfo(updatesUrl, defaults({ authorize: true }, this.options), payloadUpdate);
				handleCustomRequest(this.options, info, doneOne);
			}
		}
		write(lng, namespace) {
			if (getPath(this.queuedWrites, [
				"locks",
				lng,
				namespace
			])) return;
			const missings = getPath(this.queuedWrites, [lng, namespace]);
			setPath(this.queuedWrites, [lng, namespace], []);
			const pageSize = 1e3;
			const clbs = missings.filter((m) => m.callback).map((missing) => missing.callback);
			if (missings.length) {
				setPath(this.queuedWrites, [
					"locks",
					lng,
					namespace
				], true);
				const namespaceSaved = () => {
					setPath(this.queuedWrites, [
						"locks",
						lng,
						namespace
					], false);
					clbs.forEach((clb) => clb());
					if (this.options.onSaved) this.options.onSaved(lng, namespace);
					this.debouncedProcess(lng, namespace);
				};
				const amountOfPages = missings.length / pageSize;
				let pagesDone = 0;
				let page = missings.splice(0, pageSize);
				this.writePage(lng, namespace, page, () => {
					pagesDone++;
					if (pagesDone >= amountOfPages) namespaceSaved();
				});
				while (page.length === pageSize) {
					page = missings.splice(0, pageSize);
					if (page.length) this.writePage(lng, namespace, page, () => {
						pagesDone++;
						if (pagesDone >= amountOfPages) namespaceSaved();
					});
				}
			}
		}
		process() {
			Object.keys(this.queuedWrites).forEach((lng) => {
				if (lng === "locks") return;
				Object.keys(this.queuedWrites[lng]).forEach((ns) => {
					if (this.queuedWrites[lng][ns].length) this.write(lng, ns);
				});
			});
		}
		queue(lng, namespace, key, fallbackValue, callback, options) {
			pushPath(this.queuedWrites, [lng, namespace], {
				key,
				fallbackValue: fallbackValue || "",
				callback,
				options
			});
			this.debouncedProcess();
		}
	};
	I18NextLocizeBackend.type = "backend";
	//#endregion
	return I18NextLocizeBackend;
})();
