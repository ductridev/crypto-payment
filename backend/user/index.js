const mongoDB = require('../db');
const logger = require('../utils/logger');
const path = require('path');
const md5 = require('md5');
const nodemailer = require('nodemailer');
const ObjectId = require('mongodb').ObjectId; 
const dotenv = require('dotenv');

const index = async function (request, response) {
    const dbName = "Website";

    var client = mongoDB.getDb();
    const db = client.db(dbName);

    let iconURI;
    let title;
    let description;

    db.collection("Setting").findOne({}, function (queryCollectionErr, result) {
        if (queryCollectionErr) {
            logger.log({
                level: 'error',
                message: `Error in query collection ${dbName}.${"Setting"}. Error: ${queryCollectionErr}`
            })
            console.log(`Unable to query document(s) on the collection "${"Setting"}". Error: ${queryCollectionErr}`);

        } else {
            iconURI = result.iconURI;
            title = result.mp_title;
            description = result.mp_description;
        }
    });

    await db.collection("User Accounts").findOne({_id: new ObjectId(request.session.UserID)}, function(queryCollectionErr, result){
        if (queryCollectionErr) {
            logger.log({
                level: 'error',
                message: `Error in query collection ${dbName}.${"Setting"}. Error: ${queryCollectionErr}`
            })
            console.log(`Unable to query document(s) on the collection "${"Setting"}". Error: ${queryCollectionErr}`);

        } else {
            request.session.user = result;
            response.render(path.join(path.resolve("."), '/public/templates/user/index.html'), { icon: iconURI, title: title, description: description, userID: request.session.UserID, user: result });
        }
    });
}

module.exports = {
    index
}