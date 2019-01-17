const Trie = require('merkle-patricia-tree/secure');
const levelup = require('levelup');
const leveldown = require('leveldown');
const rlp = require('rlp');

const config = require("./config.json")

const emptyStateRoot = '56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';

// Connect to the chaindata db
const db = levelup(leveldown(config.DB_ADDRESS));

// streamTrie and print a list of keys and values
function streamStateTrie(stateroot) {
    const trie = new Trie(db, stateroot);
    var count = 0;
    var contractCount = 0;
    trie.createReadStream()
        .on('data', function (data) {

            //accouts are rlp encoded
            var decodedVal = rlp.decode(data.value);
            stateRoot = decodedVal[2].toString('hex');
            count = count + 1;

            if (stateRoot != emptyStateRoot) {

                // for debugging
                // console.log(stateRoot);
                // console.log('\n');

                streamStorageTrie(data.key.toString('hex'), '0x' + stateRoot)
                contractCount = contractCount + 1;
            }

        })
        .on('end', function () {
            console.log('Contract Count:' + contractCount);
            console.log('All Account Count:' + count);
        })
}

// stream storage trie and print its size
function streamStorageTrie(key, storageroot) {
    const trie = new Trie(db, storageroot);
    var count = 0;
    trie.createReadStream()
        .on('data', function (data) {

            var decodedVal = rlp.decode(data.value);
            count = count + 1;
            // for debugging
            // console.log('key:' + data.key.toString('hex'));
            // console.log('value:' + decodedVal.toString('hex'));
        })
        .on('end', function () {
            console.log('key:' + key);
            console.log('Storage Counts:' + count);
            // for debugging
            // console.log('Stream Finished!');
        })
}

function getPath(root, key) {
    var trie = new Trie(db, root);
    trie.findPath(key, function (err, node, keyRemainder, stack) {
        if (err) return cb(err)
        console.log(stack);
    })
}

var stateRoot = "0x435f5b24c848fee3e68bf9abb63c7a43da720f0fa554dfa0fee5dd65c26879fb"
var storageRoot = "0x66f4b2aa02ea0500c90c595b57d4a30aad982e1723db282eb0de8e641fdb0f9e"
// var accountKey = "4f18656fc3fd36629f534929f19836d522e79a2c11eeefe37987118672b5747e"

// streamStateTrie(stateRoot);

// streamStorageTrie(storageRoot);

// getPath(stateRoot, accountKey)