import expect from 'expect.js'
import {
  interpolate,
  interpolateUrl,
  isSafeUrlSegment,
  sanitizeLogValue,
  redactUrlCredentials
} from '../lib/utils.js'

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
    it('rejects traversal / separator / URL-structure / control chars / prototype keys', () => {
      expect(isSafeUrlSegment('../etc/passwd')).to.be(false)
      expect(isSafeUrlSegment('..')).to.be(false)
      expect(isSafeUrlSegment('foo/bar')).to.be(false)
      expect(isSafeUrlSegment('foo\\bar')).to.be(false)
      expect(isSafeUrlSegment('en?admin=true')).to.be(false)
      expect(isSafeUrlSegment('en#frag')).to.be(false)
      expect(isSafeUrlSegment('en%2F..')).to.be(false)
      expect(isSafeUrlSegment('en evil')).to.be(false)
      expect(isSafeUrlSegment('en@host')).to.be(false)
      expect(isSafeUrlSegment('__proto__')).to.be(false)
      expect(isSafeUrlSegment('en\r\nX-Injected: bad')).to.be(false)
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

    it('returns null for query-string / fragment injection', () => {
      expect(interpolateUrl(template, {
        projectId: 'p', version: 'v', lng: 'en?admin=true', ns: 'x'
      })).to.equal(null)
      expect(interpolateUrl(template, {
        projectId: 'p', version: 'v', lng: 'en#frag', ns: 'x'
      })).to.equal(null)
    })

    it('returns null when any + segment is unsafe', () => {
      expect(interpolateUrl(template, {
        projectId: 'p', version: 'v', lng: 'en+../etc/passwd', ns: 'x'
      })).to.equal(null)
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
})
