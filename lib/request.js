let fetchApi = typeof fetch === 'function' ? fetch : undefined
if (typeof global !== 'undefined' && global.fetch) {
  fetchApi = global.fetch
} else if (typeof window !== 'undefined' && window.fetch) {
  fetchApi = window.fetch
}
let XmlHttpRequestApi
if (typeof XMLHttpRequest === 'function' || typeof XMLHttpRequest === 'object') {
  if (typeof global !== 'undefined' && global.XMLHttpRequest) {
    XmlHttpRequestApi = global.XMLHttpRequest
  } else if (typeof window !== 'undefined' && window.XMLHttpRequest) {
    XmlHttpRequestApi = window.XMLHttpRequest
  }
}
let ActiveXObjectApi
if (typeof ActiveXObject === 'function') {
  if (typeof global !== 'undefined' && global.ActiveXObject) {
    ActiveXObjectApi = global.ActiveXObject
  } else if (typeof window !== 'undefined' && window.ActiveXObject) {
    ActiveXObjectApi = window.ActiveXObject
  }
}
if (typeof fetchApi !== 'function') fetchApi = undefined
if (!fetchApi && !XmlHttpRequestApi && !ActiveXObjectApi) {
  try {
    // top-level await is not available on everywhere
    // fetchApi = (await import('cross-fetch')).default
    import('cross-fetch').then((mod) => {
      fetchApi = mod.default
    }).catch(() => {})
  } catch (e) {}
}

const storage = {}

const parseMaxAge = (headerString) => {
  if (!headerString) return 0
  const matches = headerString.match(/max-age=([0-9]+)/)
  return matches ? parseInt(matches[1], 10) : 0
}

// fetch api stuff
const requestWithFetch = (options, url, payload, callback) => {
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
    if (options.cdnType === 'standard' && response.status === 404 && (!response.headers || !response.headers.get('x-cache'))) {
      resourceNotExisting = true
      return callback(null, { status: 200, data: '{}', resourceNotExisting })
    }
    if (!response.ok) return callback(response.statusText || 'Error', { status: response.status, resourceNotExisting })

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
const requestWithXmlHttpRequest = (options, url, payload, callback) => {
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
      if (options.cdnType === 'standard' && x.status === 404 && !x.getResponseHeader('x-cache')) {
        resourceNotExisting = true
        return x.readyState > 3 && callback(null, { status: 200, data: '{}', resourceNotExisting })
      }
      const cacheControl = x.getResponseHeader('Cache-Control')
      x.readyState > 3 && callback(x.status >= 400 ? x.statusText : null, { status: x.status, data: x.responseText, resourceNotExisting, cacheControl })
    }
    x.send(JSON.stringify(payload))
  } catch (e) {
    console && console.log(e)
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

  if (typeof XMLHttpRequest === 'function' || typeof XMLHttpRequest === 'object' || typeof ActiveXObject === 'function') {
    // use xml http request
    return requestWithXmlHttpRequest(options, url, payload, callback)
  }

  // import('node-fetch').then((fetch) => {
  //   fetchApi = fetch.default || fetch // because of strange export of node-fetch
  //   requestWithFetch(options, url, payload, callback)
  // }).catch(callback)

  callback(new Error('No fetch and no xhr implementation found!'))
}

export default request
