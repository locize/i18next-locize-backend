import expect from 'expect.js'
import Backend from '../index.js'

// i18next >= 26.7: a declared calling convention, and services.utils.reloadResources for reload()
describe('locize backend with i18next 26.7', () => {
  it('declares the callback form', () => {
    expect(Backend.callbackApi).to.be(true)
  })

  it('reloads through services.utils.reloadResources when i18next provides it', () => {
    const calls = []
    const backend = new Backend()
    backend.services = {
      backendConnector: {},
      languageUtils: { toResolveHierarchy: (lng) => (lng ? [lng] : ['en']) },
      utils: { reloadResources: (lngs, ns) => calls.push([lngs, ns]) }
    }
    backend.allOptions = { ns: ['translation'], preload: ['de'] }
    backend.reload()
    expect(calls).to.eql([[['en', 'de'], ['translation']]])
  })
})
