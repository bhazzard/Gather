let secp256k1 = require('secp256k1')
let { randomBytes } = require('crypto')
let axios = require('axios')
let transaction = require('../gather-transaction')

exports.client = function(url = 'http://localhost:3232') {
  let methods = {
    generatePrivateKey: () => {
      let privKey
      do {
        privKey = randomBytes(32)
      } while (!secp256k1.privateKeyVerify(privKey))

      return privKey
    },
    generatePublicKey: privKey => {
      return secp256k1.publicKeyCreate(privKey)
    },
    generateAddress: pubKey => {
      return transaction.deriveAddress(pubKey)
    },
    getCoinBalance: async (address) => {
      let state = await axios.get(url + '/state').then(res => res.data)
      return state.balances[address] || 0
    },
    send: async (privKey, tx) => {
      let currentState = await axios.get(url + '/state').then(res => res.data)

      let senderPubKeyBuffer = methods.generatePublicKey(privKey)
      let senderPubKey = senderPubKeyBuffer.toString('hex')
      let senderAddress = transaction.deriveAddress(senderPubKeyBuffer)

      let nonce = currentState.nonces[senderAddress] || 0

      let boilerplate = {
        senderPubKey: senderPubKey,
        senderAddress: senderAddress,
        nonce: nonce
      }

      let tx_copy = Object.assign(boilerplate, tx)
      let signedTx = transaction.sign(privKey, tx_copy)
      let result = await axios.post(url + '/txs', signedTx)
      return result.data
    }
  }

  return methods
}
