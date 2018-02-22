let secp256k1 = require('secp256k1')
let createHash = require('sha.js')
let stringify = require('json-stable-stringify')

module.exports = {
  sign: function(privKey, tx) {
    let txHash = hashTx(tx)
    let signedTx = Object.assign({}, tx)
    let { signature } = secp256k1.sign(txHash, privKey)
    signedTx.signature = signature.toString('hex')
    return signedTx
  },
  verify: function(tx) {
    let signature = new Buffer(tx.signature, 'hex')
    let senderPubKey = new Buffer(tx.senderPubKey, 'hex')

    if (
      this.deriveAddress(senderPubKey) !==
      tx.senderAddress
    ) {
      return false
    }

    let txToVerify = Object.assign({}, tx)
    delete txToVerify.signature

    let txHash = hashTx(txToVerify)

    let result = secp256k1.verify(txHash, signature, senderPubKey)
    return result
  },
  deriveAddress: function(pubKey) {
    let address = createHash('sha256')
      .update(pubKey)
      .digest()

    return address.toString('hex')
  }
}

function hashTx(tx) {
  let txHash = createHash('sha256')
    .update(stringify(tx))
    .digest()

  return txHash
}
