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
    }
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
  console.log('received create-group transaction: ' + console.log(JSON.stringify(tx)))
  if (!transaction.verify(tx)) {
    return
  }
  console.log('create-group transaction verified')

  if (state.groups[tx.group.id]) {
    console.log('group id already exists')
    return
  }
  console.log('group id does not yet exist')

  state.groups[transaction.group.id] = {}
  state.groups[transaction.group.id].name = transaction.group.name
  state.groups[transaction.group.id].visibility = transaction.group.visibility
  state.groups[transaction.group.id].admittance = transaction.group.admittance

  console.log(JSON.stringify(state.groups[transaction.group.id]))
})

app.listen(3000)

setTimeout(() => {
    //test coin transaction
    client.send(privKey, {
      type: "send-payment",
      payment: {
        amount: 900,
        receiverAddress: '1234123412341234123412341234123412341234123412341234123412341234'
      }
    })

    client.send(privKey, {
      type: "create-group",
      group: {
        id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        name: "Kurt Vonnegut readers of Blacksburg",
        visibility: "public",
        admittance: "open"
      }
    })

  }, 10000)
