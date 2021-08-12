const Review = require('../models/reviewModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.setTourUserIds = (req, res, next) => {
    req.body.user = req.user._id;
    if (!req.body.tour) req.body.tour = req.params.tourId;
    next();
};

exports.restrictToBookedTours = catchAsync(async (req, res, next) => {
    const booking = await Booking.find({
        tour: req.body.tour,
        user: req.user.id,
    });
    if (!booking) return next(new AppError('Access denied', 403));
    next();
});

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
