import expect from 'expect.js'
import Http from '../index.js'
import i18next from 'i18next'
import server from './fixtures/server.js'

i18next.init()

describe('http backend using custom request', () => {
  before(server)

  describe('with callback signature', () => {
    describe('#read', () => {
      it('should load data', (done) => {
        const backend = new Http(
          {
            interpolator: i18next.services.interpolator
          },
          {
            loadPath: 'http://localhost:6001/locales/{{lng}}/{{ns}}',
            getLanguagesPath: 'http://localhost:6001/languages/{{projectId}}',
            projectId: 'test',
            request: (info, callback) => {
              expect(info.method).to.eql('GET')
              expect(info.url).to.eql('http://localhost:6001/locales/en/test')
              expect(info.headers).to.eql({})
              expect(info.body).to.eql(undefined)
              callback(null, {
                status: 200,
                data: {
                  key: 'passing from custom request',
                  info
                }
              })
            }
          }
        )
        backend.read('en', 'test', (err, data) => {
          expect(err).not.to.be.ok()
          expect(data).to.be.ok()
          expect(data.key).to.eql('passing from custom request')
          expect(data.info.method).to.eql('GET')
          expect(data.info.url).to.eql('http://localhost:6001/locales/en/test')
          expect(data.info.headers).to.eql({})
          expect(data.info.body).to.eql(undefined)
          done()
        })
      })
    })

    describe('#create', () => {
      it('should save missing', (done) => {
        const backend = new Http(
          {
            interpolator: i18next.services.interpolator
          },
          {
            loadPath: 'http://localhost:6001/locales/{{lng}}/{{ns}}',
            getLanguagesPath: 'http://localhost:6001/languages/{{projectId}}',
            projectId: 'test',
            apiKey: 'fakeapi-key',
            writeDebounce: 100,
            request: (info, callback) => {
              expect(info.method).to.eql('POST')
              expect(info.url).to.eql('https://api.locize.app/missing/test/latest/en/myns')
              expect(info.headers).to.eql({
                Authorization: 'fakeapi-key',
                'Content-Type': 'application/json'
              })
              expect(info.body).to.eql({
                newk: 'some fallback value'
              })
              callback(null)
            }
          }
        )
        // Patch logger to avoid error
        backend.services = { logger: { error: () => {}, warn: () => {}, log: () => {} } }
        backend.create('en', 'myns', 'newk', 'some fallback value', (err) => {
          expect(err).not.to.be.ok()
          done()
        })
      })
    })
  })

  describe('with promise signature', () => {
    describe('#read', () => {
      it('should load data', (done) => {
        const backend = new Http(
          {
            interpolator: i18next.services.interpolator
          },
          {
            loadPath: 'http://localhost:6001/locales/{{lng}}/{{ns}}',
            getLanguagesPath: 'http://localhost:6001/languages/{{projectId}}',
            projectId: 'test',
            request: async (info) => {
              expect(info.method).to.eql('GET')
              expect(info.url).to.eql('http://localhost:6001/locales/en/test')
              expect(info.headers).to.eql({})
              expect(info.body).to.eql(undefined)
              return {
                status: 200,
                data: {
                  key: 'passing from custom request',
                  info
                }
              }
            }
          }
        )
        backend.read('en', 'test', (err, data) => {
          expect(err).not.to.be.ok()
          expect(data).to.be.ok()
          expect(data.key).to.eql('passing from custom request')
          expect(data.info.method).to.eql('GET')
          expect(data.info.url).to.eql('http://localhost:6001/locales/en/test')
          expect(data.info.headers).to.eql({})
          expect(data.info.body).to.eql(undefined)
          done()
        })
      })
    })

    describe('#create', () => {
      it('should save missing', (done) => {
        const backend = new Http(
          {
            interpolator: i18next.services.interpolator
          },
          {
            loadPath: 'http://localhost:6001/locales/{{lng}}/{{ns}}',
            getLanguagesPath: 'http://localhost:6001/languages/{{projectId}}',
            projectId: 'test',
            apiKey: 'fakeapi-key',
            writeDebounce: 100,
            request: async (info) => {
              expect(info.method).to.eql('POST')
              expect(info.url).to.eql('https://api.locize.app/missing/test/latest/en/myns')
              expect(info.headers).to.eql({
                Authorization: 'fakeapi-key',
                'Content-Type': 'application/json'
              })
              expect(info.body).to.eql({
                newk: 'some fallback value'
              })
            }
          }
        )
        let called = false
        backend.create('en', 'myns', 'newk', 'some fallback value', (err) => {
          if (!called) {
            called = true
            expect(err).not.to.be.ok()
            done()
          }
        })
      })
    })
  })
})
