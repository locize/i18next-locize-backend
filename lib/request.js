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
    const resourceNotExisting = response.headers && response.headers.get('x-cache') === 'Error from cloudfront'
    if (!response.ok) return callback(response.statusText || 'Error', { status: response.status, resourceNotExisting })
    response.text().then((data) => {
      callback(null, { status: response.status, data, resourceNotExisting })
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
      const resourceNotExisting = x.getResponseHeader('x-cache') === 'Error from cloudfront'
      x.readyState > 3 && callback(x.status >= 400 ? x.statusText : null, { status: x.status, data: x.responseText, resourceNotExisting })
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
