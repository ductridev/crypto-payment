const mongoDB = require('../db');
const logger = require('../utils/logger');

const saveTransactions = function (request, response) {
    const dbName = "transactions";
    const collectionName = "Signed Transactions";

    var client = mongoDB.getDb();
    const db = client.db(dbName);
    var collection = db.collection(collectionName);

    let input = { rawTransaction: request.params.rawTransaction, type: request.params.type, amount: request.params.amount };

    collection.insertOne(input, (insertCollectionErr, result) => {
        if (insertCollectionErr) {
            console.log(`Unable to insert document to the collection "${collectionName}". Error: ${insertCollectionErr}`);
            logger.log({
                level: 'error',
                message: `Error in insert collection ${dbName}.${collectionName}. Error: ${insertCollectionErr}`
            });
            response.send({ error: 'Error happened. Please contect support or try later.' })
        } else {
            console.log(`Inserted ${result.length} documents into the "${collectionName}" collection. The documents inserted with "_id" are: ${result.insertedId}`);
            response.send({ transaction_id: result.insertedId })
        }
    });

    client.close();
}

module.exports = {
    saveTransactions
}