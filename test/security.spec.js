import expect from 'expect.js'
import {
  interpolate,
  interpolateUrl,
  isSafeUrlSegment,
  sanitizeLogValue,
  redactUrlCredentials,
  setPath,
  pushPath,
  getPath
} from '../lib/utils.js'
import Backend from '../lib/index.js'

// Security tests for the 9.0.2 hardening.

describe('security', () => {
  describe('isSafeUrlSegment', () => {
    it('accepts arbitrary language / project / version codes', () => {
      expect(isSafeUrlSegment('en')).to.be(true)
      expect(isSafeUrlSegment('de-DE')).to.be(true)
      expect(isSafeUrlSegment('en_US')).to.be(true)
      expect(isSafeUrlSegment('zh-Hant-HK')).to.be(true)
      expect(isSafeUrlSegment('pirate-speak')).to.be(true)
      expect(isSafeUrlSegment('my-custom.ns')).to.be(true)
      // projectId UUID shape
      expect(isSafeUrlSegment('abc1d4f3-d0a7-4794-b74f-b72134d82d35')).to.be(true)
      // version strings
      expect(isSafeUrlSegment('latest')).to.be(true)
      expect(isSafeUrlSegment('production')).to.be(true)
    })
    // The Locize server and dashboard allow these in version, language and
    // namespace names; interpolateUrl percent-encodes them.
    it('accepts names with spaces and URL-structure characters', () => {
      for (const v of ['Login Screen', 'Page 1', '100%', 'Q&A?', 'a@b', 'en#frag', 'v1:beta', 'a;b=c', '%2e%2e', 'a%2fb']) {
        expect(isSafeUrlSegment(v)).to.be(true)
      }
    })
    it('rejects traversal / separator / control chars / prototype keys', () => {
      expect(isSafeUrlSegment('../etc/passwd')).to.be(false)
      expect(isSafeUrlSegment('..')).to.be(false)
      expect(isSafeUrlSegment('.')).to.be(false)
      expect(isSafeUrlSegment('foo/bar')).to.be(false)
      expect(isSafeUrlSegment('foo\\bar')).to.be(false)
      expect(isSafeUrlSegment('en%2F..')).to.be(false)
      expect(isSafeUrlSegment('__proto__')).to.be(false)
      expect(isSafeUrlSegment('constructor')).to.be(false)
      expect(isSafeUrlSegment('prototype')).to.be(false)
      expect(isSafeUrlSegment('en\r\nX-Injected: bad')).to.be(false)
      expect(isSafeUrlSegment('en\tx')).to.be(false)
      expect(isSafeUrlSegment('en\x7F')).to.be(false)
      expect(isSafeUrlSegment('en\u2028x')).to.be(false)
      expect(isSafeUrlSegment('en\u0085x')).to.be(false)
      expect(isSafeUrlSegment('')).to.be(false)
      expect(isSafeUrlSegment('a'.repeat(200))).to.be(false)
    })
  })

  describe('interpolate (guarded)', () => {
    it('does not leak prototype-chain properties on __proto__ lookups', () => {
      const out = interpolate('x/{{__proto__}}/y', { __proto__: { polluted: true } })
      // Should return the key itself, not dereference __proto__
      expect(out).to.equal('x/__proto__/y')
    })
    it('substitutes normal keys', () => {
      expect(interpolate('/{{projectId}}/{{lng}}', { projectId: 'abc', lng: 'en' }))
        .to.equal('/abc/en')
    })
  })

  describe('interpolateUrl', () => {
    const template = 'https://api.locize.app/{{projectId}}/{{version}}/{{lng}}/{{ns}}'

    it('accepts a plain URL', () => {
      expect(interpolateUrl(template, {
        projectId: 'abc1d4f3-d0a7-4794-b74f-b72134d82d35',
        version: 'latest',
        lng: 'en',
        ns: 'common'
      })).to.equal('https://api.locize.app/abc1d4f3-d0a7-4794-b74f-b72134d82d35/latest/en/common')
    })

    it('accepts + joins', () => {
      expect(interpolateUrl(template, {
        projectId: 'p', version: 'v', lng: 'en+de', ns: 'a+b'
      })).to.equal('https://api.locize.app/p/v/en+de/a+b')
    })

    it('returns null for path traversal in lng', () => {
      expect(interpolateUrl(template, {
        projectId: 'p', version: 'v', lng: '../../etc', ns: 'x'
      })).to.equal(null)
    })

    it('returns null for path traversal in projectId', () => {
      expect(interpolateUrl(template, {
        projectId: '../admin', version: 'v', lng: 'en', ns: 'x'
      })).to.equal(null)
    })

    it('percent-encodes spaces and URL-structure characters in names', () => {
      const url = (v) => interpolateUrl(template, { projectId: 'p', version: v.version || 'v', lng: v.lng || 'en', ns: v.ns || 'x' })
      expect(url({ ns: 'Login Screen' })).to.equal('https://api.locize.app/p/v/en/Login%20Screen')
      expect(url({ ns: '100%' })).to.equal('https://api.locize.app/p/v/en/100%25')
      expect(url({ ns: 'Q&A?' })).to.equal('https://api.locize.app/p/v/en/Q%26A%3F')
      expect(url({ ns: 'a@b' })).to.equal('https://api.locize.app/p/v/en/a%40b')
      expect(url({ lng: 'en?admin=true' })).to.equal('https://api.locize.app/p/v/en%3Fadmin%3Dtrue/x')
      expect(url({ lng: 'en#frag' })).to.equal('https://api.locize.app/p/v/en%23frag/x')
      expect(url({ version: 'my version' })).to.equal('https://api.locize.app/p/my%20version/en/x')
      // the encoding Locize uses for the path it invalidates on the CDN when it publishes
      expect(url({ version: 'v1:beta' })).to.equal('https://api.locize.app/p/v1%3Abeta/en/x')
    })

    it('cannot turn an already-encoded value into a traversal', () => {
      const dots = interpolateUrl(template, { projectId: 'p', version: 'v', lng: 'en', ns: '%2e%2e' })
      expect(dots).to.equal('https://api.locize.app/p/v/en/%252e%252e')
      expect(new URL(dots).pathname).to.equal('/p/v/en/%252e%252e')
      const slash = interpolateUrl(template, { projectId: 'p', version: 'v', lng: 'en', ns: 'a%2fb' })
      expect(slash).to.equal('https://api.locize.app/p/v/en/a%252fb')
      expect(new URL(slash).pathname).to.equal('/p/v/en/a%252fb')
    })

    it('returns null for a dot segment or a lone surrogate instead of throwing', () => {
      expect(interpolateUrl(template, { projectId: 'p', version: 'v', lng: '.', ns: 'x' })).to.equal(null)
      expect(interpolateUrl(template, { projectId: 'p', version: 'v', lng: 'en', ns: 'a\uD800b' })).to.equal(null)
    })

    // i18next-http-backend GHSA-xvq9-wjp8-hwqf: a leading-placeholder custom
    // template plus a `scheme:` value became an absolute URL. The colon is
    // encoded, so the URL stays relative.
    it('encodes a scheme-injecting lng / ns so the URL stays relative', () => {
      const lng = interpolateUrl('{{lng}}/{{ns}}', { lng: 'http:127.0.0.1:8080', ns: 'common' })
      expect(lng).to.equal('http%3A127.0.0.1%3A8080/common')
      expect(new URL(lng, 'https://cdn.example/base/').origin).to.equal('https://cdn.example')
      expect(interpolateUrl('{{ns}}/{{lng}}', { lng: 'en', ns: 'http:127.0.0.1:8080' })).to.equal('http%3A127.0.0.1%3A8080/en')
      expect(interpolateUrl('{{lng}}/{{ns}}', { lng: 'en+http:127.0.0.1:8080', ns: 'common' })).to.equal('en+http%3A127.0.0.1%3A8080/common')
    })

    // i18next-http-backend GHSA-3cmx-xjww-583x: a custom query-shaped template
    // plus `&` / `=` / `;` in lng / ns added or overrode query parameters.
    it('encodes query-parameter injection in lng / ns, but keeps + joins', () => {
      const t = 'https://proxy.example/locize?p={{projectId}}&lng={{lng}}&ns={{ns}}'
      const amp = interpolateUrl(t, { projectId: 'p', lng: 'de&ns=private', ns: 'common' })
      expect(amp).to.equal('https://proxy.example/locize?p=p&lng=de%26ns%3Dprivate&ns=common')
      expect(new URL(amp).searchParams.getAll('ns')).to.eql(['common'])
      expect(interpolateUrl(t, { projectId: 'p', lng: 'de', ns: 'common;x=1' }))
        .to.equal('https://proxy.example/locize?p=p&lng=de&ns=common%3Bx%3D1')
      expect(interpolateUrl(t, { projectId: 'p', lng: 'de+en', ns: 'a+b' }))
        .to.equal('https://proxy.example/locize?p=p&lng=de+en&ns=a+b')
    })

    it('does not loop forever when a value contains its own placeholder', () => {
      // Pre-fix this hung the process: `{{lng}}` was substituted with itself
      // and re-scanned indefinitely. Mocha's timeout is the guard here.
      expect(interpolateUrl('https://api.locize.app/{{projectId}}/{{version}}/{{lng}}/{{ns}}', { projectId: 'p', version: 'latest', lng: '{{lng}}', ns: 'common' }))
        .to.equal('https://api.locize.app/p/latest/%7B%7Blng%7D%7D/common')
      expect(interpolateUrl('https://api.locize.app/{{projectId}}/{{version}}/{{lng}}/{{ns}}', { projectId: 'p', version: 'latest', lng: '{{ns}}', ns: '{{lng}}' }))
        .to.equal('https://api.locize.app/p/latest/%7B%7Bns%7D%7D/%7B%7Blng%7D%7D')
    })

    it('returns null when any + segment is unsafe', () => {
      expect(interpolateUrl(template, {
        projectId: 'p', version: 'v', lng: 'en+../etc/passwd', ns: 'x'
      })).to.equal(null)
    })
  })

  // Figma's default frame and page names ("Page 1", "Frame 1") and names
  // created in the Locize dashboard may contain a space.
  describe('read and create with a namespace name that has a space', () => {
    const quietLogger = { error () {}, warn () {}, log () {} }

    it('read requests .../Login%20Screen', (done) => {
      const urls = []
      const backend = new Backend(null, {
        projectId: 'p',
        request: (info, cb) => { urls.push(info.url); cb(null, { status: 200, data: { k: 'v' } }) }
      })
      backend.read('en', 'Login Screen', (err, data) => {
        expect(err).not.to.be.ok()
        expect(data).to.eql({ k: 'v' })
        expect(urls).to.eql(['https://api.lite.locize.app/p/latest/en/Login%20Screen'])
        done()
      })
    })

    it('create posts to .../missing/p/latest/en/Login%20Screen', (done) => {
      const urls = []
      const backend = new Backend(null, {
        projectId: 'p',
        apiKey: 'k',
        writeDebounce: 1,
        request: (info, cb) => { urls.push(info.url); cb(null, { status: 200, data: '' }) }
      })
      backend.services = { logger: quietLogger }
      backend.somethingLoaded = true // skip the languages lookup, which bypasses a custom request
      backend.create('en', 'Login Screen', 'title', 'Login', (err) => {
        expect(err).not.to.be.ok()
        expect(urls).to.eql(['https://api.lite.locize.app/missing/p/latest/en/Login%20Screen'])
        done()
      })
    })
  })

  describe('sanitizeLogValue', () => {
    it('strips CR, LF, NUL and other control chars', () => {
      expect(sanitizeLogValue('en\r\n2026-04-18 admin login'))
        .to.equal('en  2026-04-18 admin login')
      expect(sanitizeLogValue('en\u0000')).to.equal('en ')
    })
    it('passes non-strings through unchanged', () => {
      expect(sanitizeLogValue(undefined)).to.equal(undefined)
      expect(sanitizeLogValue(42)).to.equal(42)
    })
  })

  describe('redactUrlCredentials', () => {
    it('strips user:password from URLs', () => {
      expect(redactUrlCredentials('https://user:pass@api.locize.app/p/v/en/x'))
        .to.equal('https://api.locize.app/p/v/en/x')
      expect(redactUrlCredentials('https://api.locize.app/p/v/en/x'))
        .to.equal('https://api.locize.app/p/v/en/x')
    })
  })

  describe('setPath / pushPath prototype-pollution guard', () => {
    // getLastOfPath() is the shared object walker used by the missing-key
    // persistence path (queue() -> pushPath, write() -> getPath/setPath). It
    // splits a dotted path and walks it; without a guard an unsafe segment
    // such as __proto__ walks straight into Object.prototype. Same walker /
    // same fix as i18next-fs-backend 2.6.6 (GHSA-2933-q333-qg83).

    afterEach(() => {
      delete Object.prototype.polluted
      delete Object.prototype.isAdmin
    })

    it('setPath drops a write whose path traverses __proto__ (string path)', () => {
      const data = {}
      setPath(data, '__proto__.polluted', 'PWNED')
      expect(({}).polluted).to.be(undefined)
      expect(Object.prototype.polluted).to.be(undefined)
      expect(data).to.eql({})
    })

    it('setPath drops a write whose path traverses __proto__ / constructor / prototype (array path)', () => {
      setPath({}, ['__proto__', 'polluted'], 'PWNED')
      setPath({}, ['constructor', 'prototype', 'polluted'], 'PWNED')
      setPath({}, ['prototype', 'polluted'], 'PWNED')
      expect(({}).polluted).to.be(undefined)
      expect(Object.prototype.polluted).to.be(undefined)
    })

    it('setPath drops a write whose final segment is an unsafe key', () => {
      setPath({}, ['en', 'translation', '__proto__'], { isAdmin: true })
      expect(({}).isAdmin).to.be(undefined)
      expect(Object.prototype.isAdmin).to.be(undefined)
    })

    it('pushPath drops a write whose path traverses an unsafe key', () => {
      pushPath({}, ['__proto__', 'polluted'], 'PWNED')
      expect(({}).polluted).to.be(undefined)
      expect(Object.prototype.polluted).to.be(undefined)
    })

    it('still writes and reads legitimate nested paths', () => {
      const data = {}
      setPath(data, ['en', 'translation', 'greeting'], 'hello')
      expect(data.en.translation.greeting).to.equal('hello')
      expect(getPath(data, ['en', 'translation', 'greeting'])).to.equal('hello')

      const queue = {}
      pushPath(queue, ['en', 'common'], { key: 'title' })
      expect(queue.en.common).to.eql([{ key: 'title' }])
    })
  })

  describe('loadUrl error strings', () => {
    const loadUrlWith = (url, requestImpl) => new Promise((resolve) => {
      const backend = new Backend(null, {
        projectId: 'abc',
        referenceLng: 'en',
        request: requestImpl
      })
      backend.loadUrl({}, url, undefined, (err) => resolve(String(err)))
    })

    const credentialUrl = 'https://user:hunter2@proxy.example.com/abc/latest/en/translation'

    it('redacts credentials from a failed-load message', async () => {
      const err = await loadUrlWith(credentialUrl, (info, cb) => cb(null, { status: 500 }))
      expect(err).to.contain('proxy.example.com')
      expect(err).not.to.contain('hunter2')
      expect(err).not.to.contain('user:')
    })

    it('redacts credentials from a network-error message and sanitises the error text', async () => {
      const err = await loadUrlWith(credentialUrl, (info, cb) => cb(new Error('Failed to fetch\r\nX-Injected: yes'), null))
      expect(err).not.to.contain('hunter2')
      expect(err.indexOf('\r')).to.be(-1)
      expect(err.indexOf('\n')).to.be(-1)
    })

    it('redacts credentials from a parse-failure message', async () => {
      const err = await loadUrlWith(credentialUrl, (info, cb) => cb(null, { status: 200, data: 'not json{' }))
      expect(err).to.contain('failed parsing')
      expect(err).not.to.contain('hunter2')
    })

    it('leaves a credential-free url intact', async () => {
      const url = 'https://api.locize.app/abc/latest/en/translation'
      const err = await loadUrlWith(url, (info, cb) => cb(null, { status: 500 }))
      expect(err).to.contain(url)
    })
  })
})
