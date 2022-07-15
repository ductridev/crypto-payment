const mongoDB = require('../db');
const logger = require('../utils/logger');
const ObjectId = require('mongodb').ObjectId; 

const getPayment = async (request, response) =>{
    const dbName = "transactions";
    const collectionName = "Transactions";

    var client = mongoDB.getDb();
    const db = client.db(dbName);

    var collection = db.collection(collectionName);
    collection.findOne({ _id: new ObjectId(request.params.paymentID)}, function (queryCollectionErr, result) {
        if(queryCollectionErr){
            logger.error(queryCollectionErr);
            logger.info(`No transaction with ID: ${request.params.paymentID}`);
            response.send({exist: false});
        }
        else{
            response.send({amount: result.amount, sellerAddress: result.sellerAddress, currency: result.currency, paymentStatus: result.paymentStatus, exist: true});
        }
    })
}

module.exports = {
    getPayment
}