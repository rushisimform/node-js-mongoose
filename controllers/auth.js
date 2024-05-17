const crypto = require('crypto');

const User = require('../models/user');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const { query, validationResult } = require('express-validator');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'rushikantaria@gmail.com',
        pass: 'jvww ozyw bmeb knla'
    }
});

module.exports.getLogin = (req, res, next) => {
    let message = req.flash('error');
    console.log(message);
    if (message.length <= 0) {
        message = null;
    }
    res.render('auth/login', {
        pageTitle: 'Login',
        path: '/login',
        errorMessage: message,
        oldInput: { email: '' },
        validationErrors: []
    });

};

module.exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res
            .status(422)
            .render('auth/login', {
                pageTitle: 'Login',
                path: '/login',
                errorMessage: errors.array().map(error => error.msg),
                oldInput: { email: email },
                validationErrors: errors.array()
            });
    }

    User
        .findOne({
            email: email
        })
        .then(user => {
            if (user) {
                bcrypt
                    .compare(password, user.password)
                    .then(matched => {
                        if (matched) {
                            req.session.user = user;
                            req.session.isLoggedIn = true;
                            req.session.save(err => {
                                if (err) console.log(err);
                                res.redirect('/');
                            });
                        } else {
                            res
                                .status(422)
                                .render('auth/login', {
                                    pageTitle: 'Login',
                                    path: '/login',
                                    errorMessage: ['password did not match'],
                                    oldInput: { email: email },
                                    validationErrors: [{ param: 'password' }]
                                });
                        }
                    }).catch(err => {
                        if (err) console.log(err);
                        req.flash('error', 'something went wrong, please try again later.');
                        res.redirect('/login');
                    });
            } else {
                res
                    .status(422)
                    .render('auth/login', {
                        pageTitle: 'Login',
                        path: '/login',
                        errorMessage: ['wrong email address'],
                        oldInput: { email: email },
                        validationErrors: [{ param: 'email' }]
                    });
            }
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};
module.exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        if (err) console.log(err);
        res.redirect('/');
    });
}

module.exports.postSignup = (req, res, next) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('auth/signup', {
            pageTitle: 'Signup',
            path: '/signup',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password,
                confirmPassword: confirmPassword
            },
            validationErrors: errors.array()
        });
    }
    bcrypt
        .hash(password, 12)
        .then(hashedPassword => {
            const newUser = new User({
                email: email,
                password: hashedPassword,
                cart: { items: [] }
            });
            return newUser.save();
        })
        .then(() => {
            transporter.sendMail({
                from: {
                    name: 'rushi mail',
                    address: 'rushikantaria@gmail.com'
                },
                to: email,
                subject: 'Hello from AWS SES and nodemailer.',
                text: 'This is test email send from AWS SES using Nodemailer.',
                html: `<h2>Account is created successfully for ${username}.</h2>`
            }, (error, info) => {
                if (error) {
                    console.log('Error: ', error);
                    res.redirect('/login');
                } else {
                    console.log('Email send successfully :- ', info.response);
                    res.redirect('/login');
                }
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

module.exports.getSignup = (req, res, next) => {
    let message = req.flash('error');
    console.log(message);
    if (message.length <= 0) {
        message = null;
    }
    res.render('auth/signup', {
        pageTitle: 'Signup',
        path: '/signup',
        errorMessage: message,
        oldInput: { email: '', password: '', confirmPassword: '' },
        validationErrors: []
    });
};

module.exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    console.log(message);
    if (message.length <= 0) {
        message = null;
    }
    res.render('auth/reset-password', {
        pageTitle: 'Reset Password',
        path: '/reset',
        errorMessage: message
    });
}

module.exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err);
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({ email: req.body.email })
            .then((user) => {
                if (!user) {
                    req.flash('error', 'No account with that email found.');
                    return res.redirect('/reset');
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                return user.save();
            })
            .then(result => {
                res.redirect('/');
                transporter.sendMail({
                    from: {
                        name: 'rushi mail',
                        address: 'rushikantaria@gmail.com'
                    },
                    to: req.body.email,
                    subject: 'Password Reset.',
                    text: 'This is test email send from AWS SES using Nodemailer.',
                    html: `
                        <p>You requested a password reset</p>
                        <p>Click this <a href="http://localhost:3000/reset/${token}"> link </a> to set a new password.</p> 
                    `
                }, (error, info) => {
                    if (error) {
                        console.log('Error: ', error);
                        res.redirect('/login');
                    } else {
                        console.log('Email send successfully :- ', info.response);
                        res.redirect('/login');
                    }
                });

            })
            .catch(err => console.log(err))
    })
}

module.exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
        .then(user => {
            let message = req.flash('error');
            console.log(message);
            if (message.length <= 0) {
                message = null;
            }
            res.render('auth/new-password', {
                pageTitle: 'New Password',
                path: '/new-password',
                errorMessage: message,
                userId: user._id.toString(),
                resetToken: token,
            });
        })
        .catch(err => console.log(err))
}

module.exports.postNewPassword = (req, res, next) => {
    const userId = req.body.userId;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    const resetToken = req.body.resetToken;
    User
        .findOne({
            _id: userId,
            resetToken: resetToken,
            resetTokenExpiration: { $gt: Date.now() }
        })
        .then(user => {
            if (user) {
                bcrypt
                    .hash(password, 12)
                    .then(hashedPassword => {
                        user.password = hashedPassword;
                        user.resetToken = null;
                        user.resetTokenExpiration = undefined;
                        return user.save();
                    })
                    .then(result => {
                        transporter.sendMail({
                            from: {
                                name: 'rushi mail',
                                address: 'rushikantaria@gmail.com'
                            },
                            to: user.email,
                            subject: 'Password Reset Success',
                            text: 'This is test email send from AWS SES using Nodemailer.',
                            html: `
                                    <p>Your password has been reset successfully at ${new Date(Date.now()).toString()}</p>
                                `
                        }, (error, info) => {
                            if (error) {
                                console.log('Error: ', error);
                                res.redirect('/login');
                            } else {
                                console.log('Email send successfully :- ', info.response);
                                res.redirect('/login');
                            }
                        });
                    })
                    .catch(err => {
                        const error = new Error(err);
                        error.httpStatusCode = 500;
                        return next(error);
                    });
            }
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

