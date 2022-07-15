const mongoDB = require('../db');
const logger = require('../utils/logger');
const path = require('path');
const md5 = require('md5');
const nodemailer = require('nodemailer');
const ObjectId = require('mongodb').ObjectId; 
const dotenv = require('dotenv');

const login = function (request, response) {
    if (request.session.LoginUser === true) {
        response.redirect('/user/index');
    }
    else {
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
                logger.error(`Unable to query document(s) on the collection "${collectionName}". Error: ${queryCollectionErr}`);
                if (request.query.error && request.query.login) {
                    response.render(path.join(path.resolve("."), '/public/templates/user/login.html'), { error: 'Login credential is wrong. Please try again!' });
                }
                else {
                    response.render(path.join(path.resolve("."), '/public/templates/user/login.html'));
                }

            } else if (result.length) {
                if (request.query.error && request.query.login) {
                    response.render(path.join(path.resolve("."), '/public/templates/user/login.html'), { icon: result[0].iconURI, title: result[0].mp_title, description: result[0].mp_description, error: 'Login failed. Something wrong! Please report to admin.' });
                }
                else {
                    response.render(path.join(path.resolve("."), '/public/templates/user/login.html'), { icon: result[0].iconURI, title: result[0].mp_title, description: result[0].mp_description });
                }
            }
            else {
                if (request.query.error && request.query.login) {
                    response.render(path.join(path.resolve("."), '/public/templates/user/login.html'), { error: 'Login credential is wrong. Please try again!' });
                }
                else {
                    response.render(path.join(path.resolve("."), '/public/templates/user/login.html'));
                }
            }
        });
    }
}

const loginSubmit = function (request, response) {
    const dbName = "Website";
    const collectionName = "User Accounts";

    var client = mongoDB.getDb();
    const db = client.db(dbName);

    db.collection(collectionName).find({ username: request.body.username, password: md5(request.body.password) }).toArray(function (queryCollectionErr, result) {
        if (queryCollectionErr) {
            logger.log({
                level: 'error',
                message: `Error in query collection ${dbName}.${collectionName}. Error: ${queryCollectionErr}`
            })
            logger.error(`Unable to query document(s) on the collection "${collectionName}". Error: ${queryCollectionErr}`);
            response.redirect('/user/login?error=true&login=true');
            request.session.LoginUser = false;
            request.session.save();
        } else if (result.length) {
            request.session.LoginUser = true;
            request.session.UserID = result[0]._id.toString();
            request.session.save();
            response.redirect('/user/index');
        }
        else {
            request.session.LoginUser = false;
            request.session.save();
            response.redirect('/user/login?error=true&login=true');
        }
    });
}

module.exports = {
    login,
    loginSubmit
}