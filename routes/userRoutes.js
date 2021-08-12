const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.delete('/login', authController.logout);

router.get('/email-confirm/:token', authController.confirmEmail);

router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

router.use(authController.protect);

router.patch('/update-password', authController.updatePassword);

router.get('/me', userController.getMe, userController.getUser);
router.patch(
    '/update-me',
    userController.uploadPhoto,
    userController.resizeUserPhoto,
    userController.deleteOldPhoto,
    userController.updateMe
);
router.delete('/delete-me', userController.deleteMe);

router.route('/').get(userController.getAllUsers);

router.use(authController.restrictTo('admin'));

router
    .route('/:id')
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser);

module.exports = router;
