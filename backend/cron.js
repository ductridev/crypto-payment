var cron = require('node-cron');
const logger = require('./utils/logger');
const https = require('https');
const Web3 = require('web3');
const { RelayProvider } = require('@opengsn/provider');
const ObjectId = require('mongodb').ObjectId; 

const {Biconomy} = require('@biconomy/mexa');

var mongoDB = require('./db');

const updateTokenPriceInUSDTask = cron.schedule("*/15 * * * *", async () => {
    const options = {
        "method": "GET",
        "hostname": "rest.coinapi.io",
        "path": "/v1/exchangerate/USD?invert=true",
        "headers": { 'X-CoinAPI-Key': process.env.COINAPI_APIKEY }
    };
    const dbName = "TokenPrices";
    const collectionName = "Exchange Rates";

    var client = mongoDB.getDb();

    var request = https.request(options, function (response) {
        var chunks = [];
        response.on("data", function (chunk) {
            chunks.push(chunk);
        });
        response.on('end', function () {
            try {
                chunks = JSON.parse(Buffer.concat(chunks).toString());
                const db = client.db(dbName);
                var collection = db.collection(collectionName);
                chunks.rates.forEach((element) => {
                    let input = { lastUpdatedTime: element.time, assetIdQuote: element.asset_id_quote, rate: element.rate, assetIdBase: 'USD' };

                    collection.find({ assetIdQuote: element.asset_id_quote }).toArray(function (queryCollectionErr, result) {

                        if (queryCollectionErr) {

                            logger.error(`Unable to query document(s) on the collection "${collectionName}". Error: ${queryCollectionErr}`);

                        } else if (result.length) {

                            collection.updateOne({ assetIdQuote: element.asset_id_quote }, { $set: { lastUpdatedTime: element.time, rate: element.rate } }).then((obj) => {
                                if (obj) {
                                    logger.log('Updated - ', obj);
                                } else {
                                    logger.log(`No document found with defined "${element.asset_id_quote}" criteria!`);
                                }
                            }).catch((e) => {
                                logger.error(`Unable to update document to the collection "${collectionName}". Error: ${e}`);
                            });

                        } else {

                            collection.insertOne(input, (insertCollectionErr, result) => {
                                if (insertCollectionErr) {
                                    logger.error(`Unable to insert document to the collection "${collectionName}". Error: ${insertCollectionErr}`);
                                } else {
                                    logger.log(`Inserted ${result.length} documents into the "${collectionName}" collection. The documents inserted with "_id" are: ${result.insertedId}`);
                                }
                            });

                        }

                    });
                });
            } catch (apiResponeErr) {
                logger.error(`Unable to get data from API. Error: ${apiResponeErr}`);
            }
        });
    });

    request.end();
}, {
    scheduled: false,
});

const sendBatchTransaction = cron.schedule("*/2 * * * *", async () => {

    let biconomy = new Biconomy(new Web3.providers.HttpProvider(process.env.INFURA_API),{
        // walletProvider: <Wallet Provider>, 
        apiKey: process.env.ETH_BICONOMY_APIKEY, 
        debug: false
      }); 

    // const provider = await RelayProvider.newProvider({ provider: process.env.INFURA_API || EthereumWeb3.currentProvider, config }).init();
    const EthereumWeb3 = new Web3(biconomy);
    
    var batch = new EthereumWeb3.BatchRequest();

    // const ws = new WebSocket('ws://localhost:17214/');
    // const timer = setInterval(() => {
    //     if (ws.readyState === 1) {
    //         clearInterval(timer);
    //     }
    // }, 100);

    const dbName = "transactions";
    const collectionName = "Signed Transactions";
    const collectionName1 = "Receipts";

    var client = mongoDB.getDb();

    const db = client.db(dbName);
    var collection = db.collection(collectionName);
    var collection1 = db.collection(collectionName1);

    collection.find({status: 'pending'}).toArray(function (queryCollectionErr, result) {

        if (queryCollectionErr) {

            logger.error(`Unable to query document(s) on the collection "${collectionName}". Error: ${queryCollectionErr}`);

        } else if (result.length) {
            for (let i = 0; i < result.length; i++) {
                batch.add(
                    EthereumWeb3.eth.sendSignedTransaction(result[i].rawTransaction).on('receipt', (_result) => {
                        collection1.insertOne({ receipt: _result.transactionHash, amount: result[i].amount, transaction_id: result[i]._id, status: _result.status ? 'success' : 'failed' }, (insertCollectionErr, __result) => {
                            if (insertCollectionErr) {
                                logger.error(`Unable to insert document to the collection "${collectionName}". Error: ${insertCollectionErr}`);
                            } else {
                                logger.log(`Inserted ${__result.length} documents into the "${collectionName}" collection. The documents inserted with "_id" are: ${__result.insertedId}`);

                                // if (ws.readyState === 1) {
                                //     ws.onmessage((msg) => {
                                //         var jsonObject = JSON.parse(msg.data);
                                //         console.log(jsonObject);
                                //     });
                                //     ws.send(JSON.stringify('{"type":"ping"}'));
                                //     ws.send(JSON.stringify({ type: 'newSignedTransactions', transactionId: result[i]._id, transactionHash: _result.transactionHash, rawTransaction: result[i].rawTransaction, transactionType: result[i].type, amount: result[i].amount, from: _result.from, to: _result.to, gasUsed: _result.gasUsed, contractAddress: _result.contractAddress }));
                                // }
                                // else {
                                //     console.log('WebSocket not ready');
                                // }
                            }
                        })
                        collection.updateOne({_id: new ObjectId(result[i]._id)}, {$set: {status: _result.status ? 'success' : 'failed'}}).then((obj) => {
                            if (obj) {
                                logger.log('Updated - ', obj);
                            } else {
                                logger.log(`No document found with defined "${result[i]._id}" criteria!`);
                            }
                        });
                    })
                );
            }
        }

    });
    try {
        batch.execute();
    }
    catch (e) {
    }
}, {
    scheduled: false,
})

console.log('Cron started');

// updateTokenPriceInUSDTask.start();
sendBatchTransaction.start();