import expect from 'expect.js'
import Backend from '../index.js'
import request from '../lib/request.js'
import i18next from 'i18next'

i18next.init()

// an error thrown by the callback reaches the app as an unhandled rejection
const unhandledRejectionOf = async (fn) => {
  const listeners = process.listeners('unhandledRejection')
  process.removeAllListeners('unhandledRejection')
  try {
    const rejection = new Promise((resolve) => process.once('unhandledRejection', resolve))
    fn()
    return await Promise.race([rejection, new Promise((resolve) => setTimeout(resolve, 200))])
  } finally {
    listeners.forEach((l) => process.on('unhandledRejection', l))
  }
}

const throwingCallback = (calls) => () => {
  calls.count++
  throw new Error('callback failed')
}

describe('a callback that throws', () => {
  if (typeof fetch === 'function') {
    describe('fetch', () => {
      const originalFetch = globalThis.fetch
      afterEach(() => { globalThis.fetch = originalFetch })

      it('is called once', async () => {
        globalThis.fetch = () => Promise.resolve({ ok: true, status: 200, headers: { get: () => null }, text: () => Promise.resolve('{}') })
        const calls = { count: 0 }
        const unhandled = await unhandledRejectionOf(() => request({}, 'http://localhost:6001/locales/en/test', null, throwingCallback(calls)))
        expect(calls.count).to.be(1)
        expect(unhandled.message).to.be('callback failed')
      })

      it('still gets an error thrown while reading the response', async () => {
        globalThis.fetch = () => Promise.resolve({ ok: true, status: 200, headers: { get: () => null } }) // no text()
        const errors = await new Promise((resolve) => {
          const seen = []
          request({}, 'http://localhost:6001/locales/en/test', null, (err) => {
            seen.push(err)
            setTimeout(() => resolve(seen), 50)
          })
        })
        expect(errors).to.have.length(1)
        expect(errors[0]).to.be.a(TypeError)
      })
    })
  }

  describe('custom request without a callback', () => {
    const backendWith = (customRequest) => new Backend(
      { interpolator: i18next.services.interpolator },
      {
        loadPath: 'http://localhost:6001/locales/{{lng}}/{{ns}}',
        projectId: 'test',
        request: customRequest
      }
    )

    it('is called once for a value', () => {
      const backend = backendWith((info) => ({ status: 200, data: { key: 'value' } }))
      const calls = { count: 0 }
      expect(() => backend.read('en', 'test', throwingCallback(calls))).to.throwError(/callback failed/)
      expect(calls.count).to.be(1)
    })

    it('is called once for a promise', async () => {
      const backend = backendWith((info) => Promise.resolve({ status: 200, data: { key: 'value' } }))
      const calls = { count: 0 }
      const unhandled = await unhandledRejectionOf(() => backend.read('en', 'test', throwingCallback(calls)))
      expect(calls.count).to.be(1)
      expect(unhandled.message).to.be('callback failed')
    })
  })
})
