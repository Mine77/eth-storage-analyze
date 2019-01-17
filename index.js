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
            })
            .on('end', function () {
                resolve(allData);
                // console.log('Stream Finished');
            })
            .on('error', function (err) {
                reject(new Error(err));
            })
    })
}

function calculateStorageSize(db,storageRoot) {
    return new Promise(function(resolve,reject) {
        streamTrie(db,storageRoot).then(data => {
            resolve(Object.keys(data).length);
        }).catch(function onRejected(error){
            console.error(error);
        });
    })
}

const stateRoot = "0x435f5b24c848fee3e68bf9abb63c7a43da720f0fa554dfa0fee5dd65c26879fb"
const testStorageRoot = "0x66f4b2aa02ea0500c90c595b57d4a30aad982e1723db282eb0de8e641fdb0f9e"
const accountKey = "8f22c90535b94094379767ebdf7bff46efc7427425b2b3fb1684538b88274523"

// calculateStorageSize(db,testStorageRoot);

streamTrie(db, stateRoot)
    .then(data => {
        Object.values(data).forEach(value => {
            // storageRoot needs 0x as prefix
            var storageRoot = '0x' + value[2].toString('hex');
            var storageSize = [];
            if (storageRoot != emptyStorageRoot) {
                calculateStorageSize(db,storageRoot).then(console.log);
                // console.log(storageRoot);
            }
        })
    });

// streamStorageTrie(db,storageRoot);