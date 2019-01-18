const Trie = require('merkle-patricia-tree');
const Levelup = require('levelup');
const Leveldown = require('leveldown');
const RLP = require('rlp');
const Config = require("./config.json")

const emptyStorageRoot = '56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';

// Connect to the chaindata db
const db = Levelup(Leveldown(Config.DB_ADDRESS));



// streamTrie and return all the key and values
function streamTrie(db, root) {
    return new Promise(function (resolve, reject) {
        const trie = new Trie(db, root);
        var allData = [];

        trie.createReadStream()
            .on('data', function (data) {
                //values are rlp encoded
                var dataDecoded = {};
                dataDecoded['key'] = data.key.toString('hex');
                var valueDecoded = [];
                RLP.decode(data.value).forEach(value => {
                    valueDecoded.push(value.toString('hex'));
                })
                dataDecoded['value'] = valueDecoded;
                allData.push(dataDecoded);
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

function testStateRoot(statelist) {

    const getRawBatch =
        Object.values(
            statelist
        ).map(
            _stateRoot => streamTrie(db, _stateRoot)
        );

    Promise.all(getRawBatch).then(rawBatch => {
        rawBatch.forEach(raw => {
            index = rawBatch.indexOf(raw);
            height = height = Object.keys(statelist)[index];
            if (raw.length === 0) {

                console.log(height + ': empty!');
            } else {
                raw.forEach(data => {
                    if (data.value[2] != emptyStorageRoot) {
                        console.log(data.key)
                        console.log(data.value)
                        console.log("\n\n");
                    }
                })
                console.log(height + ': Notempty!');
            }

        })
    })

}

// geth the state size of an account on a certain stateRoot
function getStorageRoot(db, stateRoot, accountKey) {
    return new Promise(function (resolve, reject) {

        //Creating a trie object
        var trie = new Trie(db, stateRoot);

        trie.get(accountKey, function (err, value) {
            if (err) {
                reject(new Error(err))
            }
            var valudeDecoded = RLP.decode(value)
            var storageRoot = valudeDecoded[2].toString('hex')
            resolve("0x" + storageRoot);
        })
    })
}



function getAccountSizes(db, stateRootList, accountKey) {
    return new Promise(function (resolve, reject) {

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
            .catch(function onRejected(error) {
                console.error("Get Storage Root Error:\n\n");
                reject(new Error(error))
            })
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

// function main(db, stateRootList, accountList) {
//     return new Promise(function(resolve,reject) {

//         const getAccountSize

//         accountList.forEach(key => {
//             getAccountSizes(db, stateRootList, key).then(console.log)
//         })
//     })
// }

const stateRootList = require(Config.STATE_ROOT_INPUT_ADDRESS);


const StateRootList_test = require('./testStateRootList.json');
const AccountKeyList_test = require('./accounts.json');

const stateRoot_test = "0x8a8a6963b30486fe99890a0f0d76f488c78af637befd095c7e98e92a5b31e2c4";
const StorageRoot_test = "0xb3f65a145df45e5605b2b09b353d9b64820e02ec41fff6d2c9d2325f59938060";
const AccountKey_test = "0x5747bb9272f0e913002a9732536530096d0e6a9b1ab678e542be81d2e32aeea9";



// testStateRoot({"0": stateRoot_test})

// getAccountSizes(db, stateRootList, AccountKey_test).then(console.log)

getStorageRoot(db,stateRoot_test,AccountKey_test).then(console.log)