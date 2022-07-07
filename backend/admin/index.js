const mongoDB = require('../db');
const logger = require('../utils/logger');
const path = require('path');
const md5 = require('md5');
const nodemailer = require('nodemailer');
const ObjectId = require('mongodb').ObjectId; 
const dotenv = require('dotenv');

const adminIndex = async function (request, response) {
    const dbName = "Website";

    var client = mongoDB.getDb();
    const db = client.db(dbName);

    let iconURI;
    let title;
    let description;

    db.collection("Setting").find({}).toArray(function (queryCollectionErr, result) {
        if (queryCollectionErr) {
            logger.log({
                level: 'error',
                message: `Error in query collection ${dbName}.${"Setting"}. Error: ${queryCollectionErr}`
            })
            console.log(`Unable to query document(s) on the collection "${"Setting"}". Error: ${queryCollectionErr}`);

        } else if (result.length) {
            iconURI = result[0].iconURI;
            title = result[0].mp_title;
            description = result[0].mp_description;
        }
    });

    var numOfUsers = await db.collection("User Accounts").countDocuments({});
    var numOfTransactions = await client.db("transactions").collection("Receipts").countDocuments({});
    var numOfSuccTransactions = await client.db("transactions").collection("Receipts").countDocuments({status: 'success'});
    var numOfFailTransactions = await client.db("transactions").collection("Receipts").countDocuments({status: 'failed'});
    var totalTransValue = await client.db("transactions").collection("Receipts").aggregate([{
        $group:{
            _id: '',
            "amount": { $sum: '$amount'}
        },
        $project: {
            _id: 0,
            "totalAmount": '$amount'
        }
    }]);

    response.render(path.join(path.resolve("."), '/public/templates/admin/index.html'), { icon: iconURI, title: title, description: description, numOfUsers: numOfUsers, numOfTransactions: numOfTransactions, numOfSuccTransactions: numOfSuccTransactions, numOfFailTransactions: numOfFailTransactions, totalAmount: totalTransValue.totalAmount, page: 'index' });
}

module.exports = {
    adminIndex
}