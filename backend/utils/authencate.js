const logger = require('../utils/logger');
const adminAuthenticate = function(request, response, next) {
    if (request.session.LoginAdmin === true) {
        next();
    }
    else {
        response.redirect('/admin/login');
    }
}
const userAuthenticate = function(request, response, next) {
    logger.error(request.session);
    if (request.session.LoginUser === true) {
        next();
    }
    else {
        response.redirect('/user/login');
    }
}

module.exports = {
    adminAuthenticate,
    userAuthenticate
}