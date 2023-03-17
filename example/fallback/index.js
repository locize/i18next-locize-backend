const i18next = require('i18next')
const ChainedBackend = require('i18next-chained-backend')
const LocizeBackend = require('../../cjs/index.js')
// const LocizeBackend = require('i18next-locize-backend')
const resourcesToBackend = require('i18next-resources-to-backend')

i18next
  .use(ChainedBackend)
  .init({
    debug: true,
    preload: ['en', 'de'],
    ns: ['landingpage'],
    fallbackLng: 'en',
    lng: 'en',
    backend: {
      backends: [
        LocizeBackend,
        resourcesToBackend({
          en: {
            landingpage: {
              Features: 'Features from fallback'
            }
          },
          de: {
            landingpage: {
              Features: 'Funktionen aus dem Fallback'
            }
          }
        })
      ],
      backendOptions: [
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

    // with internet connectivity it returns => "Features" and "Funktionen"
    // without internet connectivity it returns => "Features from fallback" and "Funktionen aus dem Fallback"
  })
