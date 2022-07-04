const mongoDB = require('../db');
const logger = require('../utils/logger');
const path = require('path');
const md5 = require('md5');
const nodemailer = require('nodemailer');
const ObjectId = require('mongodb').ObjectId; 
const dotenv = require('dotenv');

const setting = function (request, response) {
    const dbName = "Website";
    const collectionName = "Setting";

    var client = mongoDB.getDb();
    const db = client.db(dbName);
    var collection = db.collection(collectionName);

    collection.find({}).toArray(function (queryCollectionErr, result) {
        if (queryCollectionErr) {
            logger.log({
                level: 'error',
                message: `Error in query collection ${dbName}.${collectionName}. Error: ${queryCollectionErr}`
            })
            console.log(`Unable to query document(s) on the collection "${collectionName}". Error: ${queryCollectionErr}`);
            db.collection("User Accounts").find({ userID: request.session.UserID }).toArray(function (_queryCollectionErr, _result) {
                if (_queryCollectionErr) {

                }
                else {
                    response.render(path.join(path.resolve("."), '/public/templates/user/setting.html'), { result: _result });
                }
            });

        } else if (result.length) {
            db.collection("User Accounts").find({ userID: request.session.UserID }).toArray(function (_queryCollectionErr, _result) {
                if (_queryCollectionErr) {
                    logger.log({
                        level: 'error',
                        message: `Error in query collection ${dbName}.${collectionName}. Error: ${queryCollectionErr}`
                    })
                    console.log(`Unable to query document(s) on the collection "${collectionName}". Error: ${queryCollectionErr}`);
                }
                else {
                    response.render(path.join(path.resolve("."), '/public/templates/user/setting.html'), { icon: result[0].iconURI, title: result[0].mp_title, description: result[0].mp_description, result: _result });
                }
            });
        }
        else {
            db.collection("User Accounts").find({ userID: request.session.UserID }).toArray(function (_queryCollectionErr, _result) {
                if (_queryCollectionErr) {
                    logger.log({
                        level: 'error',
                        message: `Error in query collection ${dbName}.${collectionName}. Error: ${queryCollectionErr}`
                    })
                    console.log(`Unable to query document(s) on the collection "${collectionName}". Error: ${queryCollectionErr}`);
                }
                else {
                    response.render(path.join(path.resolve("."), '/public/templates/user/setting.html'), { result: _result });
                }
            });
        }
    });
}

module.exports = {
    setting
}