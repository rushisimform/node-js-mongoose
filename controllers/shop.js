const fs = require('fs');
const path = require('path');
const Product = require('../models/product');
const Order = require('../models/order');
// const Cart = require('../models/cart');

const PDFDocument = require('pdfkit');

const ITEMS_PER_PAGE = 2;

module.exports.getIndex = (req, res, next) => {
    let page = +req.query.page || 1;
    page = Math.max(page, 1);
    let totalItems;

    Product
        .find()
        .countDocuments()
        .then(count => {
            totalItems = count;

            return Product
                .find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE);
        })
        .then(products => {
            const currentPage = page;
            const lastPage = Math.ceil(totalItems / ITEMS_PER_PAGE);
            const hasPreviousPage = page > 1;
            // const hasNextPage = page * ITEMS_PER_PAGE < totalItems;
            const hasNextPage = page < lastPage;

            res.render('shop/index', {
                pageTitle: 'Shop',
                path: '/',
                products: products,
                currentPage: currentPage,
                hasPreviousPage: hasPreviousPage,
                hasNextPage: hasNextPage,
                lastPage: lastPage
            });
        })
        .catch(err => {
            console.log('err =-=-=-=->', err);
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

module.exports.getProducts = (req, res, next) => {
    let page = +req.query.page || 1;
    page = Math.max(page, 1);
    let totalItems;

    Product
        .find()
        .countDocuments()
        .then(count => {
            totalItems = count;

            return Product
                .find()
                // .select('title price -_id')
                // .populate('userId', '_id')
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE);
        })
        .then(products => {
            const lastPage = Math.ceil(totalItems / ITEMS_PER_PAGE);
            const hasPreviousPage = page > 1;
            const hasNextPage = page < lastPage;

            res.render('shop/product-list', {
                pageTitle: 'Products',
                path: '/products',
                products: products,
                currentPage: page,
                lastPage: lastPage,
                hasPreviousPage: hasPreviousPage,
                hasNextPage: hasNextPage
            });
        })
        .catch(err => {
            const eror = new Error(err);
            error.httpStatusCode(500);
            return next(error);
        });
};


module.exports.getProduct = (req, res, next) => {
    const productId = req.params.productId;

    Product
        .findById(productId)
        .then(product => {
            res.render('shop/product-details', {
                pageTitle: product.title,
                path: '/products',
                product: product
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

module.exports.getCart = (req, res, next) => {
    req.user
        .populate(['cart.items.productId'])
        .then(user => {
            let products = [...user.cart.items].map(product => {
                return { ...product.productId._doc, quantity: product.quantity };
            });
            res.render('shop/cart', {
                pageTitle: 'Cart',
                path: '/cart',
                products: products
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};


module.exports.postCart = (req, res, next) => {
    console.log('post cart');
    const productId = req.body.productId;
    Product.findById(productId)
        .then(product => {
            return req.user.addToCart(product)
        })
        .then(result => {
            res.redirect('/');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

module.exports.postDeleteCartProduct = (req, res, next) => {
    const productId = req.body.productId;
    req.user.removeFromCart(productId)
        .then(result => {
            res.redirect('/cart');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

module.exports.getOrders = (req, res, next) => {
    Order.find({ "user.userId": req.user._id })
        .then(orders => {
            res.render('shop/orders', {
                pageTitle: 'Orders',
                path: '/orders',
                orders: orders
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

module.exports.postOrder = (req, res, next) => {
    req.user
        .populate(['cart.items.productId'])
        .then(user => {
            let products = user.cart.items.map(product => {
                return { quantity: product.quantity, product: { ...product.productId._doc } };
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user._id
                },
                products: products
            });
            return order.save()
        })
        .then(result => {
            return req.user.clearCart();
        })
        .then(() => {
            res.redirect('/orders');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

module.exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    Order.findById(orderId).then(order => {
        if (!order) {
            return next(new Error('No order found.'));
        }
        if (order.user.userId.toString() !== req.user._id.toString()) {
            return next(new Error('Unauthorized'));
        }
        const invoiceName = 'invoice-' + orderId + '.pdf';
        const invoicePath = path.join('data', 'invoices', invoiceName);
        // fs.readFile(invoicePath, (err, data) => {
        //     if (err) {
        //         return next(err);
        //     }
        //     res.setHeader('Content-Type', 'application/pdf');
        //     res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"')
        //     res.send(data);
        // });
        const pdfDoc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            'inline; filename="' + invoiceName + '"'
        )
        pdfDoc.pipe(fs.createWriteStream(invoicePath));
        pdfDoc.pipe(res);

        pdfDoc.fontSize(26).text('Invoice', {
            underline: true
        });

        pdfDoc.text('--------------------');
        let totalPrice = 0;
        order.products.forEach(prod => {
            totalPrice += prod.quantity * prod.product.price
            pdfDoc.fontSize(14).text(
                prod.product.title +
                '-' +
                prod.quantity +
                'x' +
                '$' +
                prod.product.price)
        })
        pdfDoc.text('-----------------');
        pdfDoc.fontSize(20).text('Total Price $' + totalPrice);

        pdfDoc.end();
        // const file = fs.createReadStream(invoicePath);
        // file.pipe(res);
    }).catch(err => next(err));
}
