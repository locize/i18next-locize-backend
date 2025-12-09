import expect from 'expect.js'
import Http from '../index.js'

describe('cdnType and noCache option behavior', () => {
  it('should use pro CDN by default', () => {
    const backend = new Http({ projectId: 'test' })
    expect(backend.options.cdnType).to.eql('pro')
    expect(backend.options.loadPath).to.contain('api.locize.app')
    expect(backend.options.loadPath).not.to.contain('.lite')
  })

  it('should use standard CDN when cdnType is set', () => {
    const backend = new Http({ projectId: 'test', cdnType: 'standard' })
    expect(backend.options.cdnType).to.eql('standard')
    expect(backend.options.loadPath).to.contain('api.lite.locize.app')
  })

  it('should warn if noCache is set with cdnType=pro', () => {
    let warned = false
    const origWarn = console.warn
    console.warn = (msg) => {
      if (msg.includes('noCache')) warned = true
    }
    // eslint-disable-next-line no-new
    new Http({ projectId: 'test', noCache: true, cdnType: 'pro' })
    console.warn = origWarn
    expect(warned).to.be.ok()
  })

  it('should not warn if noCache is set with cdnType=standard', () => {
    let warned = false
    const origWarn = console.warn
    console.warn = (msg) => {
      if (msg.includes('noCache')) warned = true
    }
    // eslint-disable-next-line no-new
    new Http({ projectId: 'test', noCache: true, cdnType: 'standard' })
    console.warn = origWarn
    expect(warned).not.to.be.ok()
  })

  it('should set noCache to true if debug is enabled and cdnType is not standard', () => {
    const backend = new Http(
      {},
      { projectId: 'test', cdnType: 'pro' },
      { debug: true }
    )
    expect(backend.options.noCache).to.eql(true)
  })

  it('should not override noCache if explicitly set', () => {
    const backend = new Http(
      {},
      { projectId: 'test', cdnType: 'pro', noCache: false },
      { debug: true }
    )
    expect(backend.options.noCache).to.eql(false)
  })

  it('should not set noCache to true if cdnType is standard, even if debug is true', () => {
    const backend = new Http(
      {},
      { projectId: 'test', cdnType: 'standard' },
      { debug: true }
    )
    expect(backend.options.noCache).not.to.eql(true)
  })
})
