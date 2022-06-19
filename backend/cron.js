var cron = require('node-cron');
const https = require('https');
const Web3 = require('web3');
var mongoDB = require('./db');

const updateTokenPriceTask = cron.schedule("*/15 * * * *", async () => {
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
                console.log(chunks);
                const db = client.db(dbName);
                var collection = db.collection(collectionName);
                chunks.rates.forEach((element) => {
                    let input = { lastUpdatedTime: element.time, assetIdQuote: element.asset_id_quote, rate: element.rate, assetIdBase: 'USD' };

                    collection.find({ assetIdQuote: element.asset_id_quote }).toArray(function (queryCollectionErr, result) {

                        if (queryCollectionErr) {

                            console.log(`Unable to query document(s) on the collection "${collectionName}". Error: ${queryCollectionErr}`);

                        } else if (result.length) {

                            collection.updateOne({ assetIdQuote: element.asset_id_quote }, { $set: { lastUpdatedTime: element.time, rate: element.rate } }).then((obj) => {
                                if (obj) {
                                    console.log('Updated - ', obj);
                                } else {
                                    console.log(`No document found with defined "${element.asset_id_quote}" criteria!`);
                                }
                            }).catch((e) => {
                                console.log(`Unable to update document to the collection "${collectionName}". Error: ${e}`);
                            });

                        } else {

                            collection.insertOne(input, (insertCollectionErr, result) => {
                                if (insertCollectionErr) {
                                    console.log(`Unable to insert document to the collection "${collectionName}". Error: ${insertCollectionErr}`);
                                } else {
                                    console.log(`Inserted ${result.length} documents into the "${collectionName}" collection. The documents inserted with "_id" are: ${result.insertedId}`);
                                }
                            });

                        }

                    });
                });
            } catch (apiResponeErr) {
                console.log(`Unable to get data from API. Error: ${apiResponeErr}`);
            }
        });
    });

    request.end();
}, {
    scheduled: false,
});

const sendBatchTransaction = cron.schedule("*/2 * * * *", async () => {
    const EthereumWeb3 = new Web3(process.env.INFURA_API);
    var batch = new EthereumWeb3.BatchRequest();

    const ws = new WebSocket('ws://localhost:17214/');
    const timer = setInterval(() => {
        if (ws.readyState === 1) {
            clearInterval(timer);
        }
    }, 100);

    const dbName = "transactions";
    const collectionName = "Signed Transactions";
    const collectionName1 = "Receipts";

    var client = mongoDB.getDb();

    const db = client.db(dbName);
    var collection = db.collection(collectionName);
    var collection1 = db.collection(collectionName1);

    collection.find().toArray(function (queryCollectionErr, result) {

        if (queryCollectionErr) {

            console.log(`Unable to query document(s) on the collection "${collectionName}". Error: ${queryCollectionErr}`);

        } else if (result.length) {

            batch.add(
                EthereumWeb3.eth.sendSignedTransaction(result.rawTransaction).on('receipt', (_result) => {
                    collection1.insertOne({ receipt: _result.transactionHash, transaction_id: result._id }, (insertCollectionErr, __result) => {
                        if (insertCollectionErr) {
                            console.log(`Unable to insert document to the collection "${collectionName}". Error: ${insertCollectionErr}`);
                        } else {
                            console.log(`Inserted ${__result.length} documents into the "${collectionName}" collection. The documents inserted with "_id" are: ${__result.insertedId}`);

                            if (ws.readyState === 1) {
                                ws.onmessage((msg) => {
                                    var jsonObject = JSON.parse(msg.data);
                                    console.log(jsonObject);
                                });
                                ws.send(JSON.stringify('{"type":"ping"}'));
                                ws.send(JSON.stringify({ type: 'newSignedTransactions', transactionId: result._id, transactionHash: _result.transactionHash, rawTransaction: result.rawTransaction, transactionType: result.type, amount: result.amount, from: _result.from, to: _result.to, gasUsed: _result.gasUsed, contractAddress: _result.contractAddress }));
                            }
                            else {
                                console.log('WebSocket not ready');
                            }
                        }
                    })
                })
            );
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

updateTokenPriceTask.start();
sendBatchTransaction.start();