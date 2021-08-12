const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/APIFeatures');

exports.deleteOne = (Model) =>
    catchAsync(async (req, res, next) => {
        if (!req.document)
            req.document = await Model.findByIdAndDelete(req.params.id);

        if (!req.document) {
            return next(new AppError(`${Model.modelName} not found`, 404));
        }

        res.status(204).json({
            status: 'success',
            data: null,
        });
    });

exports.updateOne = (Model) =>
    catchAsync(async (req, res, next) => {
        const document = await Model.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true, // makes the func return the updated version, rather than the older one
                runValidators: true,
            }
        );

        if (!document) {
            return next(new AppError(`${Model.modelName} not found`, 404));
        }
        json = {
            status: 'success',
            data: {},
        };
        json.data[Model.modelName.toLowerCase()] = document;

        res.status(200).json(json);
    });

exports.createOne = (Model) =>
    catchAsync(async (req, res, next) => {
        //const newTour = new Tour({...req.body})
        //const data = await newTour.save()
        const newDocument = await Model.create(req.body);

        json = {
            status: 'success',
            data: {},
        };
        json.data[Model.modelName.toLowerCase()] = newDocument;

        res.status(201).json(json);
    });

exports.getOne = (Model, populateOptions) =>
    catchAsync(async (req, res, next) => {
        let query = Model.findById(req.params.id);
        if (populateOptions) query = query.populate(populateOptions);
        const document = await query;

        if (!document) {
            return next(new AppError(`${Model.modelName} not found`, 404));
        }

        json = {
            status: 'success',
            data: {},
        };
        json.data[Model.modelName.toLowerCase()] = document;

        res.status(200).json(json);
    });

exports.getAll = (Model) =>
    catchAsync(async (req, res, next) => {
        let filter = {};
        if (req.params.tourId) filter = { tour: req.params.tourId };

        const features = new APIFeatures(Model.find(filter), req.query)
            .filter()
            .sort()
            .limitFields()
            .paginate();
        const documents = await features.query;

        json = {
            status: 'success',
            results: documents.length,
            data: {},
        };
        json.data[`${Model.modelName.toLowerCase()}s`] = documents;

        res.status(200).json(json);
    });
