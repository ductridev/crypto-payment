const mongoDB = require('../db');
const logger = require('../utils/logger');

const getHash = function (request, response) {
    const dbName = "transactions";
    const collectionName = "Receipts";

    var client = mongoDB.getDb();
    const db = client.db(dbName);
    var collection = db.collection(collectionName);

    let input = { transaction_id: request.params.transaction_id };

    collection.findOne(input).toArray(function (queryCollectionErr, result) {
        if (queryCollectionErr) {
            logger.log({
                level: 'error',
                message: `Error in query collection ${dbName}.${collectionName}. Error: ${queryCollectionErr}`
            })
            console.log(`Unable to query document(s) on the collection "${collectionName}". Error: ${queryCollectionErr}`);

        } else if (result.length) {

            response.send({ transactionHash: result.receipt });

        }
    });
}

module.exports = {
    getHash
}