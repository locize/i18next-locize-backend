import expect from 'expect.js'
import request from '../lib/request.js'
import server from './fixtures/server.js'

describe(`Caching (useCacheLayer) using ${typeof XMLHttpRequest === 'function' ? 'XMLHttpRequest' : 'fetch'}`, () => {
  before((done) => {
    server(done)
  })
  // The cache layer logic in request.js specifically checks for typeof window === 'undefined'
  if (typeof window === 'undefined') {
    it('should cache response when max-age > 0', (done) => {
      const url = 'http://localhost:6001/locales/en/testwithcache'
      const options = { useCacheLayer: true }

      // First call
      request(options, url, null, (err, res1) => {
        expect(err).not.to.be.ok()

        // Second call
        request(options, url, null, (err, res2) => {
          expect(err).not.to.be.ok()
          // Should be the exact same object reference from memory cache
          expect(res1).to.be(res2)
          done()
        })
      })
    })

    it('should not cache response when max-age is 0', (done) => {
      const url = 'http://localhost:6001/locales/en/testwithcache?cache=no'
      const options = { useCacheLayer: true }

      // First call
      request(options, url, null, (err, res1) => {
        expect(err).not.to.be.ok()

        // Second call
        request(options, url, null, (err, res2) => {
          expect(err).not.to.be.ok()
          // Should be a new object because it wasn't cached
          expect(res1).not.to.be(res2)
          done()
        })
      })
    })

    it('should not cache response when useCacheLayer is false', (done) => {
      const url = 'http://localhost:6001/locales/en/testwithcache'
      const options = { useCacheLayer: false }

      // First call
      request(options, url, null, (err, res1) => {
        expect(err).not.to.be.ok()

        // Second call
        request(options, url, null, (err, res2) => {
          expect(err).not.to.be.ok()
          // Should be a new object because it wasn't cached
          expect(res1).not.to.be(res2)
          done()
        })
      })
    })
  }
})
