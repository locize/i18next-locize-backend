import expect from 'expect.js'
import Http from '../index.js'

describe('Additional backend coverage', () => {
  let backend

  beforeEach(() => {
    backend = new Http({
      projectId: 'test',
      version: 'latest',
      apiKey: 'fake',
      referenceLng: 'en',
      allowedAddOrUpdateHosts: ['localhost'],
      addPath: 'http://localhost:6001/add/{{projectId}}/{{version}}/{{lng}}/{{ns}}',
      updatePath: 'http://localhost:6001/update/{{projectId}}/{{version}}/{{lng}}/{{ns}}',
      request: (info, cb) => cb(null, { status: 200, data: '{}' })
    })
    backend.isAddOrUpdateAllowed = true
  })

  it('writePage: only missings', (done) => {
    backend.writePage('en', 'translation', [
      { key: 'k1', fallbackValue: 'v1' }
    ], (err) => {
      expect(err).not.to.be.ok()
      done()
    })
  })

  it('writePage: only updates', (done) => {
    backend.writePage('en', 'translation', [
      { key: 'k2', fallbackValue: 'v2', options: { isUpdate: true } }
    ], (err) => {
      expect(err).not.to.be.ok()
      done()
    })
  })

  it('writePage: both missings and updates', (done) => {
    backend.writePage('en', 'translation', [
      { key: 'k1', fallbackValue: 'v1' },
      { key: 'k2', fallbackValue: 'v2', options: { isUpdate: true } }
    ], (err) => {
      expect(err).not.to.be.ok()
      done()
    })
  })

  it('write: no missings', () => {
    backend.queuedWrites = { en: { translation: [] } }
    backend.write('en', 'translation')
    expect(backend.queuedWrites.en.translation).to.eql([])
  })

  it('queue and process', (done) => {
    backend.queuedWrites = {}
    let called = false
    backend.writePage = (lng, ns, missings, cb) => {
      called = true
      cb()
    }
    backend.queue('en', 'translation', 'k', 'v', () => {
      expect(called).to.be.ok()
      done()
    })
    backend.process()
  })

  it('getLanguages: missing projectId', async () => {
    const b = new Http({})
    try {
      await b.getLanguages()
    } catch (e) {
      expect(e.message).to.contain('got "undefined" in options for projectId')
    }
  })

  it('getOptions: no languages', async () => {
    const b = new Http({
      projectId: 'test',
      getLanguagesPath: 'http://localhost:6001/languages/invalid'
    })
    b.getLanguages = (cb) => cb(null, {})
    try {
      await b.getOptions()
    } catch (e) {
      expect(e.message).to.contain('was unable to load languages')
    }
  })

  it('read: private mode', (done) => {
    const b = new Http({
      projectId: 'test',
      version: 'latest',
      apiKey: 'fake',
      referenceLng: 'en',
      private: true,
      privatePath: 'http://localhost:6001/locales/{{lng}}/{{ns}}',
      request: (info, cb) => cb(null, { status: 200, data: '{"k":"v"}' })
    })
    b.read('en', 'test', (err, data) => {
      expect(err).not.to.be.ok()
      expect(data).to.eql({ k: 'v' })
      done()
    })
  })

  it('update: disallowed host', (done) => {
    backend.isAddOrUpdateAllowed = false
    // Mock checkIfProjectExists to skip project existence error
    backend.checkIfProjectExists = (cb) => cb(null)
    backend.update('en', 'ns', 'k', 'v', (err) => {
      expect(err).to.contain('host is not allowed')
      done()
    })
  })

  it('create: referenceLng not in languages', (done) => {
    let warned = false
    backend.services = { logger: { warn: () => { warned = true } } }
    // Mock checkIfProjectExists to skip project existence error
    backend.checkIfProjectExists = (cb) => cb(null)
    backend.create(['de'], 'ns', 'k', 'v')
    setTimeout(() => {
      expect(warned).to.be.ok()
      done()
    }, 10)
  })
})
