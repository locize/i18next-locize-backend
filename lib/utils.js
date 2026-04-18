const arr = []
const each = arr.forEach
const slice = arr.slice

export const UNSAFE_KEYS = ['__proto__', 'constructor', 'prototype']

export function defaults (obj) {
  each.call(slice.call(arguments, 1), (source) => {
    if (source) {
      for (const prop of Object.keys(source)) {
        if (UNSAFE_KEYS.indexOf(prop) > -1) continue
        if (obj[prop] === undefined) obj[prop] = source[prop]
      }
    }
  })
  return obj
}

// Returns true if `v` can be safely interpolated into a URL path segment.
// Denylist approach — blocks path traversal, path separators, URL-structure
// characters, control characters, prototype keys, and oversized inputs.
// `+` is allowed (used by callers to join multiple languages/namespaces).
export function isSafeUrlSegment (v) {
  if (typeof v !== 'string') return false
  if (v.length === 0 || v.length > 128) return false
  if (UNSAFE_KEYS.indexOf(v) > -1) return false
  if (v.indexOf('..') > -1) return false
  if (v.indexOf('/') > -1 || v.indexOf('\\') > -1) return false
  if (/[?#%\s@]/.test(v)) return false
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(v)) return false
  return true
}

// Strip control characters from a string before it goes into an error
// message / log line (CWE-117).
export function sanitizeLogValue (v) {
  if (typeof v !== 'string') return v
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\r\n\x00-\x1F\x7F]/g, ' ')
}

// Redact user:password from a URL-like string before logging it.
export function redactUrlCredentials (u) {
  if (typeof u !== 'string' || u.length === 0) return u
  try {
    const parsed = new URL(u)
    if (parsed.username || parsed.password) {
      parsed.username = ''
      parsed.password = ''
      return parsed.toString()
    }
    return u
  } catch (e) {
    return u.replace(/(\/\/)[^/@\s]+@/g, '$1')
  }
}

export function debounce (func, wait, immediate) {
  let timeout
  return function () {
    const context = this; const args = arguments
    const later = function () {
      timeout = null
      if (!immediate) func.apply(context, args)
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func.apply(context, args)
  }
};

function getLastOfPath (object, path, Empty) {
  function cleanKey (key) {
    return (key && key.indexOf('###') > -1) ? key.replace(/###/g, '.') : key
  }

  const stack = (typeof path !== 'string') ? [].concat(path) : path.split('.')
  while (stack.length > 1) {
    if (!object) return {}

    const key = cleanKey(stack.shift())
    if (!object[key] && Empty) object[key] = new Empty()
    object = object[key]
  }

  if (!object) return {}
  return {
    obj: object,
    k: cleanKey(stack.shift())
  }
}

export function setPath (object, path, newValue) {
  const { obj, k } = getLastOfPath(object, path, Object)

  obj[k] = newValue
}

export function pushPath (object, path, newValue, concat) {
  const { obj, k } = getLastOfPath(object, path, Object)

  obj[k] = obj[k] || []
  if (concat) obj[k] = obj[k].concat(newValue)
  if (!concat) obj[k].push(newValue)
}

export function getPath (object, path) {
  const { obj, k } = getLastOfPath(object, path)

  if (!obj) return undefined
  return obj[k]
}

// eslint-disable-next-line prefer-regex-literals
const regexp = new RegExp('{{(.+?)}}', 'g')

function makeString (object) {
  if (object == null) return ''
  return '' + object
}

export function interpolate (str, data, lng) {
  let match, value

  function regexSafe (val) {
    return val.replace(/\$/g, '$$$$')
  }

  // regular escape on demand
  // eslint-disable-next-line no-cond-assign
  while (match = regexp.exec(str)) {
    value = match[1].trim()
    if (typeof value !== 'string') value = makeString(value)
    if (!value) value = ''
    value = regexSafe(value)
    // Skip prototype-chain key lookups on `data` — a polluted
    // Object.prototype.__proto__ would otherwise leak into the substitution.
    const subst = UNSAFE_KEYS.indexOf(value) > -1 ? value : (data[value] || value)
    str = str.replace(match[0], subst)
    regexp.lastIndex = 0
  }
  return str
}

// URL-specific variant: reject values that fail isSafeUrlSegment. Returns
// `null` if any substitution is unsafe — callers bail out rather than issue
// the HTTP request. Multi-value `+` joins are validated per segment.
export function interpolateUrl (str, data) {
  let match
  let unsafe = false
  // eslint-disable-next-line no-cond-assign
  while (match = regexp.exec(str)) {
    const key = match[1].trim()
    if (UNSAFE_KEYS.indexOf(key) > -1) {
      regexp.lastIndex = 0
      continue
    }
    const raw = data[key]
    if (raw == null) {
      regexp.lastIndex = 0
      continue
    }
    const value = makeString(raw)
    // validate each + -separated segment independently
    const segments = value.split('+')
    let segmentsOk = true
    for (const seg of segments) {
      if (!isSafeUrlSegment(seg)) { segmentsOk = false; break }
    }
    if (!segmentsOk) {
      unsafe = true
      break
    }
    str = str.replace(match[0], segments.join('+'))
    regexp.lastIndex = 0
  }
  regexp.lastIndex = 0
  return unsafe ? null : str
}

export function isMissingOption (obj, props) {
  return props.reduce((mem, p) => {
    if (mem) return mem
    if (!obj || !obj[p] || typeof obj[p] !== 'string' || !obj[p].toLowerCase() === p.toLowerCase()) {
      const err = `i18next-locize-backend :: got "${obj[p]}" in options for ${p} which is invalid.`
      console.warn(err)
      return err
    }
    return false
  }, false)
}

export function optionExist (obj, props) {
  return !isMissingOption(obj, props)
}

// http://lea.verou.me/2016/12/resolve-promises-externally-with-this-one-weird-trick/
export function defer () {
  let res
  let rej

  const promise = new Promise((resolve, reject) => {
    res = resolve
    rej = reject
  })

  promise.resolve = res
  promise.reject = rej

  return promise
}
