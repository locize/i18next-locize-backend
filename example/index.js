const i18next = require('i18next')
const LocizeBackend = require('../cjs/index.js')
// const LocizeBackend = require('i18next-locize-backend')

const yourOptions = {
  debug: true,
  saveMissing: true,
  preload: ['en', 'de'],
  fallbackLng: 'en',
  lng: 'en',
  backend: {
    referenceLng: 'en',
    projectId: '49fb5220-dfc0-47bb-987c-b737524d76af',
    apiKey: '3dc91839-ca3e-440d-a1a3-ce52ebfd12e3'
    // version: 'staging',
    // loadPath: 'https://api.locize.app/2596e805-2ce2-4e21-9481-ee62202ababd/{{version}}/{{lng}}/{{ns}}',
    // addPath: 'https://api.locize.app/missing/2596e805-2ce2-4e21-9481-ee62202ababd/{{version}}/{{lng}}/{{ns}}'
  }
}

i18next.use(LocizeBackend)
i18next.init(yourOptions)

// const backend = new LocizeBackend({
//   projectId: '2596e805-2ce2-4e21-9481-ee62202ababd',
//   apiKey: '3f608f6f-7b4a-4d7f-8374-13dcd31ecf86',
//   // version: 'staging',
//   // referenceLng -> not needed as will be loaded from API
// }, (err, opts) => {
//   console.log(opts)
//   i18next
//     .use(backend)
//     .init({ ...opts, ...yourOptions}) // yourOptions should not include backendOptions!
// })

setInterval(function () {
  console.log(i18next.t('translation:All', { lng: 'en' }))
}, 15000)
