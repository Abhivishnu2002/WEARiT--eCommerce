const Cart = require('../../models/cartModel');
const Address = require('../../models/addressModel');
const Product = require('../../models/productModel');

const loadCheckout = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id });

    const cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: 'products.product',
        populate: {
          path: 'categoryId'
        }
      });
    
    if (!cart || cart.products.length === 0) {
      req.flash('error_msg', 'Your cart is empty');
      return res.redirect('/cart');
    }

    const validProducts = cart.products.filter(item => 
      item.product && 
      item.product.isActive && 
      item.product.categoryId && 
      item.product.categoryId.isListed
    );

    if (validProducts.length === 0) {
      req.flash('error_msg', 'No valid products in your cart');
      return res.redirect('/cart');
    }

    let subtotal = 0;
    let totalDiscount = 0;
    
    validProducts.forEach(item => {
      const variant = item.product.variants.find(v => v.size === item.size);
      if (variant) {
        const itemTotal = variant.varientPrice * item.quantity;
        const discountAmount = (variant.varientPrice - variant.salePrice) * item.quantity;
        
        subtotal += itemTotal;
        totalDiscount += discountAmount;
      }
    });

    const taxRate = 0.05;
    const taxAmount = (subtotal - totalDiscount) * taxRate;
    const shippingCharge = (subtotal - totalDiscount) > 500 ? 0 : 50;

    const finalAmount = (subtotal - totalDiscount + taxAmount + shippingCharge).toFixed(2);
    
    res.render('pages/checkout', { 
      addresses,
      cart: {
        products: validProducts
      },
      totals: {
        subtotal,
        discount: totalDiscount,
        tax: taxAmount,
        shipping: shippingCharge,
        finalAmount
      }
    });
  } catch (error) {
    console.error('Checkout error:', error);
    req.flash('error_msg', 'Failed to load checkout page');
    res.redirect('/cart');
  }
};

const placeOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod } = req.body;
    
    if (!addressId) {
      req.flash('error_msg', 'Please select a delivery address');
      return res.redirect('/checkout');
    }

    const address = await Address.findOne({ _id: addressId, user: req.user._id });
    if (!address) {
      req.flash('error_msg', 'Invalid address selected');
      return res.redirect('/checkout');
    }

    const cart = await Cart.findOne({ user: req.user._id })
      .populate('products.product');
    
    if (!cart || cart.products.length === 0) {
      req.flash('error_msg', 'Your cart is empty');
      return res.redirect('/cart');
    }

    const validProducts = [];
    let subtotal = 0;
    let totalDiscount = 0;
    
    for (const item of cart.products) {
      const product = await Product.findById(item.product._id);
      if (!product || !product.isActive) continue;
      
      const variant = product.variants.find(v => v.size === item.size);
      if (!variant || variant.varientquatity < item.quantity) {
        req.flash('error_msg', `Not enough stock for ${product.name} (${item.size})`);
        return res.redirect('/checkout');
      }

      const itemTotal = variant.varientPrice * item.quantity;
      const discountAmount = (variant.varientPrice - variant.salePrice) * item.quantity;
      
      subtotal += itemTotal;
      totalDiscount += discountAmount;

      validProducts.push({
        product: product._id,
        variant: {
          size: item.size,
          varientPrice: variant.varientPrice,
          salePrice: variant.salePrice
        },
        quantity: item.quantity,
        status: 'pending'
      });

      variant.varientquatity -= item.quantity;
      await product.save();
    }

    const taxRate = 0.05;
    const taxAmount = (subtotal - totalDiscount) * taxRate;
    const shippingCharge = (subtotal - totalDiscount) > 500 ? 0 : 50;
    const finalAmount = subtotal - totalDiscount + taxAmount + shippingCharge;

    const Order = require('../../models/orderModel');
    const order = new Order({
      user: req.user._id,
      products: validProducts,
      address: addressId,
      totalAmount: subtotal,
      discount: totalDiscount,
      finalAmount: finalAmount,
      paymentMentod: paymentMethod,
      orderStatus: 'pending'
    });
    
    await order.save();

    await Cart.findOneAndDelete({ user: req.user._id });

    res.redirect(`/order-success/${order._id}`);
  } catch (error) {
    console.error('Place order error:', error);
    req.flash('error_msg', 'Failed to place order');
    res.redirect('/checkout');
  }
};

const orderSuccess = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
      .populate('address');
    
    if (!order) {
      req.flash('error_msg', 'Order not found');
      return res.redirect('/profile/orders');
    }
    
    res.render('pages/order-success', { order });
  } catch (error) {
    console.error('Order success page error:', error);
    req.flash('error_msg', 'Failed to load order success page');
    res.redirect('/profile/orders');
  }
};

module.exports = {
  loadCheckout,
  placeOrder,
  orderSuccess
};