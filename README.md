# Indexd Server
[![build status](https://secure.travis-ci.org/CounterpartyXCP/indexd-server.png)](http://travis-ci.org/CounterpartyXCP/indexd-server)

A [bitcoind](https://github.com/bitcoin/bitcoin) transaction server.

## Indexes
This server provides an API for unspent transaction outputs for bitcoin addresses.  

## Configuration

### .env file
Copy `.env-example` to `.env` and modify the `.env` file as needed.  To use a custom configuration file, you can specify a file path by setting the `CONFIG_FILE` environment variable to the location of your environment config path.


### bitcoin.conf configuration
Your bitcoin server must have [ZMQ enabled](https://github.com/bitcoin/bitcoin/blob/master/doc/zmq.md).  Then configure `bitcoin.conf` to publish tx and block hashes, like so:

```
zmqpubhashtx=tcp://127.0.0.1:38832
zmqpubhashblock=tcp://127.0.0.1:38832
```

The settings in bitcoin.conf are the "server" settings for the ZMQ publisher.  The ZMQ variable in the `.env` file is the "client" to subscribe to the messages published by bitcoin.


## Install
Install the node dependencies:
```shell
npm install
```

## Run the server
The recommended way to run the server is with [forever](https://www.npmjs.com/package/forever).

```shell
npm -g install forever
forever index.js
```

### UTXOs Endpoint

The utxos API endpoint looks like this:
```
http://localhost:{SERVER_PORT}/a/2N6Zt9392GjJDpx82JWNoYvXDMjVvRYDksL/utxos
```

And returns a response like this:
```json
[
    {
        "txId": "0b3c631c032c0b6923f35f80a3793024179ad04c4f766a9f3067eb1d3efb5de6",
        "vout": 1,
        "value": 59300,
        "height": 1162483,
        "confirmations": 48639
    },
    {
        "txId": "24a6ec05e3edcd46c394c35d8bf47f69d3f626bd819f25c5a2a62de8ebc64827",
        "vout": 1,
        "value": 10000000,
        "confirmations": 0
    }
]
```

### Transactions Endpoint


The transactions API endpoint looks like this:
```
http://localhost:{SERVER_PORT}/a/2N6Zt9392GjJDpx82JWNoYvXDMjVvRYDksL/txs
```

And returns a response like this:
```json
{
    "00ef1c20ed31967bba657add442fe31f0c911a1ee12b8ca6b01c7bb336f50dbe": "010000000138000b78c1da461aa8e615474734477bb526c4a748bd7afa2d24d19a2516652600000000fdfe0000483045022100c6745056ac217d56191eb89fd15462a1431058bc6576265b679b4a68eca27e1e02200fdc3072f18bcae804bc824cf66c2eb6bedbd602d9301ad094d7cb1cebac623d01483045022100c3a22a1c219b6b0266d62b94b990f39eb6bdd401189fd283188d1795c6faee9802201e7f9119c137595ac088f1831417a63ce4270341ef4a6873f6729e8b6365c539014c69522103e3996bbfaee29838287a46d73e348f30709c2a60148cf23aa1bed935b2bcc52d2103ab3f25a845c772718d11af25e5e90554515ffc84be1de8480132bb7b39fe616b2102e8efe29657bcc985b071e3f22c65a7059cc63645bffdd831a6363d338abb5a2653aeffffffff02e8604800000000001976a9149d24230ec8c79f11f035533b7055b48071bb228488ac062750000000000017a9142d0cd3469b56303a4d9e63b17e23b2ed1d3a15928700000000"
}
```


The transactions API also accepts a verbose query parameter like this:
```
http://localhost:{SERVER_PORT}/a/2N6Zt9392GjJDpx82JWNoYvXDMjVvRYDksL/txs?verbose=1
```

And returns a response like this:

```json
{
    "00ef1c20ed31967bba657add442fe31f0c911a1ee12b8ca6b01c7bb336f50dbe": {
        "blockhash": "0000000000b226562a42151634455441e4446857dba7e3fd3f3c5ced86754a1a",
        "blocktime": 1504967988,
        "confirmations": 30704,
        "hash": "00ef1c20ed31967bba657add442fe31f0c911a1ee12b8ca6b01c7bb336f50dbe",
        "hex": "010000000138000b78c1da461aa8e615474734477bb526c4a748bd7afa2d24d19a2516652600000000fdfe0000483045022100c6745056ac217d56191eb89fd15462a1431058bc6576265b679b4a68eca27e1e02200fdc3072f18bcae804bc824cf66c2eb6bedbd602d9301ad094d7cb1cebac623d01483045022100c3a22a1c219b6b0266d62b94b990f39eb6bdd401189fd283188d1795c6faee9802201e7f9119c137595ac088f1831417a63ce4270341ef4a6873f6729e8b6365c539014c69522103e3996bbfaee29838287a46d73e348f30709c2a60148cf23aa1bed935b2bcc52d2103ab3f25a845c772718d11af25e5e90554515ffc84be1de8480132bb7b39fe616b2102e8efe29657bcc985b071e3f22c65a7059cc63645bffdd831a6363d338abb5a2653aeffffffff02e8604800000000001976a9149d24230ec8c79f11f035533b7055b48071bb228488ac062750000000000017a9142d0cd3469b56303a4d9e63b17e23b2ed1d3a15928700000000",
        "locktime": 0,
        "size": 373,
        "time": 1504967988,
        "txid": "00ef1c20ed31967bba657add442fe31f0c911a1ee12b8ca6b01c7bb336f50dbe",
        "version": 1,
        "vin": [
            {
                "scriptSig": {
                    "asm": "0 3045022100c6745056ac217d56191eb89fd15462a1431058bc6576265b679b4a68eca27e1e02200fdc3072f18bcae804bc824cf66c2eb6bedbd602d9301ad094d7cb1cebac623d[ALL] 3045022100c3a22a1c219b6b0266d62b94b990f39eb6bdd401189fd283188d1795c6faee9802201e7f9119c137595ac088f1831417a63ce4270341ef4a6873f6729e8b6365c539[ALL] 522103e3996bbfaee29838287a46d73e348f30709c2a60148cf23aa1bed935b2bcc52d2103ab3f25a845c772718d11af25e5e90554515ffc84be1de8480132bb7b39fe616b2102e8efe29657bcc985b071e3f22c65a7059cc63645bffdd831a6363d338abb5a2653ae",
                    "hex": "00483045022100c6745056ac217d56191eb89fd15462a1431058bc6576265b679b4a68eca27e1e02200fdc3072f18bcae804bc824cf66c2eb6bedbd602d9301ad094d7cb1cebac623d01483045022100c3a22a1c219b6b0266d62b94b990f39eb6bdd401189fd283188d1795c6faee9802201e7f9119c137595ac088f1831417a63ce4270341ef4a6873f6729e8b6365c539014c69522103e3996bbfaee29838287a46d73e348f30709c2a60148cf23aa1bed935b2bcc52d2103ab3f25a845c772718d11af25e5e90554515ffc84be1de8480132bb7b39fe616b2102e8efe29657bcc985b071e3f22c65a7059cc63645bffdd831a6363d338abb5a2653ae"
                },
                "sequence": 4294967295,
                "txid": "266516259ad1242dfa7abd48a7c426b57b4734474715e6a81a46dac1780b0038",
                "vout": 0
            }
        ],
        "vout": [
            {
                "n": 0,
                "scriptPubKey": {
                    "addresses": [
                        "muqqg1Yvojwz2Kg5h4X31PAcutqaDroep1"
                    ],
                    "asm": "OP_DUP OP_HASH160 9d24230ec8c79f11f035533b7055b48071bb2284 OP_EQUALVERIFY OP_CHECKSIG",
                    "hex": "76a9149d24230ec8c79f11f035533b7055b48071bb228488ac",
                    "reqSigs": 1,
                    "type": "pubkeyhash"
                },
                "value": 0.047434
            },
            {
                "n": 1,
                "scriptPubKey": {
                    "addresses": [
                        "2MwMRm2u1U2sVeYssdbAqV7UUM9fjXteDk3"
                    ],
                    "asm": "OP_HASH160 2d0cd3469b56303a4d9e63b17e23b2ed1d3a1592 OP_EQUAL",
                    "hex": "a9142d0cd3469b56303a4d9e63b17e23b2ed1d3a159287",
                    "reqSigs": 1,
                    "type": "scripthash"
                },
                "value": 0.0525287
            }
        ],
        "vsize": 373
    }
}
```


### Status Endpoint

To check on the status of the index while it is syncing, you can call:
```
http://localhost:{SERVER_PORT}/status
```

And receive a response like this:
```json
{
    "chainBlock": 1211187,
    "indexBlock": 11274,
    "blocksBehind": 1199913,
    "ready": false
}
```

### Add address to label 

```
http://localhost:{SERVER_PORT}/l/16q7Gtg5yd6R4cL7sYCaGYPcHXwxJF4KvT/addaddr?address=16q7Gtg5yd6R4cL7sYCaGYPcHXwxJF4KvT

```

And receive a response like this:
```
true
```

### Remove address from label 

```
http://localhost:{SERVER_PORT}/l/16q7Gtg5yd6R4cL7sYCaGYPcHXwxJF4KvT/deladdr?address=16q7Gtg5yd6R4cL7sYCaGYPcHXwxJF4KvT

```

And receive a response like this:
```
true
```

### Get transactions by label

```
http://localhost:{SERVER_PORT}/l/16q7Gtg5yd6R4cL7sYCaGYPcHXwxJF4KvT/txs?verbose=1
```

And receive a response like this:
```json
{
    "adfab335ffa186f6d6de3f9f3c10501343d3615e1aa3785c5399b193423975fe": {
        "txid": "adfab335ffa186f6d6de3f9f3c10501343d3615e1aa3785c5399b193423975fe",
        "hash": "adfab335ffa186f6d6de3f9f3c10501343d3615e1aa3785c5399b193423975fe",
        "version": 2,
        "size": 226,
        "vsize": 226,
        "locktime": 0,
        "vin": [
            {
                "txid": "4544c68d4f8a3f11b940ecc484225af64ebaa8884fc17e8835c46b2233e0ea76",
                "vout": 1,
                "scriptSig": {
                    "asm": "3045022100c1d212edc06054771645ee4e5d505ef25403ac1a0d1203d636fe02dbbd9ba1da0220648843421bd8c59363f441aca391a7ae12ab848c5bf787c5339f24db07eb1347[ALL] 0328ace85596d7554a718ac49b497d2e1aec904d8d96679c2a0d6fae2e9bfb68c9",
                    "hex": "483045022100c1d212edc06054771645ee4e5d505ef25403ac1a0d1203d636fe02dbbd9ba1da0220648843421bd8c59363f441aca391a7ae12ab848c5bf787c5339f24db07eb134701210328ace85596d7554a718ac49b497d2e1aec904d8d96679c2a0d6fae2e9bfb68c9"
                },
                "sequence": 4294967295
            }
        ],
        "vout": [
            {
                "value": 0.03995,
                "n": 0,
                "scriptPubKey": {
                    "asm": "OP_DUP OP_HASH160 74f2fb0525ef0929cb49a37e84c7a96156d8331e OP_EQUALVERIFY OP_CHECKSIG",
                    "hex": "76a91474f2fb0525ef0929cb49a37e84c7a96156d8331e88ac",
                    "reqSigs": 1,
                    "type": "pubkeyhash",
                    "addresses": [
                        "1BfNTqXkUu7mSQ8RBkXNwon1KGv1uvAZJx"
                    ]
                }
            },
            {
                "value": 0.06,
                "n": 1,
                "scriptPubKey": {
                    "asm": "OP_DUP OP_HASH160 3ff1d51449a0eb16b2da1827772979628acd423b OP_EQUALVERIFY OP_CHECKSIG",
                    "hex": "76a9143ff1d51449a0eb16b2da1827772979628acd423b88ac",
                    "reqSigs": 1,
                    "type": "pubkeyhash",
                    "addresses": [
                        "16q7Gtg5yd6R4cL7sYCaGYPcHXwxJF4KvT"
                    ]
                }
            }
        ],
        "hex": "020000000176eae033226bc435887ec14f88a8ba4ef65a2284c4ec40b9113f8a4f8dc64445010000006b483045022100c1d212edc06054771645ee4e5d505ef25403ac1a0d1203d636fe02dbbd9ba1da0220648843421bd8c59363f441aca391a7ae12ab848c5bf787c5339f24db07eb134701210328ace85596d7554a718ac49b497d2e1aec904d8d96679c2a0d6fae2e9bfb68c9ffffffff0278f53c00000000001976a91474f2fb0525ef0929cb49a37e84c7a96156d8331e88ac808d5b00000000001976a9143ff1d51449a0eb16b2da1827772979628acd423b88ac00000000",
        "blockhash": "02fca3501de084c43643a1cf539fd8de1180ecb6d2cf4114ad6b2c87eed7408e",
        "confirmations": 18766,
        "time": 1538205121,
        "blocktime": 1538205121
    },
    "c9c236532de6b8e543ecb9829e3bf554b41a48c30630fef4078f2a37c454f27e": {
        "txid": "c9c236532de6b8e543ecb9829e3bf554b41a48c30630fef4078f2a37c454f27e",
        "hash": "c9c236532de6b8e543ecb9829e3bf554b41a48c30630fef4078f2a37c454f27e",
        "version": 2,
        "size": 1260,
        "vsize": 1260,
        "locktime": 0,
        "vin": [
            {
                "txid": "e9c03efba9258feb17619241ba5b5c67480426c4e3f6f3e6e8b9f4ff0df0df7b",
                "vout": 1,
                "scriptSig": {
                    "asm": "3045022100ee8f22cd197db42b0969873ecd3f7956298a86fb4611a562fb0b68f93f947a4b022071aa3757d6ed70ec5e058d49e35e58336c4fa2d83f07a6abe1a5bf71838ceb27[ALL] 025198196593c7ca3578e7e7726e50cb974b52ce8abb17a8a1ea0c390dff6416fb",
                    "hex": "483045022100ee8f22cd197db42b0969873ecd3f7956298a86fb4611a562fb0b68f93f947a4b022071aa3757d6ed70ec5e058d49e35e58336c4fa2d83f07a6abe1a5bf71838ceb270121025198196593c7ca3578e7e7726e50cb974b52ce8abb17a8a1ea0c390dff6416fb"
                },
                "sequence": 4294967295
            },
            {
                "txid": "290f6bde18116f0f93867adaab4ab4fda84ab3bbb21b21c34bee705f5773b49e",
                "vout": 0,
                "scriptSig": {
                    "asm": "304402202705ac55b172ec488b4765ffead85293e64c9200ab4bad8e27e806015d920a0802200cd60142345088544b59e73d2f180b3dd2169ba53e1e3da74b5416ce1086c53b[ALL] 02c30006289d19835fa9de7427a91627873e23ee56f4fb548e6a1c58d54df093bf",
                    "hex": "47304402202705ac55b172ec488b4765ffead85293e64c9200ab4bad8e27e806015d920a0802200cd60142345088544b59e73d2f180b3dd2169ba53e1e3da74b5416ce1086c53b012102c30006289d19835fa9de7427a91627873e23ee56f4fb548e6a1c58d54df093bf"
                },
                "sequence": 4294967295
            },
            {
                "txid": "290f6bde18116f0f93867adaab4ab4fda84ab3bbb21b21c34bee705f5773b49e",
                "vout": 1,
                "scriptSig": {
                    "asm": "30450221009c5924aa7e72f9beed15a084ecdd79dde4aedd84a4466c0a264c9fd00fd82efe02205a7f5409eb460a436dfcbfd535541875dee06e2412aeb9e5b6d16bb9497801bb[ALL] 025198196593c7ca3578e7e7726e50cb974b52ce8abb17a8a1ea0c390dff6416fb",
                    "hex": "4830450221009c5924aa7e72f9beed15a084ecdd79dde4aedd84a4466c0a264c9fd00fd82efe02205a7f5409eb460a436dfcbfd535541875dee06e2412aeb9e5b6d16bb9497801bb0121025198196593c7ca3578e7e7726e50cb974b52ce8abb17a8a1ea0c390dff6416fb"
                },
                "sequence": 4294967295
            },
            {
                "txid": "adfab335ffa186f6d6de3f9f3c10501343d3615e1aa3785c5399b193423975fe",
                "vout": 0,
                "scriptSig": {
                    "asm": "3045022100e453b6c95e2a4d369238e0fba976b6a51a548880733a74348462b5f63393e84502201a565e88d1efdfa462f8bf061b41fa7dbe3d2ac1d0d565e76b2c6e4ea00bcff7[ALL] 029c8ebf0db157070a17616b00716aac4b3e1bb37144470eb83f70dba47ec9735b",
                    "hex": "483045022100e453b6c95e2a4d369238e0fba976b6a51a548880733a74348462b5f63393e84502201a565e88d1efdfa462f8bf061b41fa7dbe3d2ac1d0d565e76b2c6e4ea00bcff70121029c8ebf0db157070a17616b00716aac4b3e1bb37144470eb83f70dba47ec9735b"
                },
                "sequence": 4294967295
            },
            {
                "txid": "adfab335ffa186f6d6de3f9f3c10501343d3615e1aa3785c5399b193423975fe",
                "vout": 1,
                "scriptSig": {
                    "asm": "30440220765fa05d83f4a6bdf6334efa57c0ed2a687224f4f15ea55939132b025e45538e0220368bc1f5cfd6785dd8fc17b8ede52bbe5de7e9f8f711f0dcd0097da1cd2a30ff[ALL] 032d3e7ea194fe091e871a70091271fbfb619e4d211845da9b5ee49e69b4daf253",
                    "hex": "4730440220765fa05d83f4a6bdf6334efa57c0ed2a687224f4f15ea55939132b025e45538e0220368bc1f5cfd6785dd8fc17b8ede52bbe5de7e9f8f711f0dcd0097da1cd2a30ff0121032d3e7ea194fe091e871a70091271fbfb619e4d211845da9b5ee49e69b4daf253"
                },
                "sequence": 4294967295
            },
            {
                "txid": "75775f253f052af6377b26c970181f46ee09816236d6e60a15c0694915a3f7b6",
                "vout": 0,
                "scriptSig": {
                    "asm": "3045022100fecf8ca2b0d632e82f0c7f1b445c9f33138dda07139eff17be49dbb27ea2710402206f5d334ddbf397908753617ce45811baf409892ba849febf18c6926eb535753d[ALL] 024ec640afcac351f0bec7c5c82bcef6eadb39981f5cd7aa99b3bb8eeedef8d91a",
                    "hex": "483045022100fecf8ca2b0d632e82f0c7f1b445c9f33138dda07139eff17be49dbb27ea2710402206f5d334ddbf397908753617ce45811baf409892ba849febf18c6926eb535753d0121024ec640afcac351f0bec7c5c82bcef6eadb39981f5cd7aa99b3bb8eeedef8d91a"
                },
                "sequence": 4294967295
            },
            {
                "txid": "75775f253f052af6377b26c970181f46ee09816236d6e60a15c0694915a3f7b6",
                "vout": 1,
                "scriptSig": {
                    "asm": "3045022100a06dff541388db6dd3911263863730c49a0948d507eb5892042e928d64535dd40220381cbe3f9cf70eaf0a6af22c5d8a857ad13ea203d05fab86d05e178aac9e6c3b[ALL] 026bb05fc24c7b21c0d095835299863cdcc0fce5be4a7dc570862403c613d4dbd5",
                    "hex": "483045022100a06dff541388db6dd3911263863730c49a0948d507eb5892042e928d64535dd40220381cbe3f9cf70eaf0a6af22c5d8a857ad13ea203d05fab86d05e178aac9e6c3b0121026bb05fc24c7b21c0d095835299863cdcc0fce5be4a7dc570862403c613d4dbd5"
                },
                "sequence": 4294967295
            },
            {
                "txid": "cce31df29f55b523768164a1d3058bbab42327c484f7cff96239e6e328752ebe",
                "vout": 0,
                "scriptSig": {
                    "asm": "3045022100ec311c2fa8cf9210693619afd56e975a0887f5884def3dc74c2141972c30c21d02203a1bfe683cc1fff27117833b620142f9f1c652072af2971bee48e3cb62a84014[ALL] 02708ca0279d41fe67928c5b0829a6d47f8fa92e31f60fabf022a2f31844431f5c",
                    "hex": "483045022100ec311c2fa8cf9210693619afd56e975a0887f5884def3dc74c2141972c30c21d02203a1bfe683cc1fff27117833b620142f9f1c652072af2971bee48e3cb62a84014012102708ca0279d41fe67928c5b0829a6d47f8fa92e31f60fabf022a2f31844431f5c"
                },
                "sequence": 4294967295
            }
        ],
        "vout": [
            {
                "value": 111.69649774,
                "n": 0,
                "scriptPubKey": {
                    "asm": "OP_DUP OP_HASH160 81d1f1990d3c7b1b2a7f0ff48553a6d1aff4450d OP_EQUALVERIFY OP_CHECKSIG",
                    "hex": "76a91481d1f1990d3c7b1b2a7f0ff48553a6d1aff4450d88ac",
                    "reqSigs": 1,
                    "type": "pubkeyhash",
                    "addresses": [
                        "1CqRfto8Srct5V5PuZSTEWwDup2pLVs1Bh"
                    ]
                }
            },
            {
                "value": 1,
                "n": 1,
                "scriptPubKey": {
                    "asm": "OP_DUP OP_HASH160 18af83af1a405e0c91d6adfb8a67fa2cddd87a75 OP_EQUALVERIFY OP_CHECKSIG",
                    "hex": "76a91418af83af1a405e0c91d6adfb8a67fa2cddd87a7588ac",
                    "reqSigs": 1,
                    "type": "pubkeyhash",
                    "addresses": [
                        "13FXUZLhkkEZ35ab9zP3tNShCAKwaPh9SQ"
                    ]
                }
            }
        ],
        "hex": "02000000087bdff00dfff4b9e8e6f3f6e3c4260448675c5bba41926117eb8f25a9fb3ec0e9010000006b483045022100ee8f22cd197db42b0969873ecd3f7956298a86fb4611a562fb0b68f93f947a4b022071aa3757d6ed70ec5e058d49e35e58336c4fa2d83f07a6abe1a5bf71838ceb270121025198196593c7ca3578e7e7726e50cb974b52ce8abb17a8a1ea0c390dff6416fbffffffff9eb473575f70ee4bc3211bb2bbb34aa8fdb44aabda7a86930f6f1118de6b0f29000000006a47304402202705ac55b172ec488b4765ffead85293e64c9200ab4bad8e27e806015d920a0802200cd60142345088544b59e73d2f180b3dd2169ba53e1e3da74b5416ce1086c53b012102c30006289d19835fa9de7427a91627873e23ee56f4fb548e6a1c58d54df093bfffffffff9eb473575f70ee4bc3211bb2bbb34aa8fdb44aabda7a86930f6f1118de6b0f29010000006b4830450221009c5924aa7e72f9beed15a084ecdd79dde4aedd84a4466c0a264c9fd00fd82efe02205a7f5409eb460a436dfcbfd535541875dee06e2412aeb9e5b6d16bb9497801bb0121025198196593c7ca3578e7e7726e50cb974b52ce8abb17a8a1ea0c390dff6416fbfffffffffe75394293b199535c78a31a5e61d3431350103c9f3fded6f686a1ff35b3faad000000006b483045022100e453b6c95e2a4d369238e0fba976b6a51a548880733a74348462b5f63393e84502201a565e88d1efdfa462f8bf061b41fa7dbe3d2ac1d0d565e76b2c6e4ea00bcff70121029c8ebf0db157070a17616b00716aac4b3e1bb37144470eb83f70dba47ec9735bfffffffffe75394293b199535c78a31a5e61d3431350103c9f3fded6f686a1ff35b3faad010000006a4730440220765fa05d83f4a6bdf6334efa57c0ed2a687224f4f15ea55939132b025e45538e0220368bc1f5cfd6785dd8fc17b8ede52bbe5de7e9f8f711f0dcd0097da1cd2a30ff0121032d3e7ea194fe091e871a70091271fbfb619e4d211845da9b5ee49e69b4daf253ffffffffb6f7a3154969c0150ae6d636628109ee461f1870c9267b37f62a053f255f7775000000006b483045022100fecf8ca2b0d632e82f0c7f1b445c9f33138dda07139eff17be49dbb27ea2710402206f5d334ddbf397908753617ce45811baf409892ba849febf18c6926eb535753d0121024ec640afcac351f0bec7c5c82bcef6eadb39981f5cd7aa99b3bb8eeedef8d91affffffffb6f7a3154969c0150ae6d636628109ee461f1870c9267b37f62a053f255f7775010000006b483045022100a06dff541388db6dd3911263863730c49a0948d507eb5892042e928d64535dd40220381cbe3f9cf70eaf0a6af22c5d8a857ad13ea203d05fab86d05e178aac9e6c3b0121026bb05fc24c7b21c0d095835299863cdcc0fce5be4a7dc570862403c613d4dbd5ffffffffbe2e7528e3e63962f9cff784c42723b4ba8b05d3a164817623b5559ff21de3cc000000006b483045022100ec311c2fa8cf9210693619afd56e975a0887f5884def3dc74c2141972c30c21d02203a1bfe683cc1fff27117833b620142f9f1c652072af2971bee48e3cb62a84014012102708ca0279d41fe67928c5b0829a6d47f8fa92e31f60fabf022a2f31844431f5cffffffff026e54c399020000001976a91481d1f1990d3c7b1b2a7f0ff48553a6d1aff4450d88ac00e1f505000000001976a91418af83af1a405e0c91d6adfb8a67fa2cddd87a7588ac00000000",
        "blockhash": "0574690bcfab00ca1118cea092658cef159056636f0b0cb9d6d719cdc01a34a9",
        "confirmations": 1550,
        "time": 1539238081,
        "blocktime": 1539238081
    },
    "4ec6f6dec4aac2f1527890606d59399b4e5922a80792c4dba0b90af301d40cee": {
        "txid": "4ec6f6dec4aac2f1527890606d59399b4e5922a80792c4dba0b90af301d40cee",
        "hash": "4ec6f6dec4aac2f1527890606d59399b4e5922a80792c4dba0b90af301d40cee",
        "version": 2,
        "size": 225,
        "vsize": 225,
        "locktime": 0,
        "vin": [
            {
                "txid": "c9c236532de6b8e543ecb9829e3bf554b41a48c30630fef4078f2a37c454f27e",
                "vout": 0,
                "scriptSig": {
                    "asm": "30440220075ef1eb53a325742483075e62fd6fe21d9c94ac1062287c2f94e42ff98c535f02202a27406e71fded8744c0bb6a289d7609bf3c83f7860cb4c32eff2d180a0d1950[ALL] 034946d559191fbbf443336174fb8bfd0fad45136f4269b2630db781f1336ad673",
                    "hex": "4730440220075ef1eb53a325742483075e62fd6fe21d9c94ac1062287c2f94e42ff98c535f02202a27406e71fded8744c0bb6a289d7609bf3c83f7860cb4c32eff2d180a0d19500121034946d559191fbbf443336174fb8bfd0fad45136f4269b2630db781f1336ad673"
                },
                "sequence": 4294967295
            }
        ],
        "vout": [
            {
                "value": 111.5964843,
                "n": 0,
                "scriptPubKey": {
                    "asm": "OP_DUP OP_HASH160 c5f4605654c5df89d795fd1f9281a8824789dff5 OP_EQUALVERIFY OP_CHECKSIG",
                    "hex": "76a914c5f4605654c5df89d795fd1f9281a8824789dff588ac",
                    "reqSigs": 1,
                    "type": "pubkeyhash",
                    "addresses": [
                        "1K3gsMaWzKakFC3dYdSQumXLFqp1VBNFM3"
                    ]
                }
            },
            {
                "value": 0.1,
                "n": 1,
                "scriptPubKey": {
                    "asm": "OP_DUP OP_HASH160 362d9e1d2be7ae1c6ff1e6c8b06a6507f453e22d OP_EQUALVERIFY OP_CHECKSIG",
                    "hex": "76a914362d9e1d2be7ae1c6ff1e6c8b06a6507f453e22d88ac",
                    "reqSigs": 1,
                    "type": "pubkeyhash",
                    "addresses": [
                        "15wU8voBxwGZng9n8t2LqDkdFzxo4Gtdxn"
                    ]
                }
            }
        ],
        "hex": "02000000017ef254c4372a8f07f4fe3006c3481ab454f53b9e82b9ec43e5b8e62d5336c2c9000000006a4730440220075ef1eb53a325742483075e62fd6fe21d9c94ac1062287c2f94e42ff98c535f02202a27406e71fded8744c0bb6a289d7609bf3c83f7860cb4c32eff2d180a0d19500121034946d559191fbbf443336174fb8bfd0fad45136f4269b2630db781f1336ad673ffffffff02aeb82a99020000001976a914c5f4605654c5df89d795fd1f9281a8824789dff588ac80969800000000001976a914362d9e1d2be7ae1c6ff1e6c8b06a6507f453e22d88ac00000000",
        "blockhash": "0c3ea9d919389b982105242f806b6f1cb31b60b5fe524c566ff09fa5a43b642e",
        "confirmations": 1306,
        "time": 1539252721,
        "blocktime": 1539252721
    }
}
```

###Get utxo from label

```
http://localhost:{SERVER_PORT}/l/16q7Gtg5yd6R4cL7sYCaGYPcHXwxJF4KvT/utxos
```

Add receive a response like this:
```json
[
    {
        "txId": "4ec6f6dec4aac2f1527890606d59399b4e5922a80792c4dba0b90af301d40cee",
        "vout": 0,
        "height": 100971,
        "value": 11159648430,
        "confirmations": 1533
    }
]
```

### Get balance from label

```
http://localhost:{SERVER_PORT}/l/16q7Gtg5yd6R4cL7sYCaGYPcHXwxJF4KvT/balance
```

And receive a response like this:
```
111100000
```

## License [MIT](LICENSE)
