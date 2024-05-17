const express = require('express');

const adminController = require('../controllers/admin');

const router = express.Router();

const isAuth = require('../middleware/is-auth');

const { query, body } = require('express-validator');

// /admin/add-product => GET
router.get('/add-product', isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get('/products', isAuth, adminController.getProducts);

// // /admin/edit-product => GET
router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

// // /admin/add-product => POST
router.post('/add-product',
    [
        body('title')
            .isString()
            .isLength({ min: 3, max: 25 }).withMessage('title can has to be 3 to 25 characters long'),
        body('price')
            .isFloat(),
        body('description')
            .isLength({ min: 5, max: 200 }).withMessage('description should be between 5 to 200 characters')
            .isString()
            .trim()
    ],
    isAuth,
    adminController.postAddProduct
);

// // /admin/edit-product => POST
router.post('/edit-product', [
    body('title')
        .isString()
        .isLength({ min: 3, max: 25 }).withMessage('title can has to be 3 to 25 characters long'),
    body('price')
        .isFloat(),
    body('description')
        .isLength({ min: 5, max: 200 }).withMessage('description should be between 5 to 200 characters')
        .isString()
        .trim()
], isAuth, adminController.postEditProduct);

// // /admin/delete-product => POST
router.post('/delete-product', isAuth, adminController.postDeleteProduct);

module.exports = router;
