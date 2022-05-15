const arr = []
const each = arr.forEach
const slice = arr.slice

export function defaults (obj) {
  each.call(slice.call(arguments, 1), (source) => {
    if (source) {
      for (const prop in source) {
        if (obj[prop] === undefined) obj[prop] = source[prop]
      }
    }
  })
  return obj
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
    str = str.replace(match[0], data[value] || value)
    regexp.lastIndex = 0
  }
  return str
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
