import expect from 'expect.js'
import Http from '../index.js'
import server from './fixtures/server.js'

describe(`locize backend using ${typeof XMLHttpRequest === 'function' ? 'XMLHttpRequest' : 'fetch'}`, () => {
  let backend

  before((done) => {
    backend = new Http({
      getLanguagesPath: 'http://localhost:6001/languages/{{projectId}}',
      addPath: 'http://localhost:6001/add/{{projectId}}/{{version}}/{{lng}}/{{ns}}',
      projectId: 'test',
      version: 'latest'
    })
    server(done)
  })

  describe('#smart init with callback', () => {
    it('should return options and set referenceLng', (done) => {
      // eslint-disable-next-line no-new
      new Http({
        getLanguagesPath: 'http://localhost:6001/languages/{{projectId}}',
        projectId: 'test'
      }, (err, options) => {
        expect(err).not.to.be.ok()
        expect(options).to.eql({ fallbackLng: 'en', referenceLng: 'en', whitelist: ['en', 'de'], load: 'languageOnly' })
        done()
      })
    })
  })

  describe('#getLanguages', () => {
    it('should return languages', (done) => {
      backend.getLanguages((err, data) => {
        expect(err).not.to.be.ok()
        expect(data).to.have.property('en')
        expect(data).to.have.property('de')
        done()
      })
    })
  })

  describe('#getOptions', () => {
    it('should return possible options', (done) => {
      backend.getOptions((err, options) => {
        expect(err).not.to.be.ok()
        expect(options).to.eql({ fallbackLng: 'en', referenceLng: 'en', whitelist: ['en', 'de'], load: 'languageOnly' })
        done()
      })
    })
  })

  describe('#writePage', () => {
    it('should work without errors', (done) => {
      backend.writePage('en', 'translation', [{ key: 'newK', fallbackValue: 'descr' }], (err) => {
        expect(err).not.to.be.ok()
        done()
      })
    })
  })
})
