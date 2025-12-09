import expect from 'expect.js'
import jsonServer from 'json-server'
let js

const server = (done) => {
  if (js) return done(null, js)

  js = jsonServer.create()
  js.use((req, res, next) => {
    // disable keep alive so the test server can close quickly.
    res.setHeader('Connection', 'close')
    next()
  })

  js.use(jsonServer.bodyParser)

  js.get('/locales/en/empty', (req, res) => {
    res.jsonp({})
  })
  js.get('/locales/en/nonexistingempty', (req, res) => {
    res.setHeader('x-cache', 'Error from cloudfront')
    res.jsonp({})
  })
  js.get('/locales/en/nonexisting404', (req, res) => {
    res.sendStatus(404)
  })
  js.get('/locales/en/test', (req, res) => {
    res.jsonp({
      key: 'passing'
    })
  })
  js.get('/locales/en/testwithcache', (req, res) => {
    if (req.query.cache === 'no') {
      res.setHeader('Cache-Control', 'public, stale-while-revalidate=1, max-age=0, s-maxage=3')
    } else {
      res.setHeader('Cache-Control', 'public, stale-while-revalidate=360, max-age=3600, s-maxage=3060')
    }
    res.jsonp({
      key: 'passing'
    })
  })
  js.get('/locales/en/nonjson', (req, res) => {
    res.send('<div>sorry no json file</div>')
  })
  js.get('/locales/en/test5', (req, res) => {
    res.send(`{ // this is json5, comments is stripped
      key: passing  // keys can be without
    }`)
  })
  js.get('/languages/test', (req, res) => {
    res.jsonp({
      en: {
        name: 'English',
        nativeName: 'English',
        isReferenceLanguage: true,
        translated: {
          latest: 1
        }
      },
      de: {
        name: 'German',
        nativeName: 'Deutsch',
        isReferenceLanguage: false,
        translated: {
          latest: 0.9
        }
      }
    })
  })
  js.post('/add/test/latest/en/translation', (req, res) => {
    expect(req.body).not.to.eql({})
    res.jsonp()
  })
  js.use(jsonServer.defaults())
  js.listen(6001, () => {
    console.log('JSON Server is running')
    done(null, js)
  }).unref()
}

export default server
