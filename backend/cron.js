var cron = require('node-cron');
const dotenv = require('dotenv');
const https = require('https');
const { MongoClient } = require('mongodb');
const Web3 = require('web3');

dotenv.config();

const updateTokenPriceTask = cron.schedule("* */15 * * *", async () => {
    const options = {
        "method": "GET",
        "hostname": "rest.coinapi.io",
        "path": "/v1/exchangerate/USD?invert=true",
        "headers": { 'X-CoinAPI-Key': process.env.COINAPI_APIKEY }
    };

    const username = process.env.USERNAME;
    const password = process.env.PASSWORD;
    const cluster = process.env.CLUSTER;
    const dbName = "TokenPrices";
    const collectionName = "Exchange Rates";

    var request = https.request(options, function (response) {
        var chunks = [];
        response.on("data", function (chunk) {
            chunks.push(chunk);
        });
        response.on('end', function () {
            try {
                chunks = JSON.parse(Buffer.concat(chunks).toString());
                const mongoClient = new MongoClient(`mongodb+srv://admin:${password}@${cluster}.mongodb.net/?retryWrites=true&w=majority`,
                    {
                        useNewUrlParser: true,
                        useUnifiedTopology: true
                    }
                );
                mongoClient.connect(function (mongoClientErr, client) {
                    if (mongoClientErr) {
                        console.log('Unable to connect to the MongoDB server. Error:', mongoClientErr);
                    }
                    else {
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

                        // client.close();
                    }
                });
            } catch (apiResponeErr) {
                console.log(`Unable to get data from API. Error: ${apiResponeErr}`);
            }
        });
    });

    request.end();
}, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh"
});

updateTokenPriceTask.start();

const sendBatchTransaction = cron.schedule("* */3 * * *", async () => {
    const EthereumWeb3 = new Web3(process.env.INFURA_API);
    var batch = new EthereumWeb3.BatchRequest();

    const username = process.env.USERNAME;
    const password = process.env.PASSWORD;
    const cluster = process.env.CLUSTER;
    const dbName = "transactions";
    const collectionName = "Signed Transactions";
    const collectionName1 = "Receipts";

    const mongoClient = new MongoClient(`mongodb+srv://admin:${password}@${cluster}.mongodb.net/?retryWrites=true&w=majority`,
        {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }
    );
    mongoClient.connect(function (mongoClientErr, client) {
        if (mongoClientErr) {
            console.log('Unable to connect to the MongoDB server. Error:', mongoClientErr);
        }
        else {
            const db = client.db(dbName);
            var collection = db.collection(collectionName);
            var collection1 = db.collection(collectionName1);

            collection.find().toArray(function (queryCollectionErr, result) {

                if (queryCollectionErr) {

                    console.log(`Unable to query document(s) on the collection "${collectionName}". Error: ${queryCollectionErr}`);

                } else if (result.length) {

                    batch.add(
                        EthereumWeb3.eth.sendSignedTransaction(result.rawTransaction).on('receipt', (_result) => {
                            collection1.insertOne({ receipt: _result.transactionHash }, (insertCollectionErr, __result) => {
                                if (insertCollectionErr) {
                                    console.log(`Unable to insert document to the collection "${collectionName}". Error: ${insertCollectionErr}`);
                                } else {
                                    console.log(`Inserted ${__result.length} documents into the "${collectionName}" collection. The documents inserted with "_id" are: ${__result.insertedId}`);
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
                console.log();
            }
            // client.close();
        }
    });
})

sendBatchTransaction.start();