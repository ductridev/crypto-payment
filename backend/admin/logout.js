const mongoDB = require('../db');
const logger = require('../utils/logger');
const path = require('path');
const md5 = require('md5');
const nodemailer = require('nodemailer');
const ObjectId = require('mongodb').ObjectId; 
const dotenv = require('dotenv');

const adminLogout = function (request, response) {
    request.session.destroy();
    response.redirect('/admin/login');
}

module.exports = {
    adminLogout
}