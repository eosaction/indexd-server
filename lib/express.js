let debug = require('debug')('express')
let bitcoin = require('bitcoinjs-lib')
let bodyParser = require('body-parser')
let express = require('express')
let parallel = require('run-parallel')
let rpc = require('./rpc')
let types = require('../indexd/types')
let networks = require('./networks')

function Hex256bit(value) {
  return typeof value === 'string' &&
    /^([0-9a-f]{2})+$/i.test(value) &&
    value.length === 64
}

module.exports = function initialize(adapter, opts) {
  let router = new express.Router()
  let network = opts.testnet ? networks.btctestnet : bitcoin.networks.bitcoin

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

  router.get('/a/:address/utxos', (req, res) => {
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
    let scId
    try {
      let script = bitcoin.address.toOutputScript(req.params.address, network)
      scId = bitcoin.crypto.sha256(script).toString('hex')
    } catch (e) {
      return respond(req, res, e)
    }

    let height = resolveNumber(req.query.height)
    let verbose = req.query.verbose ? true : false

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
    let scId
    try {
      let script = bitcoin.address.toOutputScript(req.params.address, network)
      scId = bitcoin.crypto.sha256(script).toString('hex')
    } catch (e) {
      return respond(req, res, 400)
    }

    adapter.seenScriptId(scId, (err, result) => respond(req, res, err, result))
  })

  router.get('/a/:address/txids', (req, res) => {
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

  router.get('/l/:label/addrs', (req, res) => {
    let label
    try {
      let script = bitcoin.address.toOutputScript(req.params.label, network)
      label = bitcoin.crypto.sha256(script).toString('hex')
    } catch (e) {
      return respond(req, res, 400)
    }

    adapter.addToLabel(scId, label, (err) => respond(req, res, err, Boolean(true)))
  })

  router.get('/l/:label/addaddr', (req, res) => {
    let scId
    try {
      let script = bitcoin.address.toOutputScript(req.query.address, network)
      scId = bitcoin.crypto.sha256(script).toString('hex')
    } catch (e) {
      return respond(req, res, 400)
    }

    let label
    try {
      let script = bitcoin.address.toOutputScript(req.params.label, network)
      label = bitcoin.crypto.sha256(script).toString('hex')
    } catch (e) {
      return respond(req, res, 400)
    }

    adapter.addToLabel(scId, label, (err) => respond(req, res, err, Boolean(true)))
  })

  router.get('/l/:label/deladdr', (req, res) => {
    let scId
    try {
      let script = bitcoin.address.toOutputScript(req.query.address, network)
      scId = bitcoin.crypto.sha256(script).toString('hex')
    } catch (e) {
      return respond(req, res, 400)
    }

    let label
    try {
      let script = bitcoin.address.toOutputScript(req.params.label, network)
      label = bitcoin.crypto.sha256(script).toString('hex')
    } catch (e) {
      return respond(req, res, 400)
    }

    adapter.delFromLabel(scId, label, (err) => respond(req, res, err, Boolean(true)))
  })

  router.get('/l/:label/balance', (req, res) => {
    let label
    try {
      let script = bitcoin.address.toOutputScript(req.params.label, network)
      label = bitcoin.crypto.sha256(script).toString('hex')
    } catch (e) {
      return respond(req, res, e)
    }

    let height = 0
    let confirmations = resolveNumber(req.query.confirmations)
    let unconfirmed = req.query.unconfirmed == 'true' || resolveNumber(req.query.unconfirmed) >= 1;

    // add confirmations to utxos
    parallel({
      tip: (cb) => adapter.blockchain.db.get(types.tip, {}, cb),
      scIds: (cb) => adapter.scriptIdsByLabel(label, cb)
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
            let utxo = utxos[key][0]
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
          }
        })

        respond(req, res, null, balance)
      });
    })
  })

  router.get('/l/:label/utxos', (req, res) => {
    let label
    try {
      let script = bitcoin.address.toOutputScript(req.params.label, network)
      label = bitcoin.crypto.sha256(script).toString('hex')
    } catch (e) {
      return respond(req, res, e)
    }

    let height = 0

    // add confirmations to utxos
    parallel({
      tip: (cb) => adapter.blockchain.db.get(types.tip, {}, cb),
      scIds: (cb) => adapter.scriptIdsByLabel(label, cb)
    }, (err, results) => {
      if (err) return respond(req, res, err)

      let tipHeight = results.tip.height

      let tasks = {}
      results.scIds.forEach(scId => {
        tasks[scId] = (next) => adapter.utxosByScriptId(scId, height, next)
      })

      parallel(tasks, (err, results) => {
        if (err) return respond(req, res, err)

        let utxos = []

        Object.keys(results).forEach(function (key) {
          if (results[key].length > 0) {
            let utxo = results[key][0]
            let height = utxo.height
            if (height && height <= tipHeight) {
              utxo.confirmations = tipHeight - height + 1
            } else {
              utxo.confirmations = 0
            }
            // we don't care about the scId
            delete utxo.scId
            utxos.push(utxo)
          }
        })

        respond(req, res, null, utxos)
      });
    })
  })

  router.get('/l/:label/txs', (req, res) => {
    let label
    try {
      let script = bitcoin.address.toOutputScript(req.params.label, network)
      label = bitcoin.crypto.sha256(script).toString('hex')
    } catch (e) {
      return respond(req, res, e)
    }

    let height = resolveNumber(req.query.height)
    let verbose = req.query.verbose ? true : false

    adapter.scriptIdsByLabel(label, (err, scIds) => {
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
    rpc('sendrawtransaction', [req.body], (err) => respond(req, res, err, undefined, /./))
  })

  return router
}