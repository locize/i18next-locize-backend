const i18next = require('i18next')
const LocizeBackend = require('../../cjs/index.js')
// const LocizeBackend = require('i18next-locize-backend')

const yourOptions = {
  debug: true,
  ns: 'landingpage',
  defaultNS: 'landingpage',
  backend: {
    projectId: '3d0aa5aa-4660-4154-b6d9-907dbef10bb2'
    // apiKey: '3dc91839-ca3e-440d-a1a3-ce52ebfd12e3'
    // version: 'staging',
    // referenceLng -> not needed as will be loaded from API
  }
}

const backend = new LocizeBackend(
  yourOptions.backend,
  (err, opts) => {
    if (err) return console.error(err)
    i18next
      .use(backend)
      .init({ ...opts, ...yourOptions}, (err, t) => {
        if (err) return console.error(err)

        console.log(t('whatIsLocize'))
      })
  }
)
