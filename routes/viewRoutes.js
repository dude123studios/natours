const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.use(viewsController.alerts);

router.get('/me', authController.protect, viewsController.getAcount);
router.get('/my-tours', authController.protect, viewsController.getMyTours);

router.use(authController.isLoggedIn);
router.get('/', viewsController.getOverview);
router.get('/tour/:slug', authController.protect, viewsController.getTour);
router.get('/login', viewsController.login);

router.post(
    '/submit-user-data',
    authController.protect,
    viewsController.updateUserData
);

router.get(
    '/confirmEmail/:token',
    authController.confirmEmail,
    viewsController.getOverview
);

module.exports = router;
