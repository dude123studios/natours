const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getOverview = catchAsync(async (req, res, next) => {
    // 1) Get tour data from collection
    const tours = await Tour.find();

    // 2) Build template

    // 3) Render template using data
    res.status(200).render('overview', {
        title: 'All Tours',
        tours,
    });
});

exports.getTour = catchAsync(async (req, res, next) => {
    const tour = await Tour.findOne({ slug: req.params.slug }).populate({
        path: 'reviews',
        fields: 'reviews rating user',
    });

    if (!tour) {
        return next(new AppError('There is no tour with that name', 404));
    }
    res.status(200)
        .set(
            'Content-Security-Policy',
            "default-src 'self' https://*.mapbox.com ;base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src https://cdnjs.cloudflare.com https://api.mapbox.com 'self' blob: ;script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests;"
        )
        .render('tour', {
            title: `${tour.name}`,
            tour,
        });
});

exports.login = (req, res) => {
    res.status(200)
        .set(
            'Content-Security-Policy',
            "script-src 'self' https://cdnjs.cloudflare.com/ajax/libs/axios/0.18.0/axios.js 'unsafe-inline' 'unsafe-eval';"
        )
        .render('login', {
            title: 'Login',
        });
};

exports.getAcount = (req, res) => {
    res.status(200).set().render('acount', {
        title: 'Your acount',
    });
};

exports.updateUserData = catchAsync(async (req, res, next) => {
    console.log(req.body);
    const user = await User.findByIdAndUpdate(
        req.user.id,
        {
            name: req.body.name,
        },
        {
            new: true,
            runValidators: true,
        }
    );

    res.status(200).render('acount', {
        title: 'Your acount',
        user,
    });
});

exports.getMyTours = catchAsync(async (req, res, next) => {
    // 1) Find all bookings
    const bookings = await Booking.find({ user: req.user.id });
    // 2) Find tours with the returned IDs
    const tourIDs = bookings.map((el) => el.tour);
    const tours = await Tour.find({ _id: { $in: tourIDs } });

    res.status(200).render('overview', {
        title: 'My Tours',
        tours,
    });
});
