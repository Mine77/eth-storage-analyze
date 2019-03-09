const Trie = require('merkle-patricia-tree/secure');
const Levelup = require('levelup');
const Leveldown = require('leveldown');
const RLP = require('rlp');
const Config = require("./config.json")
var ProgressBar = require('progress');

const emptyStorageRoot = '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';
const addressStringSize = 43;

// Connect to the chaindata db
const db = Levelup(Leveldown(Config.DB_ADDRESS));

function readAddressFile(path) {
    var fs = require('fs');
    const stream = fs.createReadStream(path);


    stream.on('readable', function () {
        let address;
        address = stream.read(44);
        console.log(String(address));

    });

}

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
        if (storageRoot === emptyStorageRoot) resolve(0);
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
            height = Object.keys(statelist)[index];
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
        // accountKey = add0xPrefix(accountKey);

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


function convertResult2CSV(result, stateRootList) {
    return new Promise(function (resolve) {
        var csv = "Contract Address,";

        // add height as header to the csv
        Object.keys(stateRootList).forEach(height => {
            csv = csv + height + ",";
        })
        csv = csv.slice(0, -1) + '\n';

        //add size data to the csv
        Object.keys(result).forEach(address => {
            csv = csv + address + ",";

            Object.values(result[address]).forEach(size => {
                csv = csv + size + ","
            })
            csv = csv.slice(0, -1) + '\n';
        })

        resolve(csv);
    })
}

function main(db, stateRootList, accountList_path, result_path) {

    const fsRead = require('fs');
    const fsWrite = require('fs');
    const streamRead = fsRead.createReadStream(accountList_path);

    // remove the existed csv file
    try {
        fsWrite.unlinkSync(result_path)
        //file removed
    } catch (err) {
        console.error(err)
    }
    var initcsv = "Contract Address,";

    // add height as header to the csv
    Object.keys(stateRootList).forEach(height => {
        initcsv = initcsv + height + ",";
    })
    initcsv = initcsv.slice(0, -1) + '\n';
    fsWrite.writeFile(result_path, initcsv, function (err) {
        if (err) throw err;
    });

    // init progress bar
    fileStat = fsRead.statSync(accountList_path)
    var bar = new ProgressBar('processing [:bar] :etas', {
        total: fileStat.size / addressStringSize,
        incomplete: ' '
    });
    console.log(fileStat)

    //read from file
    streamRead.on('readable', async function () {
        let raw;
        var promiseBatch = [];
        var addressList = [];
        // console.log("ready");
        while (raw = streamRead.read(addressStringSize)) {
            let address = String(raw).substr(0, addressStringSize - 1)

            bar.interrupt(address + ' (' + bar.curr + '/' + bar.total + ') ')

            // calculate storage size and write to csv
            // use await for preventing overuse of memory 
            let csv = ""
            await getStorageSizeList(db, stateRootList, address)
                .then(accountSizeBatch => {
                    csv = csv + address + ",";
                    Object.values(accountSizeBatch).forEach(size => {
                        csv = csv + size + ",";
                    })
                    csv = csv.slice(0, -1) + '\n';
                    // console.log(csv);
                    fsWrite.appendFile(result_path, csv, function (err) {
                        if (err) throw err;
                    });
                    bar.tick();
                })
        }
    })
}



// const stateRoot_test = "0xe8b330fe7b24c08a8792a1af7f732b8065d03cfc456f506f4c9ea1651a44fd48";
// const AccountKey_test = "ffbf5e17acaefdd291820cfea154909363f896621155df2e426d88e15252a6bd";
// const AccountAddress_test = '0xC669eAAD75042BE84daAF9b461b0E868b9Ac1871';
// const StorageRoot_test = "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421";

// readAddressFile(accountKeyList)
// testStateRoot({"150001": "0xe8b330fe7b24c08a8792a1af7f732b8065d03cfc456f506f4c9ea1651a44fd48"})
// getStorageRoot(db, stateRoot_test, AccountAddress_test).then(console.log)
// getStorageSizeList(db, stateRootList, AccountAddress_test).then(console.log)


const stateRootList = require(Config.STATE_ROOT_INPUT_ADDRESS);
main(db, stateRootList, Config.ACCOUNT_LIST_ADDRESS, Config.RESULT_ADDRESS)