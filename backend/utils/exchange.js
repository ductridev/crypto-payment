const mongoDB = require('../db');
const logger = require('../utils/logger');

const exchange = async (request, response) => {
    const dbName = "TokenPrices";
    const collectionName = "Exchange Rates";

    var client = mongoDB.getDb();
    const db = client.db(dbName);

    var collection = db.collection(collectionName);
    collection.findOne({ assetIdQuote: request.params.token, assetIdBase: request.params.currency}, function (queryCollectionErr, result) {
        if(queryCollectionErr){
            logger.error(queryCollectionErr);
            logger.info('No token or currency found');
            response.send({error: true, description: 'No token or currency match!'});
        }
        else{
            response.send({amountTo: (request.params.amount / result.rate).toString()});
        }
    })
}

module.exports = {
    exchange
}