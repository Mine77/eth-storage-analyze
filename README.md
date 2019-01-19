# eth-storage-analyze (WIP)

 This project is for analyzing all the smart contract on Ethereum regarding their state storage size. The obejctive result data are:

1. Get the curve of global state occupancy and the current growth rate;
2. Analyze the contract with the largest occupancy status
3. Analyze the contract with the fastest growing occupancy status

## How it works

The storage in Ethereum is stored in the data structure of MPT. where the state is stored in a StateTree, and the leaf nodes of this trie are the accounts (EOA and contract account). Each account has 4 values: `nonce`, `balance`, `storageRoot`, `codeHash`.
When the account is a contract account, there will be a StorageTree with its `storageRoot` as the root. The leaf node of this trie is a Key-Value storage pair, where the size of Key and Value is 32 bytes, coded with RLP. Read more about this at [here](https://github.com/ethereum/wiki/wiki/Patricia-Tree).

So to calculate the storage size of a smartcontract, we first need to stream the StateTrie of with a block's `stateRoot`, then we use the `hash(CONTRACT_ADDRESS)` as the key to search of its `storageRoot`. Then stream this StorageTrie to get a key-value array. Every key-value pairs takes a storage slot of 64bytes. So just calculate how many key-value pairs are there and multiple it with 64 bytes, which will give you the size of the state storage of this contract on this block height.

To get the address list of all the contract, I personally use a modified Geth client called `gethye`, (thanks to [@yejiayu](https://github.com/yejiayu) for helping me on this. I named this client after your name). If you got another method to get this address list, I'd be more than happy to know.

## Files

`index.js` reads the contract address from the `data/address.json` and stateRoot from `data/StateRootList.json`, and for every address, the script print an array of key-value pairs, where key is the block height and value is the state storage size of this contract on this height. The result will be writen to `data/result.csv`.

`scan_stateroot.js` returns the file `data/StateRootList.json` with a list of stateRoot hash by query a full node throw JSON-RPC.

`config.json` has the configs for setting addresses and block step etc.

## Usage
First, you need to run a [Geth](https://geth.ethereum.org/install/) client to get the database `chaindata`. Use the shell script below will start a Geth process in the background in the fullnode mode (necessary for getting chaindata). 
```bash
#!/usr/bin/env bash
echo "Geth at work!"
screen -dmS geth geth --syncmode "full" --cache=1024
```

Install dependecies
```
npm install
```

To get a list of stateRoot
```
node scan_stateroot.js
```

To get the result csv
```
node index.js
```


## Config

```
{
    "IPC_ADDRESS": "/Users/User/Library/Ethereum/geth.ipc",
    "RPC_ADDRESS": "http://0.0.0.0:8545/", // you can choose to use RPC or IPC to connect to a node
    "DB_ADDRESS": "/Users/User/Library/Ethereum/geth/chaindata",

    "STATE_ROOT_OUTPUT_ADDRESS": "./data/StateRootList.json", // the address that scan_stateroot.js output to
    "STATE_ROOT_INPUT_ADDRESS": "./data/StateRootList.json", // the address that index.js 
    "ACCOUNT_ADDRESS_LIST": "./data/accounts.json", // the address that index.js 
    "RESULT_ADDRESS" : "./data.result.csv" // the address that the result output to

    "BLOCK_STEP": 28800  // (60*60*24)/15 * 5 = 5days, i.e. get a stateRoot every 5 days

    "CONNECT_WITH_RPC": false, // if scan_stateroot.js should connect to node via RPC (falst for IPC)
}
```

## Reference
* [Diving into Ethereum’s world state](https://medium.com/cybermiles/diving-into-ethereums-world-state-c893102030ed)
* [GitHub: Merkle Particia Trie](https://github.com/ethereumjs/merkle-patricia-tree)
