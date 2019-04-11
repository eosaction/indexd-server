// dotenv at CONFIG_FILE or .env
let dotenv = require('dotenv')
require('dotenv').load({path: process.env.CONFIG_FILE ? process.env.CONFIG_FILE : '.env'})

let SECRET = process.env.SECRET

let CURRENCY = process.env.CURRENCY

let FROMACCOUNT = process.env.FROMACCOUNT

let debug = require('debug')('index')
let express = require('express')

let service = require('./lib/service')
let api = require('./lib/express')

let app = express()

// run the service
debug(`Initializing blockchain connection ${CURRENCY}`)
service((err, adapter) => {
  if (err) {
    return debug('Initialization failed:', err)
  }

  // start the API server
  debug('starting API server')
  app.use(api(adapter, {secret: SECRET, currency: CURRENCY, fromAccount: FROMACCOUNT}))
  app.listen(process.env.SERVER_PORT);
  debug("App listening on port "+process.env.SERVER_PORT);
})
