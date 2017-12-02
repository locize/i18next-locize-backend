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
    window.console && console.log(e);
  }
};

function getDefaults() {
  return {
    loadPath: 'https://api.locize.io/{{projectId}}/{{version}}/{{lng}}/{{ns}}',
    getLanguagesPath: 'https://api.locize.io/languages/{{projectId}}',
    addPath: 'https://api.locize.io/missing/{{projectId}}/{{version}}/{{lng}}/{{ns}}',
    updatePath: 'https://api.locize.io/update/{{projectId}}/{{version}}/{{lng}}/{{ns}}',
    referenceLng: 'en',
    crossDomain: true,
    setContentTypeJSON: false,
    version: 'latest'
  };
}

class Backend {
  constructor(services, options = {}) {
    this.init(services, options);

    this.type = 'backend';
  }

  init(services, options = {}) {
    this.services = services;
    this.options = { ...getDefaults(), ...this.options, ...options };

    this.queuedWrites = {};
    this.debouncedWrite = utils.debounce(this.write, 10000);
  }

  getLanguages(callback) {
    let url = this.services.interpolator.interpolate(this.options.getLanguagesPath, { projectId: this.options.projectId });

    this.loadUrl(url, callback);
  }

  read(language, namespace, callback) {
    let url = this.services.interpolator.interpolate(this.options.loadPath, { lng: language, ns: namespace, projectId: this.options.projectId, version: this.options.version });

    this.loadUrl(url, callback);
  }

  loadUrl(url, callback) {
    ajax(url, this.options, (data, xhr) => {
      if (xhr.status >= 500 && xhr.status < 600) return callback('failed loading ' + url, true /* retry */);
      if (xhr.status >= 400 && xhr.status < 500) return callback('failed loading ' + url, false /* no retry */);

      let ret, err;
      try {
        ret = JSON.parse(data);
      } catch (e) {
        err = 'failed parsing ' + url + ' to json';
      }
      if (err) return callback(err, false);
      callback(null, ret);
    });
  }

  create(languages, namespace, key, fallbackValue, callback, options) {
    if (!callback) callback = () => {};
    if (typeof languages === 'string') languages = [languages];

    languages.forEach(lng => {
      if (lng === this.options.referenceLng) this.queue.call(this, this.options.referenceLng, namespace, key, fallbackValue, callback, options);
    });
  }

  update(languages, namespace, key, fallbackValue, callback, options) {
    if (!callback) callback = () => {};
    if (!options) options = {};
    if (typeof languages === 'string') languages = [languages];

    // mark as update
    options.isUpdate = true;

    languages.forEach(lng => {
      if (lng === this.options.referenceLng) this.queue.call(this, this.options.referenceLng, namespace, key, fallbackValue, callback, options);
    });
  }

  write(lng, namespace) {
    let lock = utils.getPath(this.queuedWrites, ['locks', lng, namespace]);
    if (lock) return;

    let missingUrl = this.services.interpolator.interpolate(this.options.addPath, { lng: lng, ns: namespace, projectId: this.options.projectId, version: this.options.version });
    let updatesUrl = this.services.interpolator.interpolate(this.options.updatePath, { lng: lng, ns: namespace, projectId: this.options.projectId, version: this.options.version });

    let missings = utils.getPath(this.queuedWrites, [lng, namespace]);
    utils.setPath(this.queuedWrites, [lng, namespace], []);

    if (missings.length) {
      // lock
      utils.setPath(this.queuedWrites, ['locks', lng, namespace], true);

      let hasMissing= false;
      let hasUpdates = false;
      const payloadMissing = {};
      const payloadUpdate = {};

      missings.forEach(item => {
        if (item.options && item.options.isUpdate) {
          if (!hasUpdates) hasUpdates = true;
          payloadUpdate[item.key] = item.fallbackValue || '';
        } else {
          if (!hasMissing) hasMissing = true;
          payloadMissing[item.key] = item.fallbackValue || '';
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

          missings.forEach((missing) => {
            if (missing.callback) missing.callback();
          });

          // rerun
          this.debouncedWrite(lng, namespace);
        }
      }

      if (!todo) doneOne();

      if (hasMissing) {
        ajax(missingUrl, { ...{ authorize: true }, ...this.options }, (data, xhr) => {
          //const statusCode = xhr.status.toString();
          // TODO: if statusCode === 4xx do log

          doneOne();
        }, payloadMissing);
      }

      if (hasUpdates) {
        ajax(updatesUrl, { ...{ authorize: true }, ...this.options }, (data, xhr) => {
          //const statusCode = xhr.status.toString();
          // TODO: if statusCode === 4xx do log

          doneOne();
        }, payloadUpdate);
      }

    }
  }

  queue(lng, namespace, key, fallbackValue, callback, options) {
    utils.pushPath(this.queuedWrites, [lng, namespace], {key: key, fallbackValue: fallbackValue || '', callback: callback, options});

    this.debouncedWrite(lng, namespace);
  }
}

Backend.type = 'backend';


export default Backend;
