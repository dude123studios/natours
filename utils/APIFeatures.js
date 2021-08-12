class APIFeatures {
    constructor(query, queryStr) {
        this.query = query;
        this.queryStr = queryStr;
    }

    filter() {
        // 1A) Filtering
        const queryObj = { ...this.queryStr };
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        excludedFields.forEach((el) => delete queryObj[el]);
        // 1B) Advanced Filtering
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(
            /\b(gte|gt|lte|lt)\b/g,
            (match) => `$${match}`
        );

        this.query = this.query.find(JSON.parse(queryStr));

        return this;
    }

    sort() {
        if (this.queryStr.sort) {
            const sortBy = this.queryStr.sort.split(',').join(' ');
            //sort('price,ratingAverage') = > sort('price ratingAverage')
            //If prices are same, then sort by rating average
            this.query = this.query.sort(sortBy);
        } else {
            this.query = this.query.sort('-createdAt');
        }

        return this;
    }

    limitFields() {
        if (this.queryStr.fields) {
            const fields = this.queryStr.fields.split(',').join(' ');
            //query = query.select('name duration price')
            //only select fields we want in our tours.
            this.query = this.query.select(fields);
        } else {
            this.query = this.query.select('-__v');

            //the minus sign means excluding. So here we exclued __v, and return all others
        }
        return this;
    }

    paginate() {
        const page = this.queryStr.page * 1 || 1;
        const limit = this.queryStr.limit * 1 || 20;
        const skip = (page - 1) * limit;

        // page=3&limit=10. 1-10 are page 1, 11-20 are page 2, and so on
        this.query = this.query.skip(skip).limit(limit);

        return this;
    }
}

module.exports = APIFeatures;
