const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');

const User = require('../models/userModel');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

const sendToken = (
    user,
    statusCode,
    res,
    sendToken = true,
    sendUser = true
) => {
    const json = {
        status: 'success',
        data: {},
    };
    if (sendToken) {
        token = signToken(user._id);
        json.token = token;
        const cookieOptions = {
            expires: new Date(
                Date.now() +
                    process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
            ),
            secure: true,
            httpOnly: true,
        };
        if (process.env.NODE_ENV == 'production') cookieOptions.secure = true;
        res.cookie('jwt', token);
    }
    if (sendUser) json.data.user = user;

    res.status(statusCode).json(json);
};

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        passwordChangeAt: req.body.passwordChangeAt,
        role: req.body.role,
    });
    const token = signToken(newUser._id);
    const confirmURL = `${req.protocol}://${req.get(
        'host'
    )}/confirmEmail/${token}`;

    await new Email(newUser, confirmURL).sendWelcome();
    //SEND EMAIL CONFIRMATION
    // await sendEmail({
    //     email: newUser.email,
    //     subject: 'Email Confirmation at Natours',
    //     message,
    // });

    sendToken(newUser, 201, res, false);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // 1) Check if email and password actually exist
    if (!email || !password) {
        return next(new AppError('Please provide email and password'), 400);
    }
    // 2) Check if user exists and password is correct
    const user = await User.findOne({ email }).select(
        '+password +confirmedEmail'
    );

    if (!user || !(await user.correctPassword(password))) {
        return next(new AppError('Invalid credentials', 401));
    }
    if (!user.confirmedEmail) {
        return next(new AppError('Acount not activated', 401));
    }

    // 3) Send token
    sendToken(user, 200, res, true, false);
});

exports.logout = (req, res) => {
    //Replaces cookie with dummy jwt
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });
    res.status(200).json({
        status: 'success',
    });
};

exports.protect = catchAsync(async (req, res, next) => {
    // 1) Get token and make sure it exists
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return next(new AppError('Authentication required', 401));
    }

    // 2) Validate token and get user
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3)Make sure user exists
    const freshUser = await User.findById(decoded.id).select('+confirmedEmail');
    if (!freshUser)
        return next(
            new AppError('The user belonging to this token no longer exists')
        );

    // 4)Check if user account has been activated through email
    if (!freshUser.confirmedEmail) {
        return next(new AppError('Acount not activated', 401));
    }

    // 5) Check if user changed password after JWT was issued
    if (freshUser.changedPasswordAfter(decoded.iat)) {
        return next(new AppError('User password was recently changed', 401));
    }

    //Grant access to protected route
    req.user = freshUser; //removes reduntant code and makes sure routes never have to deal with jwt
    res.locals.user = freshUser;
    next();
});

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role))
            return next(new AppError('Permission denied', 403));
        next();
    };
};

exports.mustOwn = (Model) =>
    catchAsync(async (req, res, next) => {
        req.document = await Model.findById(req.params.id);
        if (!req.document.user || req.document.user !== req.user.id)
            return next(new AppError('Permission denied', 403));
        next();
    });

exports.confirmEmail = catchAsync(async (req, res, next) => {
    // 1) Get JWT and User based on JWT
    let token = req.params.token;

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('+confirmedEmail');

    // 2) Make sure JWT and the link has not been clicked before
    if (!user || user.confirmedEmail) {
        return next(new AppError('Activation link not valid', 401));
    }

    // 3) Update user and return the updated user
    user.confirmedEmail = true;
    await user.save({ validateBeforeSave: false });

    sendToken(user, 200, res, true, false);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('User not found', 404));
    }
    // 2) Generate random reset token
    const resetToken = user.getPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // 3) Send token to email
    const resetURL = `${req.protocol}://${req.get(
        'host'
    )}/api/v1/users/reset-password/${resetToken}`;

    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to ${resetURL}`;

    await new Email(user, resetURL).sendPasswordReset;

    res.status(200).json({
        status: 'success',
        message: 'Token sent',
    });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on resetToken
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gte: Date.now() },
    });

    // 2) If the token is valid and the user still exists, reset password
    if (!user) {
        return next(new AppError('Invalid or expired token'));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    // 3) update passwordChangeAt property(for future logins)

    // 4) Log the user in
    sendToken(user, 201, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    // 1) Get user from collection
    const user = await User.findById(req.user._id).select('+password');

    // 2) Check if password is correct
    if (
        !req.body.passwordCurrent ||
        !(await user.correctPassword(req.body.passwordCurrent))
    ) {
        return next(new AppError('Invalid credentials', 401));
    }

    // 3) If so, update the password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    //4) Send JWT to user
    sendToken(user, 201, res);
});

//No errors! only for server side rendered pages
exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            token = req.cookies.jwt;
            // 1) Validate token and get user
            const decoded = await promisify(jwt.verify)(
                token,
                process.env.JWT_SECRET
            );

            // 2)Make sure user exists
            const freshUser = await User.findById(decoded.id).select(
                '+confirmedEmail'
            );
            if (!freshUser) return next();

            // 3)Check if user account has been activated through email
            if (!freshUser.confirmedEmail) {
                return next();
            }

            // 4) Check if user changed password after JWT was issued
            if (freshUser.changedPasswordAfter(decoded.iat)) {
                return next();
            }

            // USER IS LOGGED IN
            res.locals.user = freshUser;
            return next();
        } catch (err) {
            return next();
        }
    }
    next();
};
