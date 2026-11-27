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

// Returns true if `v` can be interpolated into a URL path segment once
// interpolateUrl has percent-encoded it. Denylist approach, close to what the
// Locize server refuses in a new version, language or namespace name: path
// traversal (`..`), path separators, control characters and prototype keys.
// The server also refuses `"` in new names; that is left to it here. Refused
// here on top: a lone `.` (the URL parser drops it as a dot segment), the line
// separators U+0085, U+2028 and U+2029 (values reach log lines unsanitised),
// and more than 128 characters. Spaces, `?`, `#`, `%`, `@`, `:`, `&`, `=` and
// `;` are allowed: encoding turns them into data.
// Sister copy: i18next-http-backend lib/utils.js still refuses spaces and
// URL-structure characters; it talks to any server and cannot know which
// names that server accepts.
export function isSafeUrlSegment (v) {
  if (typeof v !== 'string') return false
  if (v.length === 0 || v.length > 128) return false
  if (UNSAFE_KEYS.indexOf(v) > -1) return false
  if (v === '.' || v.indexOf('..') > -1) return false
  if (v.indexOf('/') > -1 || v.indexOf('\\') > -1) return false
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F\u0085\u2028\u2029]/.test(v)) return false
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
    // guard against prototype pollution — refuse to traverse __proto__,
    // constructor or prototype segments. Returning an empty result lets
    // callers drop the write silently rather than walking into Object.prototype.
    if (UNSAFE_KEYS.indexOf(key) > -1) return {}
    if (!object[key] && Empty) object[key] = new Empty()
    object = object[key]
  }

  if (!object) return {}
  const k = cleanKey(stack.shift())
  if (UNSAFE_KEYS.indexOf(k) > -1) return {}
  return { obj: object, k }
}

export function setPath (object, path, newValue) {
  const { obj, k } = getLastOfPath(object, path, Object)
  if (obj === undefined) return // unsafe path — drop silently

  obj[k] = newValue
}

export function pushPath (object, path, newValue, concat) {
  const { obj, k } = getLastOfPath(object, path, Object)
  if (obj === undefined) return // unsafe path — drop silently

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

// URL-specific variant: reject values that fail isSafeUrlSegment and
// percent-encode the rest with encodeURIComponent, the same encoding the Locize
// publish uses for its CDN invalidation paths. Returns `null` if any
// substitution is unsafe — callers bail out rather than issue the HTTP request.
// Multi-value `+` joins are validated and encoded per segment, the `+` itself
// stays as it is.
// Encoding keeps the URL-injection fixes of 10.0.3 / 10.0.4: `:` becomes
// `%3A`, so a value like `http:127.0.0.1:8080` in a template that starts with
// the placeholder (`{{lng}}/{{ns}}`) cannot make the URL absolute
// (i18next-http-backend GHSA-xvq9-wjp8-hwqf); `&`, `=`, `;`, `?` and `#`
// become `%26`, `%3D`, `%3B`, `%3F` and `%23`, so `de&ns=private` cannot add a
// query parameter (GHSA-3cmx-xjww-583x); `%` becomes `%25`, so `%2e%2e` or
// `a%2fb` arrive as those literal names, never as `..` or `/`.
// Single pass on purpose: substituted text is never re-scanned, so a value
// that contains its own placeholder (literally `{{lng}}`) cannot re-match
// and loop forever.
export function interpolateUrl (str, data) {
  let unsafe = false
  const out = str.replace(regexp, (match, key) => {
    const k = key.trim()
    if (UNSAFE_KEYS.indexOf(k) > -1) return match
    const raw = data[k]
    if (raw == null) return match
    const segments = makeString(raw).split('+')
    try {
      if (segments.every(isSafeUrlSegment)) return segments.map(encodeURIComponent).join('+')
    } catch (e) {} // a lone surrogate: encodeURIComponent throws a URIError
    unsafe = true
    return match
  })
  return unsafe ? null : out
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
