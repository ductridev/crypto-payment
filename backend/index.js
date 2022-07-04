const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const compression = require('compression');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cluster = require("cluster");
const totalCPUs = require("os").cpus().length;
const cookieParser = require('cookie-parser');
const responseTime = require('response-time');
const timeout = require('connect-timeout');
const Client = require('coinbase').Client;
const session = require('express-session')
const mongoDB = require('./db');
const logger = require('./utils/logger');
const path = require('path');
const mustacheExpress = require('mustache-express');
const md5 = require('md5');
const nodemailer = require('nodemailer');
const ObjectId = require('mongodb').ObjectId; 
const RedisStore = require("connect-redis")(session);

const { createClient } = require("redis");
let redisClient = createClient({ legacyMode: true });
redisClient.connect().catch(console.error);

dotenv.config();

mongoDB.dbConn(function (err, client) {
    if (err) console.log(err);
    else {
        console.log('connected');
    }
});

if (cluster.isMaster) {
    console.log(`Number of CPUs is ${totalCPUs}`);
    console.log(`Master ${process.pid} is running`);

    if (mongoDB.getDb() !== null) {
        // require('./cron');
        // require('./WebSocket');
    }

    // Fork workers.
    for (let i = 0; i < totalCPUs; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
        console.log("Let's fork another worker!");
        cluster.fork();
    });
}
else {

    // Require the Routes API
    // Create a Server and run it on the port 5000, 5001, 5002, 5003

    const app = express();

    app.engine('html', mustacheExpress());
    app.set("view engine", "html");
    app.set("views", path.join(path.resolve("."), '/public/templates/'));

    var corsOptions = {
        origin: ['http://localhost:3000'],
        optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
    }

    /* handle middlewares*/
    app.use(timeout('5s'));
    app.use(helmet());
    app.use(haltOnTimedout);
    app.use(compression());
    app.use(haltOnTimedout);
    app.use(bodyParser.json());
    app.use(haltOnTimedout);
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(haltOnTimedout);
    app.use(cors(corsOptions));
    app.use(haltOnTimedout);
    app.use(cookieParser());
    app.use(haltOnTimedout);
    app.use(responseTime());
    app.use(haltOnTimedout);
    app.use(session({
        store: new RedisStore({ client: redisClient }),
        secret: 'dag crypto brigde',
        resave: true,
        saveUninitialized: true,
        cookie: { 
            maxAge: 1*60*60*1000
        }
    }))
    app.use(haltOnTimedout);
    app.use(express.static(path.join(path.resolve("."), '/'), {
        extensions: ['html', 'htm'],
    }));
    app.use(function (req, res, next) {
        res.setHeader("Content-Security-Policy", "script-src * 'unsafe-inline'; style-src *; default-src *; media-src *;");
        return next();
    });

    function haltOnTimedout(request, response, next) {
        if (!request.timedout) next()
    }
    function adminAuthenticate(request, response, next) {
        if (request.session.LoginAdmin === true) {
            next();
        }
        else {
            response.redirect('/admin/login');
        }
    }
    function userAuthenticate(request, response, next) {
        console.log(request.session);
        if (request.session.LoginUser === true) {
            next();
        }
        else {
            response.redirect('/user/login');
        }
    }

    app.get('/', function (request, response) {
        response.send('Silence is golden');
    })
    app.get('/transfer/', function (request, response) {
        response.send('Silence is golden');
    })
    app.get('/admin/login/', function (request, response) {
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
    })
    app.post('/admin/login/submit', function (request, response) {
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
    })
    app.get('/admin/logout', adminAuthenticate, function (request, response) {
        request.session.destroy();
        response.redirect('/admin/login');
    })
    app.get('/admin/index', adminAuthenticate, function (request, response) {
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

        response.render(path.join(path.resolve("."), '/public/templates/admin/index.html'), { icon: iconURI, title: title, description: description });
    })
    app.get('/admin/setting', adminAuthenticate, function (request, response) {
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
                response.render(path.join(path.resolve("."), '/public/templates/admin/setting.html'));

            } else if (result.length) {
                response.render(path.join(path.resolve("."), '/public/templates/admin/setting.html'), { icon: result[0].iconURI, title: result[0].mp_title, description: result[0].mp_description });

            }
            else {
                response.render(path.join(path.resolve("."), '/public/templates/admin/setting.html'));
            }
        });
    })
    app.get('/admin/manage-users', adminAuthenticate, function (request, response) {
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
                response.render(path.join(path.resolve("."), '/public/templates/admin/manage-users.html'));

            } else if (result.length) {
                response.render(path.join(path.resolve("."), '/public/templates/admin/manage-users.html'), { icon: result[0].iconURI, title: result[0].mp_title, description: result[0].mp_description });

            }
            else {
                response.render(path.join(path.resolve("."), '/public/templates/admin/manage-users.html'));
            }
        });
    })
    app.get('/admin/manage-transactions', adminAuthenticate, function (request, response) {
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
                response.render(path.join(path.resolve("."), '/public/templates/admin/manage-transactions.html'));

            } else if (result.length) {
                response.render(path.join(path.resolve("."), '/public/templates/admin/manage-transactions.html'), { icon: result[0].iconURI, title: result[0].mp_title, description: result[0].mp_description });

            }
            else {
                response.render(path.join(path.resolve("."), '/public/templates/admin/manage-transactions.html'));
            }
        });
    })
    app.get('/register', function (request, response) {
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
    });
    app.post('/register/submit', function (request, response) {
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
    })
    app.get('/register/emailVerify/:userID', function(request, response){
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
    })
    app.get('/register/success', function (request, response) {
        response.render(path.join(path.resolve('.'), '/public/templates/user/register.html'), { success: true, userID: request.query.userid, emailVerify: request.query.emailVerify });
    })
    app.get('/login', function (request, response) {
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
    });
    app.get('/user/login', function (request, response) {
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
    });
    app.post('/user/login/submit', function (request, response) {
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
                console.log(`Unable to query document(s) on the collection "${collectionName}". Error: ${queryCollectionErr}`);
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
    })
    app.get('/user/index', userAuthenticate, async function (request, response) {
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
    });
    app.get('/user/logout', userAuthenticate, function (request, response) {
        request.session.destroy();
        response.redirect('/user/login');
    });
    app.get('/user/setting', userAuthenticate, function (request, response) {
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
    });
    app.get('/user/transactions', userAuthenticate, function (request, response) {
        response.render(path.join(path.resolve('.'), '/public/templates/user/manage-transactions.html'));
    });
    app.get('/user/wallet', userAuthenticate, function (request, response) {
        response.render(path.join(path.resolve('.'), '/public/templates/user/manage-wallet.html'));
    });

    app.get('/signedTransactions/getHash/:transaction_id', function (request, response) {
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
    })
    app.get('/signedTransactions/save/:rawTransaction/:type/:amount', function (request, response) {
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
    })

    // Temporary disabled
    // app.get('/coinbase/auth/', function (request, response) {
    //     response.redirect('https://www.coinbase.com/oauth/authorize?response_type=code&client_id=2abb855bdd5b3a649f1f54a811b53f80832d2b6f4516758014c35de4ed576090&redirect_uri=http://127.0.0.1:5000/auth/coinbase/callback&scope=wallet:accounts:read,wallet:transactions:request,wallet:transactions:read');
    // })
    // app.get('/auth/coinbase/callback', function (request, response) {
    //     response.redirect(`/coinbase/transaction/request/${request.query.code}`);
    // })
    // app.get('/coinbase/transaction/request/:code', function (request, response) {
    //     let data = `grant_type=authorization_code&code=${request.params.code}&client_id=2abb855bdd5b3a649f1f54a811b53f80832d2b6f4516758014c35de4ed576090&client_secret=2ce487b3d23ad69799fc8684f9d97d849a65cff085922a135675b3c1d1b72415&redirect_uri=http://127.0.0.1:5000/auth/coinbase/callback`
    //     axios.post('https://api.coinbase.com/oauth/token', data).then(async (res) => {
    //         let result = await axios.get('https://api.coinbase.com/v2/user', {
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'Authorization': `${res.data.token_type} ${res.data.access_token}`,
    //                 'CB-VERSION': '2021-11-06',
    //             }
    //         })
    //         console.log(result);
    //         let result1 = await axios.post(`https://api.coinbase.com/v2/accounts/${result.data.data.id}/transactions/`, {
    //             type: "request",
    //             to: "trihdde170376@fpt.edu.vn",
    //             amount: "0.001",
    //             currency: "BTC",
    //             description: `${result.data.data.name} requested you to send 0.001 BTC`
    //         }, {
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'Authorization': `${res.data.token_type} ${res.data.access_token}`,
    //                 'CB-VERSION': '2021-11-06',
    //             }
    //         })
    //         console.log('result1' + result1);
    //     }).catch((err) => {
    //         console.log(err);
    //     })
    //     response.send('Silence is golden');
    // })

    app.get('/test', function (request, response) {
        var client = new Client({
            'apiKey': process.env.COINBASE_APIKEY,
            'apiSecret': process.env.COINBASE_APISECRET,
            'version': '2021-11-06',
            'strictSSL': false
        });

        client.getAccount('primary', function (err, account) {
            if (err) {
                console.log(err);
            }
            else {
                console.log(account);
                account.requestMoney({
                    'type': 'request',
                    'to': 'bitdiddle@example.com',
                    'amount': '0.1',
                    'currency': 'BTC'
                }, function (_err, tx) {
                    console.log(_err);
                    console.log(tx);
                });
            }
        });
    })
    app.get('*', function (req, res) {
        res.status(404).send('Silence is golden');
    });

    // Require the Routes API  
    // Create a Server and run it on the port 5000, 5001, 5002, 5003
    http.createServer(app).listen(process.env.PORT_BACKEND1 || 5000, function () {
        // Starting the Server at the port 5000
    })
    http.createServer(app).listen(process.env.PORT_BACKEND2 || 5001, function () {
        // Starting the Server at the port 5001
    })
    http.createServer(app).listen(process.env.PORT_BACKEND3 || 5002, function () {
        // Starting the Server at the port 5002
    })
    http.createServer(app).listen(process.env.PORT_BACKEND4 || 5003, function () {
        // Starting the Server at the port 5003
    })
}