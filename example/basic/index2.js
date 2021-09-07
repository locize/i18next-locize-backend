const i18next = require('i18next')
const LocizeBackend = require('../../cjs/index.js')
// const LocizeBackend = require('i18next-locize-backend')

const backendOptions = {
  projectId: '3d0aa5aa-4660-4154-b6d9-907dbef10bb2'
  // apiKey: '3dc91839-ca3e-440d-a1a3-ce52ebfd12e3'
  // version: 'staging',
  // referenceLng -> not needed as will be loaded from API
}

const yourOptions = {
  debug: true,
  ns: 'landingpage',
  defaultNS: 'landingpage',
}

const backend = new LocizeBackend(
  backendOptions,
  (err, opts) => {
    if (err) return console.error(err)
    i18next
      .use(backend)
      // yourOptions should not include backendOptions!
      .init({ ...opts, ...yourOptions}, (err, t) => {
        if (err) return console.error(err)

        console.log(t('whatIsLocize'))
      })
  }
)
