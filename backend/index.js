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

    function haltOnTimedout (req, res, next) {
        if (!req.timedout) next()
    }

    app.get('/', function (request, response) {
        response.send('Silence is golden');
    })
    app.get('/transfer/', function (request, response) {
        response.send('Silence is golden');
    })

    // Require the Routes API  
    // Create a Server and run it on the port 5000, 5001, 5002, 5003
    const server_1 = http.createServer(app).listen(process.env.PORT_BACKEND1, function () {
        let host = server_1.address().address
        let port = server_1.address().port
        // Starting the Server at the port 5000
    })
    const server_2 = http.createServer(app).listen(process.env.PORT_BACKEND2, function () {
        let host = server_2.address().address
        let port = server_2.address().port
        // Starting the Server at the port 5001
    })
    const server_3 = http.createServer(app).listen(process.env.PORT_BACKEND3, function () {
        let host = server_3.address().address
        let port = server_3.address().port
        // Starting the Server at the port 5002
    })
    const server_4 = http.createServer(app).listen(process.env.PORT_BACKEND4, function () {
        let host = server_4.address().address
        let port = server_4.address().port
        // Starting the Server at the port 5003
    })
}