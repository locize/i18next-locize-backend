// `globalThis` is the standard cross-environment global (Node ≥ 12, all
// modern browsers, Deno, Bun). The `global` / `window` fallbacks remain only
// for embedded JS runtimes that predate the ES2020 spec.
const g = typeof globalThis !== 'undefined'
  ? globalThis
  : typeof global !== 'undefined'
    ? global
    : typeof window !== 'undefined'
      ? window
      : undefined

let fetchApi
if (typeof fetch === 'function') {
  fetchApi = fetch
} else if (g && typeof g.fetch === 'function') {
  fetchApi = g.fetch
}

// XHR / ActiveXObject are picked up if present in the host, but no longer
// polyfilled — v10 dropped the `cross-fetch` ponyfill. Runtimes without
// native `fetch` (or without an XHR-like API) should provide one before
// loading this backend.
const hasXMLHttpRequest = typeof XMLHttpRequest === 'function' || typeof XMLHttpRequest === 'object'
const XmlHttpRequestApi = hasXMLHttpRequest && g ? g.XMLHttpRequest : undefined
const ActiveXObjectApi = typeof ActiveXObject === 'function' && g ? g.ActiveXObject : undefined

const storage = {}

const parseMaxAge = (headerString) => {
  if (!headerString) return 0
  const matches = headerString.match(/max-age=([0-9]+)/)
  return matches ? parseInt(matches[1], 10) : 0
}

// fetch api stuff
const requestWithFetch = (options, url, payload, cb) => {
  // called once: an error thrown by the callback lands in .catch() below and is thrown on from there instead of calling it again
  let completed = false
  const callback = (err, res) => {
    if (completed) throw err
    completed = true
    cb(err, res)
  }
  const headers = {}
  if (typeof window === 'undefined' && typeof global !== 'undefined' && typeof global.process !== 'undefined' && global.process.versions && global.process.versions.node) {
    headers['User-Agent'] = `i18next-locize-backend (node/${global.process.version}; ${global.process.platform} ${global.process.arch})`
  }
  if (options.authorize && options.apiKey) {
    headers.Authorization = options.apiKey
  }
  if (payload || options.setContentTypeJSON) {
    headers['Content-Type'] = 'application/json'
  }
  const resolver = (response) => {
    let resourceNotExisting = response.headers && response.headers.get('x-cache') === 'Error from cloudfront'
    // a namespace the standard CDN does not have yet: empty, not an error (only for reads; a write
    // answered 404 failed)
    if (options.cdnType === 'standard' && !payload && response.status === 404 && (!response.headers || !response.headers.get('x-cache'))) {
      resourceNotExisting = true
      return callback(null, { status: 200, data: '{}', resourceNotExisting })
    }
    if (!response.ok) return callback(response.statusText || 'Error', { status: response.status, resourceNotExisting, retryAfter: response.headers && response.headers.get('retry-after') })

    const cacheControl = response.headers && response.headers.get('cache-control')

    response.text().then((data) => {
      callback(null, { status: response.status, data, resourceNotExisting, cacheControl })
    }).catch(callback)
  }
  if (typeof fetch === 'function') { // react-native debug mode needs the fetch function to be called directly (no alias)
    fetch(url, {
      method: payload ? 'POST' : 'GET',
      body: payload ? JSON.stringify(payload) : undefined,
      headers
    }).then(resolver).catch(callback)
  } else {
    fetchApi(url, {
      method: payload ? 'POST' : 'GET',
      body: payload ? JSON.stringify(payload) : undefined,
      headers
    }).then(resolver).catch(callback)
  }
}

// xml http request stuff
const requestWithXmlHttpRequest = (options, url, payload, cb) => {
  // once: an exception after the answer (or one thrown by the callback) must not call it again
  let completed = false
  const callback = (err, res) => {
    if (completed) return
    completed = true
    cb(err, res)
  }
  try {
    const x = XmlHttpRequestApi ? new XmlHttpRequestApi() : new ActiveXObjectApi('MSXML2.XMLHTTP.3.0')
    x.open(payload ? 'POST' : 'GET', url, 1)
    if (!options.crossDomain) {
      x.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
    }
    if (options.authorize && options.apiKey) {
      x.setRequestHeader('Authorization', options.apiKey)
    }
    if (payload || options.setContentTypeJSON) {
      x.setRequestHeader('Content-Type', 'application/json')
    }
    x.onreadystatechange = () => {
      let resourceNotExisting = x.getResponseHeader('x-cache') === 'Error from cloudfront'
      if (options.cdnType === 'standard' && !payload && x.status === 404 && !x.getResponseHeader('x-cache')) {
        resourceNotExisting = true
        return x.readyState > 3 && callback(null, { status: 200, data: '{}', resourceNotExisting })
      }
      const cacheControl = x.getResponseHeader('Cache-Control')
      x.readyState > 3 && callback(x.status >= 400 ? x.statusText : null, { status: x.status, data: x.responseText, resourceNotExisting, cacheControl, retryAfter: x.getResponseHeader('Retry-After') })
    }
    x.send(JSON.stringify(payload))
  } catch (e) {
    // without a call back a read would never end, and a write would keep its namespace locked
    // sister copy: locize-lastused lib/request.js
    callback(e)
  }
}

const request = (options, url, payload, callback) => {
  if (typeof payload === 'function') {
    callback = payload
    payload = undefined
  }
  callback = callback || (() => {})

  const useCacheLayer = typeof window === 'undefined' && options.useCacheLayer

  if (useCacheLayer && !payload && !options.noCache && storage[url] && storage[url].expires > Date.now()) {
    return callback(null, storage[url].data)
  }

  const originalCallback = callback
  callback = (err, res) => {
    if (useCacheLayer && !err && res && !payload && res.cacheControl) {
      const maxAge = parseMaxAge(res.cacheControl)
      if (maxAge > 0) {
        storage[url] = {
          data: res,
          expires: Date.now() + (maxAge * 1000)
        }
      }
    }
    originalCallback(err, res)
  }

  if (!payload && options.noCache && options.cdnType === 'standard') {
    url += (url.indexOf('?') >= 0 ? '&' : '?') + 'cache=no'
  }

  if (fetchApi) {
    // use fetch api
    return requestWithFetch(options, url, payload, callback)
  }

  if (XmlHttpRequestApi || ActiveXObjectApi) {
    // use xml http request
    return requestWithXmlHttpRequest(options, url, payload, callback)
  }

  callback(new Error('No fetch and no xhr implementation found!'))
}

export default request
