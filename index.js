const express = require('express')
const app = express()
const port = 3000
const ejs = require('ejs');
const bodyParser = require('body-parser')
const QRCode = require('qrcode')
const fs = require('fs');
const macaroon = fs.readFileSync('').toString('hex');
const tr = require('tor-request');
const torUrl = '' // insert onion address 
const session = require('express-session');

app.use(session({secret: 'mySecret', resave: false, saveUninitialized: false}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json())
app.use(express.static(__dirname + "/public"));
app.set('view engine', 'ejs')
let isCancelled = false;



app.get('/', (req, res) => {
  let src = ''
  let payment_request = 'Waiting'
  res.render('index', { src, payment_request })
})

app.get('/invoice', (req, res) => {
  isCancelled = false;
  let src = req.session.src
  let payment_request = req.session.invoice.payment_request
  let rhash = req.session.invoice.r_hash
  res.render('invoice', { src, payment_request, rhash, })

})

app.get('/thanks', (req, res) => {
  req.session.destroy(function(err) {
    res.render('thanks')
  })
  
})

app.post('/invoice', (req, res, next) => {
      let amtSats = req.body.sats
      let requestBody = {value: amtSats, expiry: '1800'}
      let options = {
        url: `${torUrl}/v1/invoices`,
        rejectUnauthorized: false,
        json: true, 
        headers: {
          'Grpc-Metadata-macaroon': macaroon,
        },
        form: JSON.stringify(requestBody),
      }
      tr.torRequest.post(options, function(err, resp, body) {
        if(err) {
          console.log(err)
        }
        let invoice = body
        let payment_request = invoice.payment_request
        QRCode.toDataURL(payment_request, function (err, src) {
          if(err) return console.log("error occurred")
          req.session.src = src
          req.session.invoice = invoice
          res.redirect('/invoice')
          })
      })  
  })

  app.post('/verify', (req, res) => {
    const checkSettlement = async (rhash) => {
      try {
      const buffer = Buffer.from(rhash, 'base64')
      let options = {
          url: `${torUrl}/v1/invoice/${buffer.toString('hex')}`,
          rejectUnauthorized: false,
          json: true, 
          headers: {
            'Grpc-Metadata-macaroon': macaroon,
          },
      }
      tr.request(options, function(err, resp, body){
        if(err){
          console.log(err)
        }
        req.session.isSettled = body.state;
        if (req.session.isSettled === 'SETTLED' && isCancelled === false) {
          return res.status(200).send({result: 'redirect', url:'/thanks'})
        }
          else if (isCancelled === true) {
            return;
        } else  {
          console.log(req.session.isSettled)
          checkSettlement(rhash)
        }
      })
    } catch(err) {
      console.log(err)
    }
    }
   checkSettlement(req.session.invoice.r_hash)
  })

app.post('/cancel', (req, res)=> {
  isCancelled = true;
  req.session.destroy(function(err) {
    res.redirect('/')
  })
})








app.listen(process.env.PORT || port, () => {
  console.log(`App is listening on port ${port}`)
})