let lotion = require('lotion')
let coin = require('../client')

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

app.use(coin.handler)

app.listen(3000)

setTimeout(() => {
    //test coin transaction
    client.send(privKey, {
      amount: 900,
      receiverAddress:
        '1234123412341234123412341234123412341234123412341234123412341234'
    })

  }, 10000)
