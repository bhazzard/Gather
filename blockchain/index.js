let lotion = require('lotion')
let coin = require('../client')
let transaction = require('../gather-transaction')

let client = coin.client('http://localhost:3000')
let privKey = client.generatePrivateKey()
let pubKey = client.generatePublicKey(privKey)
let address = client.generateAddress(pubKey)

let app = require('lotion')({
  initialState: {
    balances: {
      [address.toString('hex')]: 1000
    },
    nonces: {},
    groups: {
      'iowefna*3fja': {
        'name': 'My First Group',
        'visibility': 'public',
        'admittance': 'open',
        'fees': false,
        'credits': 0,
        'coins': 0,
        'administrators': [
          {'owner': address.toString('hex')}
        ]
      }
    },
    members: {},
    memberships: {}
  }
})

// Handle Send Payment
app.use(function(state, tx) {
  if (tx.type != 'send-payment') {
    return
  }
  if (!transaction.verify(tx)) {
    return
  }
  let senderBalance = state.balances[tx.senderAddress] || 0
  let receiverBalance = state.balances[tx.receiverAddress] || 0

  if(tx.senderAddress === tx.payment.receiverAddress) {
    return
  }

  if (!Number.isInteger(tx.payment.amount)) {
    return
  }

  if (tx.payment.amount > senderBalance) {
    return
  }

  if (tx.nonce !== (state.nonces[tx.senderAddress] || 0)) {
    return
  }

  senderBalance -= tx.amount
  receiverBalance += tx.amount

  state.balances[tx.senderAddress] = senderBalance
  state.balances[tx.payment.receiverAddress] = receiverBalance
  state.nonces[tx.senderAddress] = (state.nonces[tx.senderAddress] || 0) + 1
})

// Handle Create Group
app.use(function(state, tx) {
  if (tx.type != 'create-group') {
    return
  }

  if (!transaction.verify(tx)) {
    return
  }

  if (!tx.group) return
  if (!tx.group.id) return
  if (state.groups[tx.group.id]) return
  if (!tx.group.visibility) return
  /* TODO implement below validation
  console.log(tx.group.visibility)
  if (["public","private","secret"].indexOf(tx.group.visibility) >= 0) return
  if (!tx.group.admittance) return
  if (["open","moderated","invitation"].indexOf(tx.group.admittance) >= 0) return
  */

  state.groups[tx.group.id] = {}
  state.groups[tx.group.id].name = tx.group.name
  state.groups[tx.group.id].visibility = tx.group.visibility
  state.groups[tx.group.id].admittance = tx.group.admittance
})

// Handle Join Group
app.use(function(state, tx) {
  if (tx.type != 'join-group') {
    return
  }

  if (!transaction.verify(tx)) {
    return
  }

  if (!tx.id) return
  if (!state.groups[tx.id]) return
  if (state.groups[tx.id].admittance !== 'open') return

  if (!state.members[tx.id]) state.members[tx.id] = []
  if (!state.memberships[tx.senderAddress]) state.memberships[tx.senderAddress] = []

  state.members[tx.id].push(tx.senderAddress)
  state.memberships[tx.senderAddress].push(tx.id)
})

app.listen(3000)


// Second User
let secondUserPrivKey = client.generatePrivateKey()
let secondUserPubKey = client.generatePublicKey(secondUserPrivKey)
let secondUserAddress = client.generateAddress(secondUserPubKey)
let randomGroupId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

setTimeout(() => {
    //test coin transaction
    client.send(privKey, {
      type: "send-payment",
      payment: {
        amount: 900,
        receiverAddress: secondUserAddress
      }
    })

    client.send(privKey, {
      type: "create-group",
      group: {
        id: randomGroupId,
        name: "Kurt Vonnegut readers of Blacksburg",
        visibility: "public",
        admittance: "open"
      }
    })
  }, 10000)

setTimeout(() => {
    client.send(secondUserPrivKey, {
      type: "join-group",
      id: randomGroupId
    })

  }, 13000)
