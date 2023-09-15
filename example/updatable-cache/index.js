const i18next = require('i18next')
const ChainedBackend = require('i18next-chained-backend')
const LocizeBackend = require('i18next-locize-backend')
// const LocizeBackend = require('../../cjs/index.js')
const FSBackend = require('i18next-fs-backend')

i18next
  .use(ChainedBackend)
  .init({
    debug: true,
    preload: ['en', 'de'],
    ns: ['landingpage'],
    fallbackLng: 'en',
    lng: 'en',
    backend: {
      cacheHitMode: 'refreshAndUpdateStore',
      // cacheHitMode: 'none' // (default)
      // cacheHitMode: 'refresh' // tries to refresh the cache by loading from the next backend and updates the cache
      // cacheHitMode: 'refreshAndUpdateStore' // tries to refresh the cache by loading from the next backend, updates the cache and also update the i18next resource store
      // refreshExpirationTime: 30 * 1000, // only after 30 seconds it should trigger a refresh if necessary
      backends: [
        FSBackend,
        LocizeBackend
      ],
      backendOptions: [
        {
          loadPath: 'cache/{{lng}}/{{ns}}.json',
          addPath: 'cache/{{lng}}/{{ns}}.json'
        },
        {
          referenceLng: 'en',
          projectId: '3d0aa5aa-4660-4154-b6d9-907dbef10bb2'
        }
      ]
    }
  }, (err, t) => {
    if (err) return console.error(err)
    console.log(t('Features', { ns: 'landingpage', lng: 'en' }))
    console.log(t('Features', { ns: 'landingpage', lng: 'de' }))

    // on first usage, it will show the cached translations
    // but afterwards it will update the cache and show the new translations
    setTimeout(() => {
      console.log(t('Features', { ns: 'landingpage', lng: 'en' }))
      console.log(t('Features', { ns: 'landingpage', lng: 'de' }))
    }, 2000)
  })
