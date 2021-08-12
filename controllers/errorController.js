const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
    return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
};

const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((val) => val.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
    const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
    const message = `Duplicate field value ${value}. Please use another value`;
    return new AppError(message, 400);
};

const handleInvalidJWT = () => new AppError('Invalid token', 401);

const handleExpiredJWT = () => new AppError('Token expired', 401);

const sendErrorDev = (err, req, res) => {
    //API ERROR
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            stack: err.stack,
            error: err,
        });
    }
    //WEBSITE ERROR
    res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: err.message,
    });
};

const sendErrorProd = (err, req, res) => {
    //Operational, trusted error: send message to client
    if (req.originalUrl.startsWith('/api/')) {
        if (err.isOperational) {
            return res.status(err.status).json({
                status: 'error',
                message: err.message,
            });
            //Programming or unkown error, dont leak details
        }
        console.error('[ERROR]: ', err);

        //2) Send generic message
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
        });
    }

    if (err.isOperational) {
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong!',
            msg: err.message,
        });
        //Programming or unkown error, dont leak details
    }
    //1) Log error
    console.error('[ERROR]: ', err);

    //2) Send generic message
    res.status(500).render({
        status: 'error',
        message: 'Please try again later',
    });
};

module.exports = (err, req, res, next) => {
    //console.log(err.stack);
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error = Object.assign(err);

        if (error.name === 'CastError') error = handleCastErrorDB(error);
        else if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        else if (error.name === 'ValidationError')
            error = handleValidationErrorDB(error);
        else if (error.name === 'JsonWebTokenError') error = handleInvalidJWT();
        else if (error.name === 'TokenExpiredError') error = handleExpiredJWT();
        //console.log(error.isOperational);
        sendErrorProd(error, req, res);
    }
};
