[![Actions](https://github.com/locize/i18next-locize-backend/workflows/node/badge.svg)](https://github.com/locize/i18next-locize-backend/actions?query=workflow%3Anode)
[![Travis](https://img.shields.io/travis/locize/i18next-locize-backend/master.svg?style=flat-square)](https://travis-ci.org/locize/i18next-locize-backend)
[![npm version](https://img.shields.io/npm/v/i18next-locize-backend.svg?style=flat-square)](https://www.npmjs.com/package/i18next-locize-backend)
[![David](https://img.shields.io/david/locize/i18next-locize-backend.svg?style=flat-square)](https://david-dm.org/locize/i18next-locize-backend)

This is an [i18next backend plugin](https://www.i18next.com/principles/plugins) to be used for [locize](http://locize.com) service. It will load resources from locize server using http fetch or xhr as fallback.

If you're not familiar with i18next and how i18next backend plugins works, please first have a look at the [i18next documentation](https://www.i18next.com/how-to/add-or-load-translations#load-using-a-backend-plugin).

It will allow you to save missing keys containing both **default value** and **context information** by calling:

```js
i18next.t(key, defaultValue, tDescription);
i18next.t(key, { defaultValue, tDescription });
```

## Advice:

To see i18next-locize-backend in a working app example, you may have a look at:

- [this react-tutorial](https://github.com/locize/react-tutorial) starting from [Step 2](https://github.com/locize/react-tutorial#step-2---use-the-locize-cdn)
- [this guide](https://locize.com/blog/how-to-internationalize-react-i18next) starting from the step of [replacing i18next-http-backend with i18next-locize-backend](https://locize.com/blog/how-to-internationalize-react-i18next/#how-look)
- [this Angular blog post](https://locize.com/blog/unleash-the-full-power-of-angular-i18next) [introducing i18next-locize-backend](https://locize.com/blog/unleash-the-full-power-of-angular-i18next/#how-look)
- [the code integration part](https://www.youtube.com/watch?v=ds-yEEYP1Ks&t=423s) in this [YouTube video](https://www.youtube.com/watch?v=ds-yEEYP1Ks)

# Troubleshooting

Make sure you set the `debug` option of i18next to `true`. This will maybe log more information in the developer console.

**SaveMissing is not working**

Did you wait 5-10 seconds before refreshing the locize UI? It may take a couple of seconds until the missing keys are sent and saved.

Per default only `localhost` is allowed to send missing keys ([or update missing keys](https://www.i18next.com/overview/configuration-options#missing-keys)) (to avoid using this feature accidentally [in production](https://docs.locize.com/guides-tips-and-tricks/going-production)). If you're not using `localhost` during development you will have to set the `allowedAddOrUpdateHosts: ['your.domain.tld']` for the [backend options](https://github.com/locize/i18next-locize-backend#backend-options).


**Loading translations not working**

Make sure the translations are published, either by having enabled auto publishing for your version or by [manually publishing](https://docs.locize.com/more/general-questions/how-to-manually-publish-a-specific-version) the version. Alternatively, you can publish via [CLI](https://github.com/locize/locize-cli#publish-version) or directly by consuming the [API](https://docs.locize.com/integration/api#publish-version).

In case you're using the private publish mode, make sure you're using the correct api key and are setting the `private` option to `true`.

```javascript
import i18next from "i18next";
import Locize from "i18next-locize-backend";

i18next.use(Locize).init({
  backend: {
    projectId: "[PROJECTID]",
    apiKey: "[APIKEY]",
    version: "[VERSION]",
    private: true,
    referenceLng: "en"
  }
});
```


**On server side: process is not exiting**

In case you want to use i18next-locize-backend on server side for a short running process, you might want to set the `reloadInterval` option to `false`:

```javascript
{
  reloadInterval: false,
  projectId: "[PROJECTID]",
  version: 'latest',
  referenceLng: 'en',
}
```

# Getting started

Source can be loaded via [npm](https://www.npmjs.com/package/i18next-locize-backend), `yarn`, `bower` or [downloaded](https://cdn.rawgit.com/locize/i18next-locize-backend/master/i18nextLocizeBackend.min.js) from this repo.

```bash
# npm package
$ npm install i18next-locize-backend

# yarn
$ yarn add i18next-locize-backend

# bower
$ bower install i18next-locize-backend
```

Wiring up:

```js
import i18next from 'i18next';
import Locize from 'i18next-locize-backend';
// or
const i18next = require('i18next');
const Locize = require('i18next-locize-backend');

i18next.use(Locize).init(i18nextOptions);
```

for Deno:

```js
import i18next from 'https://deno.land/x/i18next/index.js'
import Backend from 'https://deno.land/x/i18next_locize_backend/index.js'

i18next.use(Backend).init(i18nextOptions);
```

- As with all modules you can either pass the constructor function (class) to the i18next.use or a concrete instance.
- If you don't use a module loader it will be added to `window.i18nextLocizeBackend`

## Backend Options

**IMPORTANT** make sure you do not add your apiKey in the production build to avoid misuse by strangers

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
  private: false,

  // hostnames that are allowed to create, update keys
  // please keep those to your local system, staging, test servers (not production)
  // can be array of allowed hosts or a function (hostname) => { return true; // or false if not allowed }
  allowedAddOrUpdateHosts: ['localhost'],

  // optional event triggered on saved to backend
  onSaved: (lng, ns) => { ... },

  // can be used to reload resources in a specific interval (useful in server environments)
  reloadInterval: typeof window !== 'undefined' ? false : 60 * 60 * 1000,
  
  // define the threshold for languages to be added to supportedLngs (eg: 1 = 100% translated, 0.9 = 90% translated [default]).
  translatedPercentageThreshold: 0.8,

  // define a custom request function
  // can be used to support Angular http client
  //
  // 'info' contains 'url', 'method', 'body' and 'headers'
  //   'url' the url that should be requested
  //   'method' GET for fetching translations and POST for saving missing translations
  //   'body' will be a key:value object used when saving missing translations
  //   'headers' will be a key:value object containing the header information that should be sent
  // 'callback' is a function that takes two parameters, 'err' and 'res'.
  //            'err' should be an error
  //            'res' should be an object with a 'status' property and a 'data' property containing a stringified object instance beeing the key:value translation pairs for the
  //            requested language and namespace, or null in case of an error.
  request: function (info, callback) {},
  // or async / promise
  //request: async (info) {},
}
```

To load translations only `projectId` needs to be filled. To use the **saveMissing** feature of i18next additional to the projectId both `apiKey` and `referenceLng` have to be set.

Options can be passed in:

**preferred** - by setting options.backend in i18next.init:

```js
import i18next from "i18next";
import Locize from "i18next-locize-backend";

i18next.use(Locize).init({
  backend: options
});
```

on construction:

```js
import Locize from "i18next-locize-backend";
const locize = new Locize(options);
```

via calling init:

```js
import Locize from "i18next-locize-backend";
const locize = new Locize();
locize.init(options);
```

## Additional API endpoints

### backend.getLanguages

Will return a list of all languages in your project including percentage of translations done per version.

```js
import Locize from "i18next-locize-backend";
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
const data = await locize.getLanguages();

// or
i18next.services.backendConnector.backend.getLanguages(callback);

// or
const data = await i18next.services.backendConnector.backend.getLanguages();
```

### backend.getOptions

Will return an object containing useful informations for the i18next init options.

```js
import Locize from "i18next-locize-backend";
const locize = new Locize(options);

locize.getOptions((err, data) => {
  /*
  data is:

  {
    fallbackLng: 'en',
    referenceLng: 'en',
    supportedLngs: ['en', 'de'],
    load: 'languageOnly|all' // depending on your supportedLngs has locals having region like en-US
  }
  */
});

// or
const data = await locize.getOptions();

// or
i18next.services.backendConnector.backend.getOptions(callback);

// or
const data = await i18next.services.backendConnector.backend.getOptions();
```

You can set a threshold for languages to be added to supportedLngs by setting translatedPercentageThreshold in backend options (eg: 1 = 100% translated, 0.9 = 90% translated).

## SPECIAL - let the backend determine some options to improve loading

You can load some information from the backend to eg. set supportedLngs for i18next just supporting languages you got in your locize project.

You will get i18next options for (same as above backend.getOptions):

- fallbackLng
- supportedLngs
- load

```js
import i18next from "i18next";
import Locize from "i18next-locize-backend";

const locize = new Locize(
  {
    projectId: "[PROJECTID]",
    apiKey: "[APIKEY]",
    version: "[VERSION]"
    // referenceLng -> not needed as will be loaded from API
  },
  (err, opts, lngs) => {
    i18next.use(locize).init({ ...opts, ...yourOptions }); // yourOptions should not include backendOptions!
  }
);
```

### Special usage with react-i18next without using Suspense

Use `setI18n` to pass in the i18next instance before initializing:

```js
import i18n from "i18next";
import { initReactI18next, setI18n } from "react-i18next";
import LocizeBackend from "i18next-locize-backend";

const backendOptions = {
  projectId: "1d0aa5aa-4660-4154-b6d9-907dbef10bb3"
};

const yourOptions = {
  debug: true,
  interpolation: {
    escapeValue: false
  },
  react: {
    useSuspense: false
  }
};

// this is only used if not using suspense
i18n.options.react = yourOptions.react;
setI18n(i18n);

const backend = new LocizeBackend(backendOptions, (err, opts) => {
  if (err) return console.error(err);
  i18n
    .use(backend)
    // .use(initReactI18next) // keep this if using suspense
    // yourOptions should not include backendOptions!
    .init({ ...opts, ...yourOptions }, (err, t) => {
      if (err) return console.error(err);
    });
});

export default i18n;
```

## IMPORTANT ADVICE FOR SERVERLESS environments - AWS lambda, Google Cloud Functions, Azure Functions, etc...

<font color="red">
  <b>Please be aware</b>
</font>

Due to how serverless functions work, you cannot guarantee that a cached version of your data is available. Serverless functions are short-lived, and can shut down at any time, purging any in-memory or filesystem cache. This may be an acceptable trade-off, but sometimes it isn't acceptable.

**Because of this we suggest to download the translations in your CI/CD pipeline (via [cli](https://github.com/locize/locize-cli#download-current-published-files) or via [api](https://docs.locize.com/integration/api#list-all-namespace-resources)) and package them with your serverless function.**

### For example with [i18next-fs-backend](https://github.com/i18next/i18next-fs-backend)

```js
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';

const backend = new Backend({
  // path where resources get loaded from
  loadPath: '/locales/{{lng}}/{{ns}}.json'
});

i18next
  .use(backend)
  .init({
    // initImmediate: false, // setting initImediate to false, will load the resources synchronously
    ...opts,
    ...yourOptions
  }); // yourOptions should not include backendOptions!
```

### or just [import/require](https://www.i18next.com/how-to/add-or-load-translations#add-on-init) your files directly

```js
import i18next from 'i18next';
import en from './locales/en.json'
import de from './locales/de.json'

i18next
  .init({
    ...opts,
    ...yourOptions,
    resources: {
      en,
      de
    }
  });
```
## TypeScript

To properly type the backend options, you can import the `LocizeBackendOptions` interface and use it as a generic type parameter to the i18next's `init` method, e.g.:

```ts
import i18n from 'i18next'
import LocizeBackend, { LocizeBackendOptions } from 'i18next-locize-backend'

i18n
  .use(LocizeBackend)
  .init<LocizeBackendOptions>({
    backend: {
      // locize backend options
    },

    // other i18next options
  })
```