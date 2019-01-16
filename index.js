var Trie = require('merkle-patricia-tree');
var levelup = require('levelup');
var leveldown = require('leveldown');

// var Web3 = require('web3');

var stateRoot = "0xd7f8974fb5ac78d9ac099b9ad5018bedc2ce0a72dad1827a1709da30580f0544"

var db = levelup(leveldown('/Users/haichaozhu/Library/Ethereum/geth/chaindata'));
var trie = new Trie(db,stateRoot);

// Using the IPC provider in node.js
// var net = require('net');

// var web3 = new Web3('/Users/myuser/Library/Ethereum/geth.ipc', net); // mac os path

// console.log(web3.eth.getBlock(blockHashOrBlockNumber));

trie.createReadStream()
  .on('data', function (data) {
    console.log(data)
  })
  .on('end', function() {
    console.log('End.')
  })


  


// or
// var web3 = new Web3(new Web3.providers.IpcProvider('/Users/myuser/Library/Ethereum/geth.ipc', net)); // mac os path
// on windows the path is: "\\\\.\\pipe\\geth.ipc"
// on linux the path is: "/users/myuser/.ethereum/geth.ipc"