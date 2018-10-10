module.exports = {
   btctestnet: {
     messagePrefix: '\x18Bitcoin Signed Message:\n',
     bech32: 'bcrt',
     bip32: {
       public: 0x0488b21e,
       private: 0x0488ade4
     },
     pubKeyHash: 0x0,
     scriptHash: 0x5,
     wif: 0x80
   }
 }