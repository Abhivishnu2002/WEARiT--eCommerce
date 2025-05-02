// controllers/user/walletController.js
const User = require('../../models/userModel');
const mongoose = require('mongoose');

const walletController = {
    getWalletPage: async (req, res) => {
        try {
            const user = await User.findById(req.user._id);
            const wishlistCount = await getWishlistCount(req.user._id);
            
            res.render('pages/wallet', {
                user,
                wishlistCount,
                activePage: 'wallet'
            });
        } catch (error) {
            console.error('Error loading wallet page:', error);
            req.flash('error_msg', 'Error loading wallet page');
            res.redirect('/profile');
        }
    },
    addMoney: async (req, res) => {
        try {
            const { amount, paymentMethod } = req.body;
            
            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid amount'
                });
            }
            
            const user = await User.findById(req.user._id);
            if (!user.wallet) {
                user.wallet = {
                    balance: 0,
                    transactions: []
                };
            }
            const transaction = {
                amount: parseFloat(amount),
                type: 'credit',
                description: `Added via ${paymentMethod}`,
                date: new Date()
            };
            user.wallet.balance += parseFloat(amount);
            user.wallet.transactions.push(transaction);
            
            await user.save();
            
            res.json({
                success: true,
                message: 'Money added to wallet successfully'
            });
        } catch (error) {
            console.error('Error adding money to wallet:', error);
            res.status(500).json({
                success: false,
                message: 'Error adding money to wallet'
            });
        }
    },
    useWalletBalance: async (req, res) => {
        try {
            const { amount, orderId, description } = req.body;
            
            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid amount'
                });
            }
            
            const user = await User.findById(req.user._id);
            if (!user.wallet || user.wallet.balance < amount) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient wallet balance'
                });
            }
            const transaction = {
                amount: parseFloat(amount),
                type: 'debit',
                description: description || `Payment for order #${orderId}`,
                date: new Date()
            };
            user.wallet.balance -= parseFloat(amount);
            user.wallet.transactions.push(transaction);
            
            await user.save();
            
            res.json({
                success: true,
                message: 'Payment successful',
                remainingBalance: user.wallet.balance
            });
        } catch (error) {
            console.error('Error using wallet balance:', error);
            res.status(500).json({
                success: false,
                message: 'Error processing payment'
            });
        }
    }
};

async function getWishlistCount(userId) {
    try {
        const Wishlist = require('../../models/wishlistModel');
        const wishlist = await Wishlist.findOne({ user: userId });
        return wishlist ? wishlist.products.length : 0;
    } catch (error) {
        console.error('Error getting wishlist count:', error);
        return 0;
    }
}

module.exports = walletController;