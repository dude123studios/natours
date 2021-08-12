const multer = require('multer');
const sharp = require('sharp');

const fs = require('fs');

const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'public/img/users');
//     },
//     filename: (req, file, cb) => {
//         //user-id-timestamp.extention
//         //user-231430948290safk219-31290.jpg
//         const ext = file.mimetype.split('/')[1];
//         cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//     },
// });

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new AppError('Image invalid', 400), false);
    }
};

const multerStorage = multer.memoryStorage();

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadPhoto = upload.single('photo');

exports.resizeUserPhoto = async (req, res, next) => {
    if (!req.file) return next();
    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

    await sharp(req.file.buffer)
        .resize(500, 500)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/users/${req.file.filename}`);

    next();
};

exports.deleteOldPhoto = (req, res, next) => {
    if (!req.file) return next();
    fs.unlink(`public/img/users/${req.user.photo}`, (err) => {
        if (err) {
            return next(err);
        }
    });
    next();
};

const filterObj = (obj, ...fields) => {
    const newObj = {};
    Object.keys(obj).forEach((el) => {
        if (fields.includes(el)) {
            newObj[el] = obj[el];
        }
    });
    return newObj;
};

exports.getMe = (req, res, next) => {
    req.params.id = req.user.id;
    next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
    //console.log(req.file);
    // 1) Throw error if user tries to edit password data
    if (req.body.password || req.body.passwordConfirm) {
        return next(
            new AppError(
                'Passwords can only be updated in the /users/update-password route',
                400
            )
        );
    }
    // 2) Only include fields which are allowed to be updated
    const body = filterObj(req.body, 'name');
    if (req.file) body.photo = req.file.filename;

    // 3) Update and send user
    const user = await User.findByIdAndUpdate(req.user._id, body, {
        new: true,
        runValidators: true,
    });

    res.status(200).json({
        status: 'success',
        data: {
            user,
        },
    });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false });

    res.status(204).json({
        status: 'success',
        data: null,
    });
});

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);

exports.promote = catchAsync(async (req, res, next) => {});
