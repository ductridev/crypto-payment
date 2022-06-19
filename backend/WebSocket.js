const WS = require("ws");
const { fromString: uuidv4FromString } = require('uuidv4');
const DAG = require('./DAG/index'); // DAG is a module that runs the DAG algorithm
const logger = require('./utils/logger');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const wss = new WS.Server({ port: process.env.WS_PORT || "17214" });
const clients = new Map();

const rateLimiter = new RateLimiterMemory(
    {
        points: 15,
        duration: 5, // per 5 second
    });

// Listens for connections
wss.on('connection', (ws, req) => {
    const id = uuidv4FromString(req.socket.remoteAddress);
    const metadata = { id, ip: req.socket.remoteAddress };

    clients.set(ws, metadata);

    console.log(`Client connected: ${id}`);

    // Open a connection
    ws.on("open", () => {
        console.log('connected');
        const metadata = clients.get(ws);
        logger.log({
            level: 'info',
            message: `Client connected: ${metadata.id} at IP : ${metadata.ip}`,
        })
        ws.send(Date.now());
    })
    // Close a connection
    ws.on("close", () => {
        const metadata = clients.get(ws);
        clients.delete(ws);
        logger.log({
            level: 'info',
            message: `Client disconnected: ${metadata.id} at IP : ${metadata.ip}`,
        })
    })
    // Listen for messages
    ws.on("message", (requestMsg) => {
        const message = JSON.parse(requestMsg);
        const metadata = clients.get(ws);

        rateLimiter.consume(metadata.ip, 1)
            .then((rateLimiterRes) => {
                if (message.type === "ping") {

                    message.sender = metadata.id;
                    message.ping = ws.ping();

                    const outbound = JSON.stringify(message);

                    [...clients.keys()].forEach((client) => {
                        client.send(outbound);
                    });
                }
                else if (message.type === "newSignedTransactions") {
                    let result = DAG.newBlock(message.transactionId, message.transactionHash, message.rawTransaction, message.transactionType, message.amount, message.from, message.to, message.gasUsed, message.contractAddress);
                    if (result.status === 'success') {
                        logger.log({
                            level: 'info',
                            message: `New block created: ${result.blockNumber}`,
                        });
                        [...clients.keys()].forEach((client) => {
                            client.send(JSON.stringify(result));
                        });
                    }
                    else {
                        logger.log({
                            level: 'error',
                            message: `Error creating block: ${result.blockNumber}`,
                        });
                        [...clients.keys()].forEach((client) => {
                            client.send(JSON.stringify(result));
                        });
                    }
                }
            })
            .catch((rateLimiterRes) => {
                console.log(rateLimiterRes);
                logger.log({
                    level: 'error',
                    message: `Rate limiter error: ${rateLimiterRes}`,
                });
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Rate limit exceeded',
                }));
            });
    });
    // Error handling
    ws.on('error', (error) => {
        logger.log({
            level: 'error',
            message: `Client error: ${error}`,
        });
        // This event handler will be triggered when an error occurs
    })
})