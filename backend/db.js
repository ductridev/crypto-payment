const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

let _client;

module.exports = {
    dbConn: async function (callback) {
        const password = process.env.PASSWORD;
        const cluster = process.env.CLUSTER;

        const mongoClient = new MongoClient(`mongodb+srv://admin:${password}@${cluster}.mongodb.net/?retryWrites=true&w=majority`,
            {
                useNewUrlParser: true,
                useUnifiedTopology: true
            }
        );
        mongoClient.connect(function(err, client){
            _client = client;
            return callback( err, client );
        });
    },
    getDb: function () {
        return _client;
    }
}