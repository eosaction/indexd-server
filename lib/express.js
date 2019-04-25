let debug = require('debug')('express')
let bitcoin = require('bitcoinjs-lib')
let bodyParser = require('body-parser')
let express = require('express')
let parallel = require('run-parallel')
let rpc = require('./rpc')
let types = require('../indexd/types')
const CoinData = require("./../bip39/src/coindata");
let hdwsdk = require('./../bip39/src/hdwsdk')
let bcoinsdk = require('./../bip39/src/bcoinsdk')

function Hex256bit(value) {
  return typeof value === 'string' &&
    /^([0-9a-f]{2})+$/i.test(value) &&
    value.length === 64
}

module.exports = function initialize(adapter, opts) {
  let router = new express.Router()
  let secret = opts.secret
  let currency = opts.currency
  let coinDataX = CoinData[currency]
  let network = coinDataX.network
  let fromAccount = opts.fromAccount

  function isBCH() {
    return currency == 'bch' || currency == 'bchtest';
  }

  function respond(req, res, err, result) {
    if (err) debug('ERR: ' + req.path, err)
    if (err) {
      let errMsg
      if (typeof err === 'number') {
        res.status(err)
      } else {
        if (typeof err === 'object' && err.message) {
          res.status((err.status && typeof err.status === 'number') ? err.status : 400)
          errMsg = '' + err.message
        } else {
          res.status(400)
          errMsg = '' + err
        }
      }
      res.json({
        error: errMsg
      })
      return res.end()
    }

    res.status(200)
    if (result !== undefined) {
      if (typeof result === 'string') res.send(result)
      else if (Buffer.isBuffer(result)) res.send(result)
      else res.json(result)
    }
    res.end()
  }

  function resolveNumber(numberQuery) {
    let number = parseInt(numberQuery)
    if (!Number.isFinite(number)) number = 0
    return number
  }

  router.get('/status', (req, res) => {
    parallel({
      localtip: (cb) => adapter.blockchain.db.get(types.tip, {}, cb),
      bitcoinheight: (cb) => rpc('getblockcount', [], cb)
    }, (err, results) => {
      if (err) return respond(req, res, err)

      let localheight = results.localtip ? results.localtip.height : 0
      let bitcoinheight = results.bitcoinheight
      status = {
        chainBlock: bitcoinheight,
        indexBlock: localheight,
        blocksBehind: (bitcoinheight && localheight) ? (bitcoinheight - localheight) : null,
        ready: bitcoinheight && localheight && (bitcoinheight - localheight) <= 1,
      }

      respond(req, res, null, status)
    })
  })

  router.get('/b/height', (req, res) => {
    rpc('getblockcount', [], (err, result) => respond(req, res, err, result))
  })

  router.get('/a/:address/utxos', (req, res) => {
    if (isBCH()) {
      let legacyAddress = bcoinsdk.bcoin.toLegacyAddressForBCH(req.params.address)
      if (legacyAddress.status) {
        req.params.address = legacyAddress.data
      }
    }
    let scId
    try {
      let script = bitcoin.address.toOutputScript(req.params.address, network)
      scId = bitcoin.crypto.sha256(script).toString('hex')
    } catch (e) {
      return respond(req, res, e)
    }

    let height = resolveNumber(req.query.height)

    // add confirmations to utxos
    parallel({
      tip: (cb) => adapter.blockchain.db.get(types.tip, {}, cb),
      utxos: (cb) => adapter.utxosByScriptId(scId, height, cb)
    }, (err, results) => {
      if (err) return respond(req, res, err)

      let tipHeight = results.tip.height
      let utxos = []

      Object.keys(results.utxos).forEach(function (key) {
        let utxo = results.utxos[key]
        let height = utxo.height
        if (height && height <= tipHeight) {
          utxo.confirmations = tipHeight - height + 1
        } else {
          utxo.confirmations = 0
        }

        // we don't care about the scId
        delete utxo.scId

        utxos.push(utxo)
      })
      respond(req, res, null, utxos)
    })
  })

  router.get('/a/:address/txs', (req, res) => {
    if (isBCH()) {
      try {
        let legacyAddress = bcoinsdk.bcoin.toLegacyAddressForBCH(req.params.address)
        if (legacyAddress.status) {
          req.params.address = legacyAddress.data
        }
      } catch (error) {
        return respond(req, res, 400)
      }
    }
    let scId
    try {
      let script = bitcoin.address.toOutputScript(req.params.address, network)
      scId = bitcoin.crypto.sha256(script).toString('hex')
    } catch (e) {
      return respond(req, res, e)
    }

    let height = resolveNumber(req.query.height)
    let verbose = req.query.verbose && req.query.verbose == '1' ? true : false

    adapter.transactionIdsByScriptId(scId, height, (err, txIdSet) => {
      if (err) return respond(req, res, err)

      let tasks = {}
      for (let txId in txIdSet) {
        tasks[txId] = (next) => rpc('getrawtransaction', [txId, verbose], next)
      }

      parallel(tasks, (err, result) => respond(req, res, err, result))
    })
  })

  router.get('/a/:address/balance', (req, res) => {
    if (isBCH()) {
      try {
        let legacyAddress = bcoinsdk.bcoin.toLegacyAddressForBCH(req.params.address)
        if (legacyAddress.status) {
          req.params.address = legacyAddress.data
        }
      } catch (error) {
        return respond(req, res, 400)
      }
    }
    let scId
    try {
      let script = bitcoin.address.toOutputScript(req.params.address, network)
      scId = bitcoin.crypto.sha256(script).toString('hex')
    } catch (e) {
      return respond(req, res, e)
    }

    let height = 0
    let confirmations = resolveNumber(req.query.confirmations)
    let unconfirmed = req.query.unconfirmed == 'true' || resolveNumber(req.query.unconfirmed) >= 1;

    // add confirmations to utxos
    parallel({
      tip: (cb) => adapter.blockchain.db.get(types.tip, {}, cb),
      utxos: (cb) => adapter.utxosByScriptId(scId, height, cb)
    }, (err, results) => {
      if (err) return respond(req, res, err)

      let tipHeight = results.tip.height
      let balance = 0

      Object.keys(results.utxos).forEach(function (key) {
        let utxo = results.utxos[key]
        let height = utxo.height
        if (height && height <= tipHeight) {
          utxo.confirmations = tipHeight - height + 1
        } else {
          utxo.confirmations = 0
        }
        //only cal unconfirmations
        if (unconfirmed && utxo.confirmations == 0) {
          balance += utxo.value
        } else if (utxo.confirmations >= confirmations) {
          balance += utxo.value
        }
        delete utxo
      })

      respond(req, res, null, balance)
    })
  })

  router.get('/a/:address/checktx', (req, res) => {
    if (isBCH()) {
      try {
        let legacyAddress = bcoinsdk.bcoin.toLegacyAddressForBCH(req.params.address)
        if (legacyAddress.status) {
          req.params.address = legacyAddress.data
        }
      } catch (error) {
        return respond(req, res, 400)
      }
    }
    let scId
    try {
      let script = bitcoin.address.toOutputScript(req.params.address, network)
      scId = bitcoin.crypto.sha256(script).toString('hex')
    } catch (e) {
      return respond(req, res, 400)
    }

    adapter.seenScriptId(scId, (err, result) => {
      if (isBCH()) {
        result = result.map(a => bcoinsdk.bcoin.toCashAddressForBCH(a).data)
      }
      return respond(req, res, err, result)
    })
  })

  router.post('/a/checktx', bodyParser.json(), (req, res) => {
    if (req.body.addresses == undefined) {
      return respond(req, res, 400)
    }

    let scIds = {}
    req.body.addresses.forEach(address => {
      try {
        if (isBCH()) {
          let legacyAddress = bcoinsdk.bcoin.toLegacyAddressForBCH(address)
          if (legacyAddress.status) {
            address = legacyAddress.data
          }
        }
        let script = bitcoin.address.toOutputScript(address, network)
        let scId = bitcoin.crypto.sha256(script).toString('hex')
        scIds[scId] = address
      } catch (e) { }
    })

    let tasks = {}
    Object.keys(scIds).forEach(scId => {
      tasks[scId] = (next) => adapter.seenScriptId(scId, next)
    })

    parallel(tasks, (err, results) => {
      if (err) return respond(req, res, err)

      let addresses = []
      Object.keys(results).forEach(function (key) {
        if (results[key]) {
          addresses.push(scIds[key])
        }
      })

      if (isBCH()) {
        addresses = addresses.map(a => bcoinsdk.bcoin.toCashAddressForBCH(a).data)
      }

      respond(req, res, null, addresses)
    });
  });

  router.get('/a/:address/txids', (req, res) => {
    if (isBCH()) {
      try {
        let legacyAddress = bcoinsdk.bcoin.toLegacyAddressForBCH(req.params.address)
        if (legacyAddress.status) {
          req.params.address = legacyAddress.data
        }
      } catch (error) {
        return respond(req, res, 400)
      }
    }
    let scId
    try {
      let script = bitcoin.address.toOutputScript(req.params.address, network)
      scId = bitcoin.crypto.sha256(script).toString('hex')
    } catch (e) {
      return respond(req, res, 400)
    }

    let height = parseInt(req.query.height)
    if (!Number.isFinite(height)) height = 0

    let limit = parseInt(req.query.limit)
    if (!Number.isFinite(limit)) limit = 10
    let distinct = req.query.distinct ? true : false

    if (!distinct)
      adapter.transactionIdsByScriptId(scId, height, (err, txIdSet) => respond(req, res, err, Object.keys(txIdSet)), limit)
    else
      adapter.transactionIdListFromScriptId(scId, height, (err, txIdSet) => respond(req, res, err, Object.keys(txIdSet)), limit)
  })

  router.get('/x/:xpubKey/addrs', (req, res) => {
    if (secret && req.query.secret != secret) {
      return respond(req, res, 401)
    }
    var params = {
      xpubKey: '',
      change: 0,
      start: 0,
      end: 0,
      currency: ''
    };
    params = Object.assign(params, req.params || {});
    params = Object.assign(params, req.query || {});

    var addresses = hdwsdk.hdWallet.generateAddressesByXpubKey({
      xpubKey: params.xpubKey,
      currency: currency,
      change: params.change,
      start: params.start,
      end: params.end
    })

    if (isBCH()) {
      addresses.data = addresses.data.map(d => bcoinsdk.bcoin.toCashAddressForBCH(d).data);
    }

    respond(req, res, null, addresses)
  })

  router.get('/x/:xpubKey/newaddr', (req, res) => {
    if (secret && req.query.secret != secret) {
      return respond(req, res, 401)
    }
    var params = {
      xpubKey: '',
      currency: '',
      change: 0,
      start: 0
    };
    params = Object.assign(params, req.params || {});
    params = Object.assign(params, req.query || {});

    let xpubKeyHex
    try {
      xpubKeyHex = bitcoin.crypto.sha256(params.xpubKey).toString('hex')
    } catch (e) {
      return respond(req, res, 400)
    }

    let start = resolveNumber(params.start)
    checktx(params, start, xpubKeyHex, (err, result) => respond(req, res, err, result));
  })

  router.post('/x/:xpubKey/checkaddrs', bodyParser.json(), (req, res) => {
    if (req.body.addresses == undefined) {
      return respond(req, res, 400)
    }

    let scIds = {}

    req.body.addresses.forEach(address => {
      try {
        if (isBCH()) {
          let legacyAddress = bcoinsdk.bcoin.toLegacyAddressForBCH(address)
          if (legacyAddress.status) {
            address = legacyAddress.data
          }
        }
        let script = bitcoin.address.toOutputScript(address, network)
        let scId = bitcoin.crypto.sha256(script).toString('hex')
        scIds[scId] = address
      } catch (e) { }
    })

    let xpubKeyHex
    try {
      xpubKeyHex = bitcoin.crypto.sha256(req.params.xpubKey).toString('hex')
    } catch (e) {
      return respond(req, res, 400)
    }

    let tasks = {}
    Object.keys(scIds).forEach(scId => {
      tasks[scId] = (next) => adapter.seenScriptIdByXpubKey(xpubKeyHex, scId, next)
    })

    parallel(tasks, (err, results) => {
      if (err) return respond(req, res, err)

      let addresses = []
      Object.keys(results).forEach(function (key) {
        if (results[key]) {
          addresses.push(scIds[key])
        }
      })

      respond(req, res, null, addresses)
    });
  });

  router.get('/x/:xpubKey/import', (req, res) => {
    if (secret && req.query.secret != secret) {
      return respond(req, res, 401)
    }
    var params = {
      xpubKey: '',
      currency: '',
      change: 0,
      start: 0
    };
    params = Object.assign(params, req.params || {});
    params = Object.assign(params, req.query || {});

    let xpubKeyHex
    try {
      xpubKeyHex = bitcoin.crypto.sha256(params.xpubKey).toString('hex')
    } catch (e) {
      return respond(req, res, 400)
    }

    let start = resolveNumber(params.start)
    doImport(params, start, 0, xpubKeyHex, (err, result) => respond(req, res, err, result));
  });

  function checktx(params, start, xpubKeyHex, callback) {
    let query = {
      xpubKey: params.xpubKey,
      currency: currency,
      change: params.change,
      start: start,
      end: start
    }
    var addresses = hdwsdk.hdWallet.generateAddressesByXpubKey(query)
    let address = addresses.data[0]
    let script = bitcoin.address.toOutputScript(address, network)
    let scId = bitcoin.crypto.sha256(script).toString('hex')

    adapter.seenScriptId(scId, (err, result) => {
      if (err) return callback(err)
      adapter.addToXpubKey(scId, xpubKeyHex, (serr) => {
        if (serr) return callback(serr)
        if (result) {
          checktx(params, start + 1, xpubKeyHex, callback)
        } else {
          callback(null, {
            index: start,
            address: isBCH() ? bcoinsdk.bcoin.toCashAddressForBCH(address) : address
          })
        }
      })
    });
  }

  function doImport(params, start, len, xpubKeyHex, callback) {
    let query = {
      xpubKey: params.xpubKey,
      currency: currency,
      change: params.change,
      start: start,
      end: start
    }
    var addresses = hdwsdk.hdWallet.generateAddressesByXpubKey(query)
    let address = addresses.data[0]
    let script = bitcoin.address.toOutputScript(address, network)
    let scId = bitcoin.crypto.sha256(script).toString('hex')

    adapter.seenScriptId(scId, (err, result) => {
      if (err) return callback(err)
      adapter.addToXpubKey(scId, xpubKeyHex, (serr) => {
        if (serr) return callback(serr)
        if (result) {
          doImport(params, start + 1, 0, xpubKeyHex, callback)
        } else {
          if (len < 10) {
            doImport(params, start + 1, len + 1, xpubKeyHex, callback)
          } else {
            callback(null, {
              index: start,
              address: isBCH() ? bcoinsdk.bcoin.toCashAddressForBCH(address) : address
            })
          }
        }
      })
    });
  }

  router.get('/x/:xpubKey/balance', (req, res) => {
    let xpubKey
    try {
      xpubKey = bitcoin.crypto.sha256(req.params.xpubKey).toString('hex')
    } catch (e) {
      return respond(req, res, e)
    }

    let height = 0
    let confirmations = resolveNumber(req.query.confirmations)
    let unconfirmed = req.query.unconfirmed == 'true' || resolveNumber(req.query.unconfirmed) >= 1;

    // add confirmations to utxos
    parallel({
      tip: (cb) => adapter.blockchain.db.get(types.tip, {}, cb),
      scIds: (cb) => adapter.scriptIdsByXpubKey(xpubKey, cb)
    }, (err, results) => {
      if (err) return respond(req, res, err)

      let tasks = {}
      results.scIds.forEach(scId => {
        tasks[scId] = (next) => adapter.utxosByScriptId(scId, height, next)
      })

      parallel(tasks, (err, utxos) => {
        if (err) return respond(req, res, err)

        let tipHeight = results.tip.height
        let balance = 0

        Object.keys(utxos).forEach(function (key) {
          if (utxos[key].length > 0) {
            utxos[key].forEach(function (utxo) {
              let height = utxo.height
              if (height && height <= tipHeight) {
                utxo.confirmations = tipHeight - height + 1
              } else {
                utxo.confirmations = 0
              }
              //only cal unconfirmations
              if (unconfirmed && utxo.confirmations == 0) {
                balance += utxo.value
              } else if (utxo.confirmations >= confirmations) {
                balance += utxo.value
              }
              //delete utxo
            });
          }
        })

        respond(req, res, null, balance)
      });
    })
  })

  router.get('/x/:xpubKey/utxos', (req, res) => {
    let xpubKey
    try {
      xpubKey = bitcoin.crypto.sha256(req.params.xpubKey).toString('hex')
    } catch (e) {
      return respond(req, res, e)
    }

    let height = 0

    // add confirmations to utxos
    parallel({
      tip: (cb) => adapter.blockchain.db.get(types.tip, {}, cb),
      scIds: (cb) => adapter.scriptIdsByXpubKey(xpubKey, cb)
    }, (err, results) => {
      if (err) return respond(req, res, err)

      let tipHeight = results.tip.height

      let tasks = {}
      results.scIds.forEach(scId => {
        tasks[scId] = (next) => adapter.utxosByScriptId(scId, height, next)
      })

      parallel(tasks, (err, utxoResults) => {
        if (err) return respond(req, res, err)

        let utxos = []

        Object.keys(utxoResults).forEach(function (key) {
          if (utxoResults[key].length > 0) {
            utxoResults[key].forEach(function (utxo) {
              let height = utxo.height
              if (height && height <= tipHeight) {
                utxo.confirmations = tipHeight - height + 1
              } else {
                utxo.confirmations = 0
              }
              // we don't care about the scId
              delete utxo.scId
              utxos.push(utxo)
            })
          }
        })

        respond(req, res, null, utxos)
      });
    })
  })

  router.get('/x/:xpubKey/txs', (req, res) => {
    let xpubKey
    try {
      xpubKey = bitcoin.crypto.sha256(req.params.xpubKey).toString('hex')
    } catch (e) {
      return respond(req, res, e)
    }

    let height = resolveNumber(req.query.height)
    let verbose = req.query.verbose && req.query.verbose == '1' ? true : false

    adapter.scriptIdsByXpubKey(xpubKey, (err, scIds) => {
      if (err) return respond(req, res, err)

      let task1s = {}
      scIds.forEach(scId => {
        task1s[scId] = (next) => adapter.transactionIdsByScriptId(scId, height, next)
      })

      parallel(task1s, (err, txIdSet) => {
        if (err) return respond(req, res, err)

        let task2s = {}
        for (let txIdObj in txIdSet) {
          for (let txId in txIdSet[txIdObj]) {
            task2s[txId] = (next) => rpc('getrawtransaction', [txId, verbose], next)
          }
        }

        parallel(task2s, (err, result) => respond(req, res, err, result))
      });
    })
  })

  router.post('/t/push', bodyParser.text(), (req, res) => {
    if (fromAccount) {
      rpc('sendrawtransaction', [fromAccount, req.body, false], (err, result) => {
        respond(req, res, err, result)
      })
    } else {
      rpc('sendrawtransaction', [req.body, false], (err, result) => {
        respond(req, res, err, result)
      })
    }
  })

  router.get('/t/:id', (req, res) => {
    if (!Hex256bit(req.params.id)) return res.status(400).end()
    let verbose = req.query.verbose && req.query.verbose == '1' ? true : false
    rpc('getrawtransaction', [req.params.id, verbose], (err, result) => respond(req, res, err, result))
  })

  router.get('/t/:id/block', (req, res) => {
    if (!Hex256bit(req.params.id)) return res.status(400).end()

    adapter.blockIdByTransactionId(req.params.id, (err, result) => respond(req, res, err, result))
  })

  return router
}