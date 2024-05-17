const express = require('express');
const { query, body } = require('express-validator');

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);

router.post('/login',
    [
        body('email')
            .isEmail()
            .withMessage('invalid email')
            .normalizeEmail()
    ],
    authController.postLogin
);

router.post('/logout', authController.postLogout);

router.post(
    '/signup',
    [
        body('email')
            .isEmail().withMessage('please enter a valid email')
            .custom((value) => {
                return User
                    .findOne({ email: value })
                    .then(user => {
                        if (user) return Promise.reject('this email already exist, please use another email');
                    });
            })
            .normalizeEmail(),
        body('password')
            .trim()
            .isLength({ min: 8 }).withMessage('password has to be atleast 8 characters long')
            .isAlphanumeric().withMessage('password can contain only letters and numbers'),
        body('confirmPassword')
            .trim()
            .custom((value, { req }) => {
                if (value !== req.body.password) throw new Error('passwords do not match');
                return true;
            })

    ],
    authController.postSignup
);

router.get('/signup', authController.getSignup);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router;