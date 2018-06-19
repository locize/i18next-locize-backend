[![Travis](https://img.shields.io/travis/locize/i18next-locize-backend/master.svg?style=flat-square)](https://travis-ci.org/locize/i18next-locize-backend)
[![npm version](https://img.shields.io/npm/v/i18next-locize-backend.svg?style=flat-square)](https://www.npmjs.com/package/i18next-locize-backend)
[![Bower](https://img.shields.io/bower/v/i18next-locize-backend.svg)]()
[![David](https://img.shields.io/david/locize/i18next-locize-backend.svg?style=flat-square)](https://david-dm.org/locize/i18next-locize-backend)

This is an i18next backend to be used for [locize](http://locize.com) service. It will load resources from locize server using xhr.

It will allow you to save missing keys containing both **default value** and **context information** by calling:

```js
i18next.t(key, defaultValue, tDescription);
i18next.t(key, { defaultValue, tDescription });
```

# Getting started

Source can be loaded via [npm](https://www.npmjs.com/package/i18next-locize-backend), bower or [downloaded](https://cdn.rawgit.com/locize/i18next-locize-backend/master/i18next-locize-backend.min.js) from this repo.

```
# npm package
$ npm install i18next-locize-backend

# bower
$ bower install i18next-locize-backend
```

Wiring up:

```js
import i18next from 'i18next';
import Locize from 'i18next-locize-backend';

i18next
  .use(Locize)
  .init(i18nextOptions);
```

- As with all modules you can either pass the constructor function (class) to the i18next.use or a concrete instance.
- If you don't use a module loader it will be added to `window.i18nextLocizeBackend`


## Backend Options

```js
{
  // the id of your locize project
  projectId: '[PROJECTID]',

  // add an api key if you want to send missing keys
  apiKey: '[APIKEY]',

  // the reference language of your project
  referenceLng: '[LNG]',

  // version - defaults to latest
  version: '[VERSION]',

  // private - set to true if you version on locize is set to use private publish
  private: false
}
```

To load translations only `projectId` needs to be filled. To use the **saveMissing** feature of i18next additional to the projectId both `apiKey` and `referenceLng` have to be set.

Options can be passed in:

**preferred** - by setting options.backend in i18next.init:

```js
import i18next from 'i18next';
import Locize from 'i18next-locize-backend';

i18next
  .use(Locize)
  .init({
    backend: options
  });
```

on construction:

```js
  import Locize from 'i18next-locize-backend';
  const locize = new Locize(options);
```

via calling init:

```js
  import Locize from 'i18next-locize-backend';
  const locize = new Locize();
  locize.init(options);
```

## Additional API endpoints

### backend.getLanguages

Will return a list of all languages in your project including percentage of translations done per version.

```js
import Locize from 'i18next-locize-backend';
const locize = new Locize(options);

locize.getLanguages((err, data) => {
  /*
  data is:

  {
    "en": {
      "name": "English",
      "nativeName": "English",
      "isReferenceLanguage": true,
      "translated": {
        "latest": 1
      }
    },
    "de": {
      "name": "German",
      "nativeName": "Deutsch",
      "isReferenceLanguage": false,
      "translated": {
        "latest": 0.9
      }
    }
  }
  */
});

// or
i18next.services.backendConnector.backend.getLanguages(callback);
```

### backend.getOptions

Will return an object containing useful informations for the i18next init options.

```js
import Locize from 'i18next-locize-backend';
const locize = new Locize(options);

locize.getOptions((err, data) => {
  /*
  data is:

  {
    fallbackLng: 'en',
    referenceLng: 'en',
    whitelist: ['en', 'de'],
    load: 'languageOnly|all' // depending on your whitelist has locals having region like en-US
  }
  */
});

// or
i18next.services.backendConnector.backend.getOptions(callback);
```

You can set a threshold for languages to be added to whitelist by setting whitelistThreshold in backend options (eg: 1 = 100% translated, 0.9 = 90% translated).

## SPECIAL - let the backend determine some options to improve loading

You can load some information from the backend to eg. set whitelist for i18next just supporting languages you got in your locize project.

You will get i18next options for (same as above backend.getOptions):

- fallbackLng
- whitelist
- load

```js
import i18next from 'i18next';
import Locize from 'i18next-locize-backend';

const locize = new Locize({
  projectId: '[PROJECTID]',
  apiKey: '[APIKEY]',
  version: '[VERSION]',
  // referenceLng -> not needed as will be loaded from API
}, (err, opts) => {
  i18next
    .use(locize)
    .init({ ...opts, ...yourOptions}); // yourOptions should not include backendOptions!
});
```
