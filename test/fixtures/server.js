import expect from 'expect.js'
import jsonServer from 'json-server'
let js

const server = (done) => {
  if (js) return done(null, js)

  js = jsonServer.create()

  js.use(jsonServer.bodyParser)

  js.get('/locales/en/test', (req, res) => {
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
  })
}

export default server
