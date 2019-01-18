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
        root = add0xPrefix(root);

        const trie = new Trie(db, root);
        var allData = [];

        trie.createReadStream()
            .on('data', function (data) {
                //values are rlp encoded
                var dataDecoded = {};
                dataDecoded['key'] = data.key.toString('hex');
                dataDecoded['value'] = RLP.decode(data.value);
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
                resolve(data.length);
            })
            .catch(function onRejected(error) {
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

function add0xPrefix(str) {
    if (str[0] === '0' && str[1] === 'x') {
        return str;
    } else {
        return "0x" + str;
    }
}

// geth the state size of an account on a certain stateRoot
function getStorageRoot(db, stateRoot, accountKey) {
    return new Promise(function (resolve, reject) {
        stateRoot = add0xPrefix(stateRoot);
        accountKey = add0xPrefix(accountKey);

        //Creating a trie object
        var trie = new Trie(db, stateRoot);

        trie.get(accountKey, function (err, value) {
            if (err) {
                reject(new Error(err))
            }
            if (value === null) {
                resolve(null);
            } else {
                var valudeDecoded = RLP.decode(value);
                var storageRoot = valudeDecoded[2].toString('hex')
                resolve("0x" + storageRoot);
            }

        })
    })
}

function getStorageSizeList(db, stateRootList, accountAddress) {
    return new Promise(function (resolve, reject) {
        heightList = Object.keys(stateRootList);

        const getStorageRootBatch = Object.values(stateRootList)
            .map(stateRoot => getStorageRoot(db, stateRoot, accountAddress));

        Promise.all(getStorageRootBatch)
            .then(storageRootBatch => {

                return Promise.all(
                    storageRootBatch.map(storageRoot => calculateStorageSize(db, storageRoot))
                );
            })
            .then(storageSizeBatch => {

                var storageSizeList = {};
                for (i = 0; i < storageSizeBatch.length; i++) {
                    storageSizeList[heightList[i]] = storageSizeBatch[i];
                }

                resolve(storageSizeList)
            })
            .catch(function onRejected(error) {
                reject(new Error(error))
            });
    })
}

function main(db, stateRootList, accountList) {
    return new Promise(function (resolve, reject) {

        const getAccountSizeBatch =
            accountList.map(accountAddress => getStorageSizeList(db, stateRootList, accountAddress));
        
        Promise.all(getAccountSizeBatch)
        .then(accountSizeBatch => {
            var accountSizes = {}
            for(i=0;i<accountList.length;i++) {
                accountSizes[accountList[i]] = accountSizeBatch[i]
            }
            resolve(accountSizes);
        })
        .catch(function onRejected(error) {
            reject(new Error(error))
        });

    })
}

const stateRootList = require(Config.STATE_ROOT_INPUT_ADDRESS);
const accountKeyList = require(Config.ACCOUNT_LIST_ADDRESS);

const stateRoot_test = "8a8a6963b30486fe99890a0f0d76f488c78af637befd095c7e98e92a5b31e2c4";
const StorageRoot_test = "b3f65a145df45e5605b2b09b353d9b64820e02ec41fff6d2c9d2325f59938060";
const AccountKey_test = "5747bb9272f0e913002a9732536530096d0e6a9b1ab678e542be81d2e32aeea9";



// testStateRoot({"0": stateRoot_test})

// getStorageRoot(db, stateRoot_test, AccountKey_test).then(console.log)

// main(db, stateRootList, AccountKeyList_test).then(console.log)

// getStorageSizeList(db, stateRootList, AccountKey_test).then(console.log)


main(db,stateRootList,accountKeyList).then(result => {
    var fs = require('fs');
    fs.writeFile(Config.RESULT_ADDRESS, JSON.stringify(result), 'utf8', function (err) {
        if (err) throw err;
        console.log('complete');
    });
})