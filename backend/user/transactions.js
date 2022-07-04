const mongoDB = require('../db');
const logger = require('../utils/logger');
const path = require('path');
const md5 = require('md5');
const nodemailer = require('nodemailer');
const ObjectId = require('mongodb').ObjectId; 
const dotenv = require('dotenv');

const transactions = function (request, response) {
    response.render(path.join(path.resolve('.'), '/public/templates/user/manage-transactions.html'));
}

module.exports = {
    transactions
}