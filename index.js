const Trie = require('merkle-patricia-tree/secure');
const Levelup = require('levelup');
const Leveldown = require('leveldown');
const RLP = require('rlp');
const Config = require("./config.json")

const emptyStorageRoot = '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';

// Connect to the chaindata db
const db = Levelup(Leveldown(Config.DB_ADDRESS));

// streamTrie and return all the key and values
function streamTrie(db, root) {
    return new Promise(function (resolve, reject) {
        const trie = new Trie(db, root);
        var allData = {};

        trie.createReadStream()
            .on('data', function (data) {
                //values are rlp encoded
                allData[data.key.toString('hex')] = RLP.decode(data.value);
                // for debugging
                // console.log(data.key.toString('hex'));
            })
            .on('end', function () {
                resolve(allData);
            })
            .on('error', function (err) {
                reject(new Error(err));
            })
    })
}

// caculate the storage size given a storageRoot
function calculateStorageSize(db, storageRoot) {
    return new Promise(function (resolve, reject) {
        if (storageRoot === null) resolve(null);
        streamTrie(db, storageRoot).then(data => {
            resolve(Object.keys(data).length);
        }).catch(function onRejected(error) {
            reject(new Error(error))
        });
    })
}

// geth the state size of an account on a certain stateRoot
function getStorageRoot(db, stateRoot, accountKey) {
    return new Promise(function (resolve, reject) {
        var storageRoot = 0;
        streamTrie(db, stateRoot)
            .then(data => {
                if (accountKey in data) {
                    storageRoot = '0x' + data[accountKey][2].toString('hex');
                    resolve(storageRoot);
                } else {
                    // if not found than reject 
                    resolve(null)
                }
            }).catch(function onRejected(error) {
                console.error("Get Storage Root Error:\n\n");
                console.log(error)
            });
    })
}

function testStateRoot(statelist) {

    // for each stateRoot, get the storage size of the account 
    const getStateRootPromiseBatch =
        Object.values(
            statelist
        ).map(
            _stateRoot => streamTrie(db, _stateRoot)
        );

    Promise.all(getStateRootPromiseBatch).then(stateRoot => {
        for (i = 0; i < Object.keys(statelist).length; i++) {
            height = Object.keys(statelist)[i];
            // if stateRoot[i] does not exist
            if (Object.keys(stateRoot[i]).length === 0) {
                console.log(height + ': empty!');
            } else {
                console.log(height + ': Notempty!');
                console.log(Object.keys(stateRoot[i]));
            }
        }
    })

}

function getAccountSizes(db, stateRootList, accountKey) {
    return new Promise(function (resolve) {

        const getStorageRootPromiseBatch =
            Object.values(
                stateRootList
            ).map(
                _stateRoot => getStorageRoot(db, _stateRoot, accountKey)
            )

        Promise.all(getStorageRootPromiseBatch).then(storageRoots => {
                const caculateStorageSizePromiseBatch =
                    storageRoots.map(
                        _storageRoot => calculateStorageSize(db, _storageRoot)
                    );
                return Promise.all(caculateStorageSizePromiseBatch)
            })
            .catch(console.log)
            .then(sizes => {
                var sizesOnHeight = stateRootList;
                Object.keys(sizesOnHeight).forEach(key => {
                    var index = Object.keys(sizesOnHeight).indexOf(key);
                    sizesOnHeight[key] = sizes[index];
                })
                // console.log(sizesOnHeight)
                resolve(sizesOnHeight);
            })
    })

}

const stateRootList = require(Config.STATE_ROOT_INPUT_ADDRESS);


const StateRootList_test = require('./testStateRootList.json');
const AccountKeyList_test = require('./accounts.json');

const stateRoot_test = "0x8a8a6963b30486fe99890a0f0d76f488c78af637befd095c7e98e92a5b31e2c4";
const StorageRoot_test = "0x66f4b2aa02ea0500c90c595b57d4a30aad982e1723db282eb0de8e641fdb0f9e";
const AccountKey_test = "5c8f7a9b0f6d27af8b2fbb5ddd8be7b92d3cbe7be9b681b0818f6672ad4d9ed7";


// testStateRoot(StateRootList_test)

getAccountSizes(db, stateRootList, AccountKey_test).then(console.log)