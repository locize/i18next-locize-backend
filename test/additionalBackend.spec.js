import expect from 'expect.js'
import Http from '../index.js'
import server from './fixtures/server.js'

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

describe('saving missing keys', function () {
  this.timeout(10000)
  const make = (respond) => {
    const calls = []
    let inFlight = 0
    let maxInFlight = 0
    const backend = new Http({
      projectId: 'test',
      version: 'latest',
      apiKey: 'fake',
      referenceLng: 'en',
      addPath: 'http://localhost:6001/add/{{projectId}}/{{version}}/{{lng}}/{{ns}}',
      updatePath: 'http://localhost:6001/update/{{projectId}}/{{version}}/{{lng}}/{{ns}}',
      request: (info, cb) => {
        inFlight++
        maxInFlight = Math.max(maxInFlight, inFlight)
        const res = respond(info, calls.length)
        calls.push({ url: info.url, keys: Object.keys(info.body).length })
        setTimeout(() => { inFlight--; cb(null, res) }, 20)
      }
    })
    backend.services = { logger: { warn: (msg) => calls.push({ warned: msg }) } }
    return { backend, calls, maxInFlight: () => maxInFlight }
  }

  it('sends the pages and the updates of a namespace one after the other', (done) => {
    const { backend, calls, maxInFlight } = make(() => ({ status: 200, data: '{}' }))
    const missings = []
    for (let i = 0; i < 2500; i++) missings.push({ key: `k${i}`, fallbackValue: 'v' })
    missings.push({ key: 'u', fallbackValue: 'v', options: { isUpdate: true } })
    backend.queuedWrites = { en: { translation: missings } }
    backend.write('en', 'translation')
    backend.queuedWrites.en.translation.push({ key: 'x', fallbackValue: 'v', callback: () => {} }) // queued meanwhile, not part of this write
    const check = setInterval(() => {
      if (calls.length < 4) return
      clearInterval(check)
      expect(maxInFlight()).to.be(1)
      expect(calls.map((c) => [c.url.split('/')[3], c.keys])).to.eql([['add', 1000], ['add', 1000], ['add', 500], ['update', 1]])
      done()
    }, 20)
  })

  it('tries a 429 again after its Retry-After, and a 5xx after a second', (done) => {
    const { backend, calls } = make((info, n) => [{ status: 429, retryAfter: '1' }, { status: 503 }, { status: 200 }][n])
    const started = Date.now()
    backend.writePage('en', 'translation', [{ key: 'k', fallbackValue: 'v' }], (err) => {
      expect(err).not.to.be.ok()
      expect(calls.length).to.be(3)
      expect(Date.now() - started).to.be.above(2900) // 1 s Retry-After + 2 s
      done()
    })
  })

  it('waits 6 s after a 429 whose Retry-After it cannot read (a browser)', (done) => {
    const { backend, calls } = make((info, n) => [{ status: 429 }, { status: 200 }][n])
    const started = Date.now()
    backend.writePage('en', 'translation', [{ key: 'k', fallbackValue: 'v' }], (err) => {
      expect(err).not.to.be.ok()
      expect(calls.length).to.be(2)
      expect(Date.now() - started).to.be.above(5900)
      done()
    })
  })

  describe(`over ${typeof XMLHttpRequest === 'function' ? 'XMLHttpRequest' : 'fetch'}`, () => {
    before((done) => server(done))
    const real = (addPath) => {
      const backend = new Http({ projectId: 'test', version: 'latest', apiKey: 'fake', referenceLng: 'en', addPath, updatePath: addPath })
      const warnings = []
      backend.services = { logger: { warn: (msg) => warnings.push(msg) } }
      return { backend, warnings }
    }

    it('tries a refused connection again, then reports it', (done) => {
      // XMLHttpRequest answers no connection with status 0 and no error
      const { backend, warnings } = real('http://127.0.0.1:1/missing/{{projectId}}/{{version}}/{{lng}}/{{ns}}')
      const started = Date.now()
      backend.writePage('en', 'translation', [{ key: 'k', fallbackValue: 'v' }], (err) => {
        expect(err).to.be.ok()
        expect(warnings.length).to.be(1)
        expect(Date.now() - started).to.be.above(2900) // 1 s + 2 s
        done()
      })
    })

    it('does not count a write answered 404 as saved', (done) => {
      const { backend, warnings } = real('http://localhost:6001/no-such-route/{{projectId}}/{{version}}/{{lng}}/{{ns}}')
      backend.writePage('en', 'translation', [{ key: 'k', fallbackValue: 'v' }], (err) => {
        expect(err.message).to.contain('404')
        expect(warnings.length).to.be(1)
        done()
      })
    })
  })

  it('reports and logs what still fails, but not a 412', (done) => {
    const { backend, calls } = make((info) => ({ status: info.url.includes('/add/') ? 412 : 400 }))
    backend.writePage('en', 'translation', [
      { key: 'a', fallbackValue: 'v' },
      { key: 'b', fallbackValue: 'v', options: { isUpdate: true } }
    ], (err) => {
      expect(err.message).to.contain('/update/test/latest/en/translation failed: 400')
      expect(calls.filter((c) => c.warned).length).to.be(1)
      done()
    })
  })

  it('hands the error to the callbacks of the keys and skips onSaved', (done) => {
    const { backend } = make(() => ({ status: 400 }))
    let saved = false
    backend.options.onSaved = () => { saved = true }
    const callback = (err) => {
      expect(err).to.be.ok()
      setTimeout(() => { expect(saved).to.be(false); done() }, 10)
    }
    backend.queuedWrites = { en: { translation: [{ key: 'a', fallbackValue: 'v', callback }] } }
    backend.write('en', 'translation')
  })
})
