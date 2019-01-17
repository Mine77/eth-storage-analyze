// run this script to get a list of script list
var Web3 = require('web3');

const config = require('./config.json');

BlockStep = config.BLOCK_STEP;

if (config.CONNECT_WITH_RPC) {
    // connect to node using the RPC endpoint
    var web3 = new Web3(config.RPC_ADDRESS);
} else {
    //connect to geth using the IPC endpoint
    var net = require('net');
    var web3 = new Web3(config.IPC_ADDRESS, net);
}

// return a batch block request, given the latest height and the step
function getBatchStateRoot(height, step) {
    const batchRequests =
        Object.keys(
            Array.from({
                length: height
            })
        ).filter(
            // get needed block height according to the step
            _height => (_height % step === 1)
        ).map(
            // return the promise function according to the height
            _height => web3.eth.getBlock(_height)
        )

    return Promise.all(batchRequests)
}


// geth tip block height, then get batch block request, then make stateRoot list array, then store a JSON file
web3.eth.getBlockNumber()
    .then(number => getBatchStateRoot(number, BlockStep))
    .then(blocks => {
        var StateRootList = {};
        blocks.forEach(block => {
            StateRootList[block.number] = block.stateRoot;
            // console.log(block.number + '\t' + block.stateRoot)
        });
        var fs = require('fs');
        fs.writeFile('./output/StateRootList.json', JSON.stringify(StateRootList), 'utf8', function (err) {
            if (err) throw err;
            console.log('complete');
        });
    })