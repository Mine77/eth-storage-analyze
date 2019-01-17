var Web3 = require('web3');

// get stateRoot every BlockStep, the last number is days
const BlockStep = (60 * 60 * 24 / 15) * 5;

ipcAddress = "/Users/haichaozhu/Library/Ethereum/geth.ipc"

// connect to geth using the IPC provider
var net = require('net');
var web3 = new Web3(ipcAddress, net);

function getBatchStaterRoot(height) {
    var stateRootList = {};
    var batch = new web3.BatchRequest();

    for (i = 1; i < height; i = i + BlockStep) {
        console.log(i);
        batch.add(web3.eth.getBlock(i, function (error, block) {
            if (error)
                console.log(error)
            else {
                if (block != null) {
                    stateRootList[i] = block.stateRoot;
                    console.log(i + '\t' + block.stateRoot)
                }
            }
        }))
    }

    batch.execute();
}

web3.eth.getBlockNumber().then(number => getBatchStaterRoot(number))