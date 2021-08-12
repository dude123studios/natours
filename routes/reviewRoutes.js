const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');
const Review = require('../models/reviewModel');

const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
    .route('/')
    .get(reviewController.getAllReviews)
    .post(
        authController.restrictTo('user'),
        reviewController.setTourUserIds,
        reviewController.restrictToBookedTours,
        reviewController.createReview
    );

const protectReview = authController.mustOwn(Review);

router
    .route('/:id')
    .get(reviewController.getReview)
    .delete(
        authController.restrictTo('user', 'admin'),
        protectReview,
        reviewController.deleteReview
    )
    .patch(
        authController.restrictTo('user', 'admin'),
        protectReview,
        reviewController.updateReview
    );

module.exports = router;
