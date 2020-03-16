import * as utils from './utils';

// https://gist.github.com/Xeoncross/7663273
function ajax(url, options, callback, data, cache) {
  try {
    var x = new (XMLHttpRequest || ActiveXObject)('MSXML2.XMLHTTP.3.0');
    x.open(data ? 'POST' : 'GET', url, 1);
    if (!options.crossDomain) {
      x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    }
    if (options.authorize && options.apiKey) {
      x.setRequestHeader('Authorization', options.apiKey);
    }
    if (data || options.setContentTypeJSON) {
      x.setRequestHeader('Content-type', 'application/json');
    }
    x.onreadystatechange = function() {
      x.readyState > 3 && callback && callback(x.responseText, x);
    };
    x.send(JSON.stringify(data));
  } catch (e) {
    typeof window !== 'undefined' && window.console && console.log(e);
  }
}

function getDefaults() {
  return {
    loadPath: 'https://api.locize.app/{{projectId}}/{{version}}/{{lng}}/{{ns}}',
    privatePath:
      'https://api.locize.app/private/{{projectId}}/{{version}}/{{lng}}/{{ns}}',
    getLanguagesPath: 'https://api.locize.app/languages/{{projectId}}',
    addPath:
      'https://api.locize.app/missing/{{projectId}}/{{version}}/{{lng}}/{{ns}}',
    updatePath:
      'https://api.locize.app/update/{{projectId}}/{{version}}/{{lng}}/{{ns}}',
    referenceLng: 'en',
    crossDomain: true,
    setContentTypeJSON: false,
    version: 'latest',
    private: false,
    whitelistThreshold: 0.9,
    failLoadingOnEmptyJSON: false, // useful if using chained backend
    allowedAddOrUpdateHosts: ['localhost'],
    onSaved: false
  };
}

class I18NextLocizeBackend {
  constructor(services, options, callback) {
    if (services && services.projectId) {
      this.init(null, services, {}, options);
    } else {
      this.init(null, options, {}, callback);
    }

    this.type = 'backend';
  }

  init(services, options = {}, i18nextOptions, callback) {
    this.options = { ...getDefaults(), ...this.options, ...options }; // initial
    this.services = services;

    if (this.options.pull)
      console.warn(
        'The pull API was removed use "private: true" option instead: https://docs.locize.com/integration/api#fetch-private-namespace-resources'
      );

    const hostname = typeof window !== 'undefined' && window.location && window.location.hostname;
    if (hostname) {
      this.isAddOrUpdateAllowed = typeof this.options.allowedAddOrUpdateHosts === 'function' ?this.options.allowedAddOrUpdateHosts(hostname) : this.options.allowedAddOrUpdateHosts.indexOf(hostname) > -1;

      if (i18nextOptions.saveMissing && !this.isAddOrUpdateAllowed)
        services &&
          services.logger &&
            services.logger.warn(
              typeof this.options.allowedAddOrUpdateHosts === 'function' ?
                `locize-backend: will not save missings because allowedAddOrUpdateHosts returned false for the host "${hostname}".` :
                `locize-backend: will not save missings because the host "${hostname}" was not in the list of allowedAddOrUpdateHosts: ${this.options.allowedAddOrUpdateHosts.join(
                  ', '
                )} (matches need to be exact).`
            );
    } else {
      this.isAddOrUpdateAllowed = true;
    }

    if (typeof callback === 'function') {
      this.getOptions((err, opts) => {
        if (err) return callback(err);

        this.options.referenceLng =
          options.referenceLng ||
          opts.referenceLng ||
          this.options.referenceLng;
        callback(null, opts);
      });
    }

    this.queuedWrites = {};
    this.debouncedProcess = utils.debounce(this.process, 10000);
  }

  getLanguages(callback) {
    const isMissing = utils.isMissingOption(this.options, ['projectId'])
    if (isMissing) return callback(new Error(isMissing));

    let url = utils.interpolate(this.options.getLanguagesPath, {
      projectId: this.options.projectId
    });

    this.loadUrl(url, {}, callback);
  }

  getOptions(callback) {
    this.getLanguages((err, data) => {
      if (err) return callback(err);
      const keys = Object.keys(data);
      if (!keys.length)
        return callback(new Error('was unable to load languages via API'));

      const referenceLng = keys.reduce((mem, k) => {
        const item = data[k];
        if (item.isReferenceLanguage) mem = k;
        return mem;
      }, '');

      const whitelist = keys.reduce((mem, k) => {
        const item = data[k];
        if (
          item.translated[this.options.version] &&
          item.translated[this.options.version] >=
            this.options.whitelistThreshold
        )
          mem.push(k);
        return mem;
      }, []);

      const hasRegion = keys.reduce((mem, k) => {
        if (k.indexOf('-') > -1) return true;
        return mem;
      }, false);

      callback(null, {
        fallbackLng: referenceLng,
        referenceLng,
        whitelist,
        load: hasRegion ? 'all' : 'languageOnly'
      });
    });
  }

  read(language, namespace, callback) {
    let url;
    let options = {};
    if (this.options.private) {
      const isMissing = utils.isMissingOption(this.options, ['projectId', 'version', 'apiKey'])
      if (isMissing) return callback(new Error(isMissing), false);

      url = utils.interpolate(this.options.privatePath, {
        lng: language,
        ns: namespace,
        projectId: this.options.projectId,
        version: this.options.version
      });
      options = { authorize: true };
    } else {
      const isMissing = utils.isMissingOption(this.options, ['projectId', 'version'])
      if (isMissing) return callback(new Error(isMissing), false);

      url = utils.interpolate(this.options.loadPath, {
        lng: language,
        ns: namespace,
        projectId: this.options.projectId,
        version: this.options.version
      });
    }

    this.loadUrl(url, options, callback);
  }

  loadUrl(url, options, callback) {
    ajax(url, { ...this.options, ...options }, (data, xhr) => {
      if (xhr.status === 408 || xhr.status === 400) // extras for timeouts on cloudfront
        return callback('failed loading ' + url, true /* retry */);
      if (xhr.status >= 500 && xhr.status < 600)
        return callback('failed loading ' + url, true /* retry */);
      if (xhr.status >= 400 && xhr.status < 500)
        return callback('failed loading ' + url, false /* no retry */);

      let ret, err;
      try {
        ret = JSON.parse(data);
      } catch (e) {
        err = 'failed parsing ' + url + ' to json';
      }
      if (err) return callback(err, false);
      if (this.options.failLoadingOnEmptyJSON && !Object.keys(ret).length)
        return callback('loaded result empty for ' + url, false);
      callback(null, ret);
    });
  }

  create(languages, namespace, key, fallbackValue, callback, options) {
    if (!callback) callback = () => {};

    // missing options
    const isMissing = utils.isMissingOption(this.options, ['projectId', 'version', 'apiKey', 'referenceLng'])
    if (isMissing) return callback(new Error(isMissing));

    // unallowed host
    if (!this.isAddOrUpdateAllowed)
      return callback('host is not allowed to create key.');

    if (typeof languages === 'string') languages = [languages];

    if (languages.filter(l => l === this.options.referenceLng).length < 1) {
      this.services &&
        this.services.logger &&
        this.services.logger.warn(
          `locize-backend: will not save missings because the reference language "${
            this.options.referenceLng
          }" was not in the list of to save languages: ${languages.join(
            ', '
          )} (open your site in the reference language to save missings).`
        );
    }

    languages.forEach(lng => {
      if (lng === this.options.referenceLng)
        this.queue.call(
          this,
          this.options.referenceLng,
          namespace,
          key,
          fallbackValue,
          callback,
          options
        );
    });
  }

  update(languages, namespace, key, fallbackValue, callback, options) {
    if (!callback) callback = () => {};

    // missing options
    const isMissing = utils.isMissingOption(this.options, ['projectId', 'version', 'apiKey', 'referenceLng'])
    if (isMissing) return callback(new Error(isMissing));

    if (!this.isAddOrUpdateAllowed)
      return callback('host is not allowed to update key.');

    if (!options) options = {};
    if (typeof languages === 'string') languages = [languages];

    // mark as update
    options.isUpdate = true;

    languages.forEach(lng => {
      if (lng === this.options.referenceLng)
        this.queue.call(
          this,
          this.options.referenceLng,
          namespace,
          key,
          fallbackValue,
          callback,
          options
        );
    });
  }

  write(lng, namespace) {
    let lock = utils.getPath(this.queuedWrites, ['locks', lng, namespace]);
    if (lock) return;

    let missingUrl = utils.interpolate(this.options.addPath, {
      lng: lng,
      ns: namespace,
      projectId: this.options.projectId,
      version: this.options.version
    });
    let updatesUrl = utils.interpolate(this.options.updatePath, {
      lng: lng,
      ns: namespace,
      projectId: this.options.projectId,
      version: this.options.version
    });

    let missings = utils.getPath(this.queuedWrites, [lng, namespace]);
    utils.setPath(this.queuedWrites, [lng, namespace], []);

    if (missings.length) {
      // lock
      utils.setPath(this.queuedWrites, ['locks', lng, namespace], true);

      let hasMissing = false;
      let hasUpdates = false;
      const payloadMissing = {};
      const payloadUpdate = {};

      missings.forEach(item => {
        const value =
          item.options && item.options.tDescription
            ? {
                value: item.fallbackValue || '',
                context: { text: item.options.tDescription }
              }
            : item.fallbackValue || '';
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
      const doneOne = () => {
        todo--;

        if (!todo) {
          // unlock
          utils.setPath(this.queuedWrites, ['locks', lng, namespace], false);

          missings.forEach(missing => {
            if (missing.callback) missing.callback();
          });

          // emit notification onSaved
          if (this.options.onSaved) this.options.onSaved(lng, namespace);

          // rerun
          this.debouncedProcess(lng, namespace);
        }
      };

      if (!todo) doneOne();

      if (hasMissing) {
        ajax(
          missingUrl,
          { ...{ authorize: true }, ...this.options },
          (data, xhr) => {
            //const statusCode = xhr.status.toString();
            // TODO: if statusCode === 4xx do log

            doneOne();
          },
          payloadMissing
        );
      }

      if (hasUpdates) {
        ajax(
          updatesUrl,
          { ...{ authorize: true }, ...this.options },
          (data, xhr) => {
            //const statusCode = xhr.status.toString();
            // TODO: if statusCode === 4xx do log

            doneOne();
          },
          payloadUpdate
        );
      }
    }
  }

  process() {
    Object.keys(this.queuedWrites).forEach(lng => {
      if (lng === 'locks') return;
      Object.keys(this.queuedWrites[lng]).forEach(ns => {
        const todo = this.queuedWrites[lng][ns];
        if (todo.length) {
          this.write(lng, ns);
        }
      });
    });
  }

  queue(lng, namespace, key, fallbackValue, callback, options) {
    utils.pushPath(this.queuedWrites, [lng, namespace], {
      key: key,
      fallbackValue: fallbackValue || '',
      callback: callback,
      options
    });

    this.debouncedProcess();
  }
}

I18NextLocizeBackend.type = 'backend';

export default I18NextLocizeBackend;
