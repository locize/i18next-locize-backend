const i18next = require('i18next')
const ChainedBackend = require('i18next-chained-backend')
const LocizeBackend = require('../../cjs/index.js')
// const LocizeBackend = require('i18next-locize-backend')

i18next
  .use(ChainedBackend)
  .init({
    debug: true,
    preload: ['en', 'de'],
    ns: ['translation', 'landingpage'],
    fallbackLng: 'en',
    lng: 'en',
    backend: {
      backends: [
        LocizeBackend,
        LocizeBackend
      ],
      backendOptions: [
        {
          referenceLng: 'en',
          projectId: '49fb5220-dfc0-47bb-987c-b737524d76af'
        },
        {
          referenceLng: 'en',
          projectId: '3d0aa5aa-4660-4154-b6d9-907dbef10bb2'
        }
      ]
    }
  }, (err, t) => {
    if (err) return console.error(err)
    console.log(t('All', { ns: 'translation', lng: 'en' }))
    console.log(t('All', { ns: 'translation', lng: 'de' }))

    console.log(t('Features', { ns: 'landingpage', lng: 'en' }))
    console.log(t('Features', { ns: 'landingpage', lng: 'de' }))
  })
