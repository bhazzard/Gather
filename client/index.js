let secp256k1 = require('secp256k1')
let { randomBytes } = require('crypto')
let createHash = require('sha.js')
let axios = require('axios')
let stringify = require('json-stable-stringify')

exports.handler = function(state, tx) {
  if (!verifyTx(tx)) {
    return
  }

  let senderBalance = state.balances[tx.senderAddress] || 0
  let receiverBalance = state.balances[tx.receiverAddress] || 0

  if(tx.senderAddress === tx.receiverAddress) {
    return
  }

  if (!Number.isInteger(tx.amount)) {
    return
  }

  if (tx.amount > senderBalance) {
    return
  }

  if (tx.nonce !== (state.nonces[tx.senderAddress] || 0)) {
    return
  }

  senderBalance -= tx.amount
  receiverBalance += tx.amount

  state.balances[tx.senderAddress] = senderBalance
  state.balances[tx.receiverAddress] = receiverBalance
  state.nonces[tx.senderAddress] = (state.nonces[tx.senderAddress] || 0) + 1
}

function hashTx(tx) {
  let txHash = createHash('sha256')
    .update(stringify(tx))
    .digest()

  return txHash
}

function signTx(privKey, tx) {
  let txHash = hashTx(tx)
  let signedTx = Object.assign({}, tx)
  let { signature } = secp256k1.sign(txHash, privKey)
  signedTx.signature = signature.toString('hex')
  return signedTx
}

function verifyTx(tx) {
  let signature = new Buffer(tx.signature, 'hex')
  let senderPubKey = new Buffer(tx.senderPubKey, 'hex')

  if (
    deriveAddress(senderPubKey) !==
    tx.senderAddress
  ) {
    console.log('address did not match public key')
    return false
  }
  console.log('address matches public key')

  let txToVerify = Object.assign({}, tx)
  delete txToVerify.signature

  let txHash = hashTx(txToVerify)

  let result = secp256k1.verify(txHash, signature, senderPubKey)
  return result
}

function deriveAddress(pubKey) {
  let address = createHash('sha256')
    .update(pubKey)
    .digest()

  return address.toString('hex')
}

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
      return deriveAddress(pubKey)
    },
    getCoinBalance: async (address) => {
      let state = await axios.get(url + '/state').then(res => res.data)
      return state.balances[address] || 0
    },
    send: async (privKey, transaction) => {
      let currentState = await axios.get(url + '/state').then(res => res.data)

      let senderPubKeyBuffer = methods.generatePublicKey(privKey)
      let senderPubKey = senderPubKeyBuffer.toString('hex')
      let senderAddress = deriveAddress(senderPubKeyBuffer)

      let nonce = currentState.nonces[senderAddress] || 0

      let boilerplate = {
        senderPubKey: senderPubKey,
        senderAddress: senderAddress,
        nonce: nonce
      }

      let tx = Object.assign(boilerplate, transaction)
      let signedTx = signTx(privKey, tx)
      let result = await axios.post(url + '/txs', signedTx)
      return result.data
    }
  }

  return methods
}
