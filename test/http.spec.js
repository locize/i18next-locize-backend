import expect from 'expect.js'
import Http from '../index.js'
import i18next from 'i18next'
import server from './fixtures/server.js'

i18next.init()

describe(`http backend using ${typeof XMLHttpRequest === 'function' ? 'XMLHttpRequest' : 'fetch'}`, () => {
  before(server)

  describe('#read', () => {
    let backend

    before(() => {
      backend = new Http(
        {
          interpolator: i18next.services.interpolator
        },
        {
          loadPath: 'http://localhost:6001/locales/{{lng}}/{{ns}}',
          projectId: 'test'
        }
      )
    })

    it('should load data', (done) => {
      backend.read('en', 'test', (err, data) => {
        expect(err).not.to.be.ok()
        expect(data).to.eql({ key: 'passing' })
        done()
      })
    })

    it('should throw error on not existing file', (done) => {
      backend.read('en', 'notexisting', (err, data) => {
        expect(err).to.equal('failed loading http://localhost:6001/locales/en/notexisting')
        done()
      })
    })

    it('should throw error on non json file', (done) => {
      backend.read('en', 'nonjson', function (err, data) {
        expect(err).to.equal(
          'failed parsing http://localhost:6001/locales/en/nonjson to json'
        )
        done()
      })
    })
  })
})
