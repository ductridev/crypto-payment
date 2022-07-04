const mongoDB = require('../db');
const logger = require('../utils/logger');
const path = require('path');
const md5 = require('md5');
const nodemailer = require('nodemailer');
const ObjectId = require('mongodb').ObjectId; 
const dotenv = require('dotenv');

const register = function (request, response) {
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
                console.log(`Unable to query document(s) on the collection "${collectionName}". Error: ${queryCollectionErr}`);
                if (request.query.error && request.query.accountExist) {
                    response.render(path.join(path.resolve("."), '/public/templates/user/register.html'), { error: true, accountExist: 'This email is already registered for another account. Please check again your register email!' });
                }
                else if (request.query.error) {
                    response.render(path.join(path.resolve("."), '/public/templates/user/register.html'), { error: true, unknowError: "Can't register new account at current. Please try again later or ask our support!" });
                }
                else {
                    response.render(path.join(path.resolve("."), '/public/templates/user/register.html'));
                }

            } else if (result.length) {
                if (request.query.error && request.query.accountExist) {
                    response.render(path.join(path.resolve("."), '/public/templates/user/register.html'), { icon: result[0].iconURI, title: result[0].mp_title, description: result[0].mp_description, error: true, accountExist: 'This email is already registered for another account. Please check again your register email!' });
                }
                else if (request.query.error) {
                    response.render(path.join(path.resolve("."), '/public/templates/user/register.html'), { error: true, unknowError: "Can't register new account at current. Please try again later or ask our support!" });
                }
                else {
                    response.render(path.join(path.resolve("."), '/public/templates/user/register.html'), { icon: result[0].iconURI, title: result[0].mp_title, description: result[0].mp_description });
                }
            }
            else {
                if (request.query.error && request.query.accountExist) {
                    response.render(path.join(path.resolve("."), '/public/templates/user/register.html'), { error: true, accountExist: 'This email is already registered for another account. Please check again your register email!' });
                }
                else if (request.query.error) {
                    response.render(path.join(path.resolve("."), '/public/templates/user/register.html'), { error: true, unknowError: "Can't register new account at current. Please try again later or ask our support!" });
                }
                else {
                    response.render(path.join(path.resolve("."), '/public/templates/user/register.html'));
                }
            }
        });
    }
}
const registerSubmit = function (request, response) {
    const dbName = "Website";
    const collectionName = "User Accounts";

    var client = mongoDB.getDb();
    const db = client.db(dbName);

    db.collection(collectionName).find({ email: request.body.email }).toArray(function (queryCollectionErr, result) {
        if (queryCollectionErr) {
            logger.log({
                level: 'error',
                message: `Error in query collection ${dbName}.${collectionName}. Error: ${queryCollectionErr}`
            })
            console.log(`Unable to query document(s) on the collection "${collectionName}". Error: ${queryCollectionErr}`);
            response.redirect('/register?error=true&unknowError=true');
        } else if (result.length > 0) {
            response.redirect('/register?error=true&accountExist=true');
        }
        else {
            db.collection(collectionName).insertOne({ username: request.body.username, email: request.body.email, password: md5(request.body.password) }, function (_queryCollectionErr, _result) {
                if (_queryCollectionErr) {
                    logger.log({
                        level: 'error',
                        message: `Error in query collection ${dbName}.${collectionName}. Error: ${queryCollectionErr}`
                    })
                    console.log(`Unable to query document(s) on the collection "${collectionName}". Error: ${queryCollectionErr}`);
                    response.redirect('/register?error=true&unknowError=true');
                }
                else {
                    logger.log({
                        level: 'info',
                        message: `Success create new user in collection ${dbName}.${collectionName}. InsertedID : ${_result.insertedId}`
                    })
                    var transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: process.env.EMAIL_ADDRESS,
                            pass: process.env.EMAIL_PASSWORD
                        }
                    });
                    var mailOptions = {
                        from: process.env.EMAIL_ADDRESS,
                        to: request.body.email,
                        subject: 'Email verify for crypto payment',
                        html: `<p>Please click the following link to verify your email!</p><br/><a href="${process.env.PAGE_URL}/register/emailVerify/${_result.insertedId}">Verify Link</a>`
                    };
                    transporter.sendMail(mailOptions, function (error, info) {
                        if (error) {
                            logger.log({
                                level: 'error',
                                message: `Send email failed. Error: ${error}`
                            })
                            response.redirect('/register?error=true&unknowError=true');
                        } else {
                            logger.log({
                                level: 'info',
                                message: `Email sent to user with ID : ${_result.insertedId}`
                            })
                            response.redirect(`/register/success?userid=${_result.insertedId}`);
                        }
                    });
                }
            })
        }
    });
}
const verifyEmail = function(request, response){
    const dbName = "Website";
    const collectionName = "User Accounts";

    var client = mongoDB.getDb();
    const db = client.db(dbName);

    db.collection(collectionName).find({_id: new ObjectId(request.params.userID)}).toArray(function(queryCollectionErr, result){
        if(queryCollectionErr)
        {
            logger.log({
                level: 'error',
                message: `Verify email failed. Error: ${queryCollectionErr}`
            })
            response.redirect('/register?error=true&unknowError=true');
        }
        else if (result.length){
            db.collection(collectionName).updateOne({_id: new ObjectId(request.params.userID)}, {$set: {emailVerify: true}}, function(_queryCollectionErr, _query){
                if(_queryCollectionErr){
                    logger.log({
                        level: 'error',
                        message: `Failed update emailVerify for user with ID : ${request.params.userID}. Error: ${_queryCollectionErr}`
                    })
                }
                else{
                    logger.log({
                        level: 'info',
                        message: `Email verified for user with ID : ${request.params.userID}`
                    });
                    response.redirect(`/register/success?userid=${request.params.userID}&emailVerify=true`);
                }
            });
        }
        else{
            logger.log({
                level: 'error',
                message: `Verify email failed.`
            })
            response.redirect('/register?error=true&unknowError=true');
        }
    })
}
const registerSuccess = function (request, response) {
    response.render(path.join(path.resolve('.'), '/public/templates/user/register.html'), { success: true, userID: request.query.userid, emailVerify: request.query.emailVerify });
}
module.exports = {
    register,
    registerSubmit,
    registerSuccess,
    verifyEmail
}