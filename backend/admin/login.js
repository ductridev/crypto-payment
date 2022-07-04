const mongoDB = require('../db');
const logger = require('../utils/logger');
const path = require('path');
const md5 = require('md5');
const nodemailer = require('nodemailer');
const ObjectId = require('mongodb').ObjectId; 
const dotenv = require('dotenv');

const adminLogin = function (request, response) {
    if (request.session.LoginAdmin === true) {
        response.redirect('/admin/index');
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
                console.log(`Unable to query document(s) on the collection "${collectionName}". Error: ${queryCollectionErr}`);
                if (request.query.error && request.query.login) {
                    response.render(path.join(path.resolve("."), '/public/templates/admin/login.html'), { error: 'Login credential is wrong. Please try again!' });
                }
                else {
                    response.render(path.join(path.resolve("."), '/public/templates/admin/login.html'));
                }

            } else if (result.length) {
                if (request.query.error && request.query.login) {
                    response.render(path.join(path.resolve("."), '/public/templates/admin/login.html'), { icon: result[0].iconURI, title: result[0].mp_title, description: result[0].mp_description, error: 'Login credential is wrong. Please try again!' });
                }
                else {
                    response.render(path.join(path.resolve("."), '/public/templates/admin/login.html'), { icon: result[0].iconURI, title: result[0].mp_title, description: result[0].mp_description });
                }
            }
            else {
                if (request.query.error && request.query.login) {
                    response.render(path.join(path.resolve("."), '/public/templates/admin/login.html'), { error: 'Login credential is wrong. Please try again!' });
                }
                else {
                    response.render(path.join(path.resolve("."), '/public/templates/admin/login.html'));
                }
            }
        });
    }
}

const adminLoginSubmit = function (request, response) {
    const dbName = "Website";
    const collectionName = "Admin Account";

    var client = mongoDB.getDb();
    const db = client.db(dbName);

    db.collection(collectionName).find({ username: request.body.username, password: md5(request.body.password) }).toArray(function (queryCollectionErr, result) {
        if (queryCollectionErr) {
            logger.log({
                level: 'error',
                message: `Error in query collection ${dbName}.${collectionName}. Error: ${queryCollectionErr}`
            })
            console.log(`Unable to query document(s) on the collection "${collectionName}". Error: ${queryCollectionErr}`);
            response.redirect('/admin/login?error=true&login=true');
            request.session.LoginAdmin = false;
            request.session.save()
        } else if (result.length) {
            request.session.LoginAdmin = true;
            request.session.save()
            response.redirect('/admin/index');
        }
        else {
            request.session.LoginAdmin = false;
            request.session.save();
            response.redirect('/admin/login?error=true&login=true');
        }
    });
}

module.exports = {
    adminLogin,
    adminLoginSubmit
}