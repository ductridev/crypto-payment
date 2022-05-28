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
var Client = require('coinbase').Client;
const { default: axios } = require('axios');
const { MongoClient } = require('mongodb');

dotenv.config();

if (cluster.isMaster) {
    console.log(`Number of CPUs is ${totalCPUs}`);
    console.log(`Master ${process.pid} is running`);

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

    const app = express();

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

    function haltOnTimedout(req, res, next) {
        if (!req.timedout) next()
    }

    app.get('/', function (request, response) {
        response.send('Silence is golden');
    })
    app.get('/transfer/', function (request, response) {
        response.send('Silence is golden');
    })

    app.get('/signedTransactions/save/:rawTransaction', function (request, response) {
        const username = process.env.USERNAME;
        const password = process.env.PASSWORD;
        const cluster = process.env.CLUSTER;
        const dbName = "transactions";
        const collectionName = "Signed Transactions";

        const mongoClient = new MongoClient(`mongodb+srv://${username}:${password}@${cluster}.mongodb.net/?retryWrites=true&w=majority`,
            {
                useNewUrlParser: true,
                useUnifiedTopology: true
            }
        );
        mongoClient.connect(function (mongoClientErr, client) {
            if (mongoClientErr) {
                console.log('Unable to connect to the MongoDB server. Error:', mongoClientErr);
            }
            else {
                const db = client.db(dbName);
                var collection = db.collection(collectionName);

                let input = { rawTransaction: request.params.rawTransaction };

                collection.insertOne(input, (insertCollectionErr, result) => {
                    if (insertCollectionErr) {
                        console.log(`Unable to insert document to the collection "${collectionName}". Error: ${insertCollectionErr}`);
                    } else {
                        console.log(`Inserted ${result.length} documents into the "${collectionName}" collection. The documents inserted with "_id" are: ${result.insertedId}`);
                    }
                });

                client.close();
            }
        });
    })

    app.get('/coinbase/auth/', function (request, response) {
        response.redirect('https://www.coinbase.com/oauth/authorize?response_type=code&client_id=2abb855bdd5b3a649f1f54a811b53f80832d2b6f4516758014c35de4ed576090&redirect_uri=http://127.0.0.1:5000/auth/coinbase/callback&scope=wallet:accounts:read,wallet:transactions:request,wallet:transactions:read');
    })
    app.get('/auth/coinbase/callback', function (request, response) {
        response.redirect(`/coinbase/transaction/request/${request.query.code}`);
    })
    app.get('/coinbase/transaction/request/:code', function (request, response) {
        let data = `grant_type=authorization_code&code=${request.params.code}&client_id=2abb855bdd5b3a649f1f54a811b53f80832d2b6f4516758014c35de4ed576090&client_secret=2ce487b3d23ad69799fc8684f9d97d849a65cff085922a135675b3c1d1b72415&redirect_uri=http://127.0.0.1:5000/auth/coinbase/callback`
        axios.post('https://api.coinbase.com/oauth/token', data).then(async (res) => {
            let result = await axios.get('https://api.coinbase.com/v2/user', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `${res.data.token_type} ${res.data.access_token}`,
                    'CB-VERSION': '2021-11-06',
                }
            })
            console.log(result);
            let result1 = await axios.post(`https://api.coinbase.com/v2/accounts/${result.data.data.id}/transactions/`, {
                type: "request",
                to: "trihdde170376@fpt.edu.vn",
                amount: "0.001",
                currency: "BTC",
                description: `${result.data.data.name} requested you to send 0.001 BTC`
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `${res.data.token_type} ${res.data.access_token}`,
                    'CB-VERSION': '2021-11-06',
                }
            })
            console.log('result1' + result1);
        }).catch((err) => {
            console.log(err);
        })
        response.send('Silence is golden');
    })

    app.get('/test', function (request, response) {
        var client = new Client({
            'apiKey': process.env.COINBASE_APIKEY,
            'apiSecret': process.env.COINBASE_APISECRET,
            'version': '2021-11-06',
            'strictSSL': false
        });

        var address = null;

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
    const server_1 = http.createServer(app).listen(process.env.PORT_BACKEND1 || 5000, function () {
        let host = server_1.address().address
        let port = server_1.address().port
        // Starting the Server at the port 5000
    })
    const server_2 = http.createServer(app).listen(process.env.PORT_BACKEND2 || 5001, function () {
        let host = server_2.address().address
        let port = server_2.address().port
        // Starting the Server at the port 5001
    })
    const server_3 = http.createServer(app).listen(process.env.PORT_BACKEND3 || 5002, function () {
        let host = server_3.address().address
        let port = server_3.address().port
        // Starting the Server at the port 5002
    })
    const server_4 = http.createServer(app).listen(process.env.PORT_BACKEND4 || 5003, function () {
        let host = server_4.address().address
        let port = server_4.address().port
        // Starting the Server at the port 5003
    })
}