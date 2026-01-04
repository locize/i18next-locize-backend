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
          projectId: 'test',
          failLoadingOnEmptyJSON: true,
          cdnType: 'pro'
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

    it('should throw error on empty json file if failLoadingOnEmptyJSON=true', (done) => {
      backend.read('en', 'empty', function (err, data) {
        expect(err).to.equal(
          'loaded result empty for http://localhost:6001/locales/en/empty'
        )
        done()
      })
    })

    describe('cdnType: pro', () => {
      let backendTwo

      before(() => {
        backendTwo = new Http(
          {
            interpolator: i18next.services.interpolator
          },
          {
            loadPath: 'http://localhost:6001/locales/{{lng}}/{{ns}}',
            projectId: 'test',
            cdnType: 'pro'
          }
        )
      })

      it('should return correctly on not existing empty file', (done) => {
        backendTwo.read('en', 'nonexistingempty', (err, data) => {
          expect(err).not.to.be.ok()
          expect(data).to.eql({})
          done()
        })
      })

      it('should return correctly on not existing empty file (loadUrl)', (done) => {
        backendTwo.loadUrl({}, 'http://localhost:6001/locales/en/nonexistingempty', (err, ret, info) => {
          expect(err).not.to.be.ok()
          expect(ret).to.eql({})
          expect(info).to.eql({ resourceNotExisting: true })
          done()
        })
      })
    })

    describe('cdnType: standard', () => {
      let backendTwo

      before(() => {
        backendTwo = new Http(
          {
            interpolator: i18next.services.interpolator
          },
          {
            loadPath: 'http://localhost:6001/locales/{{lng}}/{{ns}}',
            projectId: 'test',
            cdnType: 'standard'
          }
        )
      })

      it('should return correctly on not existing empty file', (done) => {
        backendTwo.read('en', 'nonexisting404', (err, data) => {
          expect(err).not.to.be.ok()
          expect(data).to.eql({})
          done()
        })
      })

      it('should return correctly on not existing empty file (loadUrl)', (done) => {
        backendTwo.loadUrl({}, 'http://localhost:6001/locales/en/nonexisting404', (err, ret, info) => {
          expect(err).not.to.be.ok()
          expect(ret).to.eql({})
          expect(info).to.eql({ resourceNotExisting: true })
          done()
        })
      })

      it('should add cache=no if noCache is true', (done) => {
        const backendThree = new Http(
          {
            interpolator: i18next.services.interpolator
          },
          {
            loadPath: 'http://localhost:6001/locales/{{lng}}/{{ns}}',
            projectId: 'test',
            cdnType: 'standard',
            noCache: true
          }
        )
        backendThree.read('en', 'echoqs', (err, data) => {
          expect(err).not.to.be.ok()
          expect(data).to.eql({ cache: 'no' })
          done()
        })
      })

      it('should not add cache=no if noCache is false', (done) => {
        const backendThree = new Http(
          {
            interpolator: i18next.services.interpolator
          },
          {
            loadPath: 'http://localhost:6001/locales/{{lng}}/{{ns}}',
            projectId: 'test',
            cdnType: 'standard',
            noCache: false
          }
        )
        backendThree.read('en', 'echoqs', (err, data) => {
          expect(err).not.to.be.ok()
          expect(data).to.eql({})
          done()
        })
      })
    })
  })
})
