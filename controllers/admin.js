const { default: mongoose } = require('mongoose');
const Product = require('../models/product');
const { validationResult } = require('express-validator');
const fileHelper = require('../util/file');

module.exports.getAddProduct = (req, res, next) => {
    res.render('admin/edit-product', {
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        editing: false,
        errorMessage: [],
        validationErrors: []
    });
};

module.exports.postAddProduct = (req, res, next) => {
    const productTitle = req.body.title;
    const productPrice = req.body.price;
    const productImage = req.file;
    const productDescription = req.body.description;
    const userId = req.session.user._id;
    const errors = validationResult(req);
    let hasError = false;
    let errorMessage = [];
    let validationErrors = [];

    if (!productImage) {
        hasError = true;
        errorMessage = ['attached file is not an image'];
        validationErrors = [{ param: 'image' }];
    }

    if (!errors.isEmpty() || hasError) {
        errorMessage = [...errorMessage, ...errors.array().map(error => error.msg)];
        validationErrors = [...validationErrors, ...errors.array()];
        return res
            .status(422)
            .render('admin/edit-product', {
                pageTitle: 'Add Product',
                path: '/admin/add-product',
                editing: false,
                errorMessage: errorMessage,
                product: {
                    title: productTitle,
                    price: productPrice,
                    description: productDescription
                },
                validationErrors: validationErrors
            });
    }

    const product = new Product({
        title: productTitle,
        price: productPrice,
        imageUrl: productImage.path,
        description: productDescription,
        userId: userId
    });

    product
        .save()
        .then(result => {
            res.redirect('/admin/products');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

module.exports.getProducts = (req, res, next) => {
    Product
        .find({ userId: req.user._id })
        // .select('title price -_id')
        // .populate('userId', 'name')
        .then(products => {
            res.render('admin/product-list', {
                pageTitle: 'All Products',
                path: '/admin/products',
                products: products
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

module.exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;
    if (!editMode) return res.redirect('/');
    const productId = req.params.productId;

    Product
        .findById(productId)
        .then(product => {
            res.render('admin/edit-product', {
                pageTitle: product.title,
                path: '/admin/products',
                editing: editMode,
                product: product,
                errorMessage: [],
                validationErrors: []
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

module.exports.postEditProduct = (req, res, next) => {
    const productId = req.body.id;
    const productTitle = req.body.title;
    const productPrice = req.body.price;
    const productImage = req.file;
    const productDescription = req.body.description;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res
            .status(422)
            .render('admin/edit-product', {
                pageTitle: 'Edit Product',
                path: '/admin/products',
                editing: true,
                errorMessage: errors.array().map(error => error.msg),
                product: {
                    _id: productId,
                    title: productTitle,
                    price: productPrice,
                    description: productDescription
                },
                validationErrors: errors.array()
            });
    }

    Product
        .findById(productId)
        .then(product => {
            if (product.userId.toString() === req.user._id.toString()) {
                product.title = productTitle;
                product.price = productPrice;
                if (productImage) {
                    fileHelper.deleteFile(product.imageUrl);
                    product.imageUrl = productImage.path;
                }
                product.description = productDescription;
                return product.save();
            } else {
                req.flash('alert', 'You can not edit this product information.');
            }
        })
        .then(result => {
            if (result) req.flash('success', 'Product update successful');
            res.redirect('/admin/products');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

module.exports.postDeleteProduct = (req, res, next) => {
    const productId = req.body.productId;

    Product
        .findById(productId)
        .then(product => {
            if (!product) {
                return next(new Error('product not found'));
            }
            fileHelper.deleteFile(product.imageUrl);
            return Product
                // .findByIdAndRemove(productId) // deprecated without setting 'useFindAndModify: false'
                // .findByIdAndDelete(productId)
                .deleteOne({
                    _id: product._id,
                    userId: product.userId
                });
        })
        .then(result => {
            if (result.deletedCount > 0) req.flash('success', 'Product successfully deleted.');
            else req.flash('alert', 'You can not delete this product.');
            res.redirect('/admin/products');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};
