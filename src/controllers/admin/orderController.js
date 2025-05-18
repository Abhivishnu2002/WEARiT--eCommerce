const Order = require('../../models/orderModel');
const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const { generateInvoice } = require("../../utils/invoiceGenerator")
const fs = require('fs');
const path = require('path');

const adminOrderController = {

  getAllOrders: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      let query = {};
      if (req.query.search) {
        query.$or = [
          { orderID: { $regex: req.query.search, $options: 'i' } }
        ];
      }
      if (req.query.timeFilter) {
        const now = new Date();
        let startDate;
        
        switch(req.query.timeFilter) {
          case '24hour':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '12months':
            startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            break;
        }
        
        if (startDate) {
          query.orderDate = { $gte: startDate };
        }
      }
      if (req.query.status) {
        query.orderStatus = req.query.status;
      }
      if (req.query.returnStatus === 'return pending') {
        query['products.status'] = 'return pending';
      } else if (req.query.returnStatus === 'returned') {
        query['products.status'] = 'returned';
      }
      if (req.query.paymentMethod) {
        query.paymentMethod = req.query.paymentMethod;
      }
      const totalOrders = await Order.countDocuments(query);
      const totalPages = Math.ceil(totalOrders / limit);
      let sort = { orderDate: -1 };
      if (req.query.sortBy) {
        sort = { [req.query.sortBy]: req.query.sortOrder === 'asc' ? 1 : -1 };
      }
      const orders = await Order.find(query)
        .populate('user', 'name email mobile')
        .populate({
          path: 'products.product',
          select: 'name images'
        })
        .populate('address')
        .sort(sort)
        .skip(skip)
        .limit(limit);
      const paymentMethods = await Order.distinct('paymentMethod');
      res.render('admin/pages/adminOrders', {
        orders,
        currentPage: page,
        totalPages,
        totalOrders,
        limit,
        query: req.query,
        paymentMethods,
        admin: req.session.admin
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.render('admin/pages/adminOrders', {
        error_msg: 'Failed to fetch orders',
        orders: [],
        admin: req.session.admin
      });
    }
  },
  
getOrderDetails: async (req, res) => {
  try {
    const orderId = req.params.id;
    
    const order = await Order.findById(orderId)
      .populate('user', 'name email mobile')
      .populate({
        path: 'products.product',
        select: 'name images color variants'
      })
      .populate('address');
    
    if (!order) {
      return res.status(404).render('errors/404', {
        error_msg: 'Order not found',
        admin: req.session.admin
      });
    }
    const subtotal = order.products.reduce((total, item) => {
      return total + (item.variant.salePrice * item.quantity);
    }, 0);
    const shippingCost = order.finalAmount - subtotal + (order.discount || 0);
    const orderSummary = {
      subtotal,
      shippingCost: Math.max(0, shippingCost), 
      couponCode: ''
    };
    const orderStatus = {
      placed: true, 
      placedDate: formatDate(order.createdAt),
      processing: ['shipped', 'out for delivery', 'delivered'].includes(order.orderStatus),
      processingDate: order.orderStatus !== 'pending' ? formatDate(order.updatedAt) : '',
      shipped: ['shipped', 'out for delivery', 'delivered'].includes(order.orderStatus),
      shippedDate: ['shipped', 'out for delivery', 'delivered'].includes(order.orderStatus) ? formatDate(order.updatedAt) : '',
      outForDelivery: ['out for delivery', 'delivered'].includes(order.orderStatus),
      outForDeliveryDate: ['out for delivery', 'delivered'].includes(order.orderStatus) ? formatDate(order.updatedAt) : '',
      delivered: order.orderStatus === 'delivered',
      deliveredDate: order.orderStatus === 'delivered' ? formatDate(order.updatedAt) : ''
    };
    res.render('admin/pages/adminOrderDetails', {
      order,
      orderSummary,
      orderStatus,
      admin: req.session.admin
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.render('errors/404', {
      error_msg: 'Failed to fetch order details',
      admin: req.session.admin
    });
  }
},
  
updateOrderStatus: async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status, note, productId, trackingNumber, courier } = req.body;
    
    if (!['pending', 'shipped', 'out for delivery', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const order = await Order.findById(orderId)
      .populate({
        path: 'products.product',
        select: 'name variants'
      });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    if (productId) {
      const productItem = order.products.find(p => p.product._id.toString() === productId);
      
      if (!productItem) {
        return res.status(404).json({
          success: false,
          message: 'Product not found in order'
        });
      }
      
      const previousStatus = productItem.status;
      productItem.status = status;
      if (status === 'cancelled' && ['pending', 'shipped'].includes(previousStatus)) {
        try {
          const product = await Product.findById(productId);
          if (product) {
            const variant = product.variants.find(v => v.size === productItem.variant.size);
            if (variant) {
              variant.varientquatity += productItem.quantity;
              await product.save();
            }
          }
        } catch (err) {
          console.error(`Error restoring stock for product ${productId}:`, err);
        }
      }
      const allProductsHaveSameStatus = order.products.every(p => p.status === status);
      if (allProductsHaveSameStatus) {
        order.orderStatus = status;
      }
    } else {
      const previousStatus = order.orderStatus;
      order.orderStatus = status;
      order.products.forEach(product => {
        product.status = status;
      });
      if (status === 'cancelled' && ['pending', 'shipped'].includes(previousStatus)) {
        for (const item of order.products) {
          try {
            const product = await Product.findById(item.product._id);
            if (product) {
              const variant = product.variants.find(v => v.size === item.variant.size);
              if (variant) {
                variant.varientquatity += item.quantity;
                await product.save();
              }
            }
          } catch (err) {
            console.error(`Error restoring stock for product ${item.product._id}:`, err);
          }
        }
      }
    }
    if (!order.trackingDetails) {
      order.trackingDetails = {
        updates: []
      };
    }
    if (trackingNumber) {
      order.trackingDetails.trackingNumber = trackingNumber;
      order.trackingDetails.courier = courier || 'Default Courier';
    }
    order.trackingDetails.updates = order.trackingDetails.updates || [];
    order.trackingDetails.updates.push({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      location: req.body.location || 'Processing Center',
      timestamp: new Date(),
      description: note || `Order status updated to ${status}`
    });
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status: status,
      timestamp: new Date(),
      note: note || `Status updated to ${status}`
    });
    order.updatedAt = new Date();
    
    await order.save();
    
    res.json({
      success: true,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
},
processReturnRequest: async (req, res) => {
    try {
      const { orderId, productId, action, reason } = req.body

      if (!["approve", "reject"].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "Invalid action",
        })
      }

      const order = await Order.findById(orderId).populate("user").populate({
        path: "products.product",
        select: "name variants",
      })

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        })
      }
      const productItem = order.products.find((p) => p.product._id.toString() === productId)

      if (!productItem) {
        return res.status(404).json({
          success: false,
          message: "Product not found in order",
        })
      }

      if (productItem.status !== "return pending") {
        return res.status(400).json({
          success: false,
          message: "No return request found for this product",
        })
      }

      if (action === "approve") {
        productItem.status = "returned"

        const refundAmount = productItem.variant.salePrice * productItem.quantity

        if (!order.user.wallet) {
          order.user.wallet = {
            balance: 0,
            transactions: [],
          }
        }
        order.user.wallet.balance += refundAmount
        order.user.wallet.transactions.push({
          amount: refundAmount,
          type: "credit",
          description: `Refund for returned item in order #${order.orderID}`,
          date: new Date(),
        })

        await order.user.save()

        try {
          const product = await Product.findById(productId)
          if (product) {
            const variant = product.variants.find((v) => v.size === productItem.variant.size)
            if (variant) {
              variant.varientquatity += productItem.quantity
              await product.save()
            }
          }
        } catch (err) {
          console.error(`Error restoring stock for product ${productId}:`, err)
        }

        if (!order.trackingDetails) {
          order.trackingDetails = { updates: [] }
        }

        order.trackingDetails.updates.push({
          status: "Return Approved",
          location: "Return Center",
          timestamp: new Date(),
          description: `Return request approved. Refund of ₹${refundAmount.toFixed(2)} issued to wallet.`,
        })
      } else {
        productItem.status = "delivered"

        if (!order.trackingDetails) {
          order.trackingDetails = { updates: [] }
        }

        order.trackingDetails.updates.push({
          status: "Return Rejected",
          location: "Return Center",
          timestamp: new Date(),
          description: `Return request rejected. Reason: ${reason || "No reason provided"}`,
        })
      }

      if (reason) {
        productItem.returnReason = reason
      }
      const pendingReturns = order.products.some((p) => p.status === "return pending")

      if (!pendingReturns) {
        const returnedProducts = order.products.filter((p) => p.status === "returned")

        if (returnedProducts.length === order.products.length) {
          order.orderStatus = "returned"
        } else if (returnedProducts.length > 0) {
          order.orderStatus = "delivered"

          if (!order.trackingDetails) {
            order.trackingDetails = { updates: [] }
          }

          order.trackingDetails.updates.push({
            status: "Partial Return",
            location: "System",
            timestamp: new Date(),
            description: `Some items in this order have been returned.`,
          })
        } else {
          order.orderStatus = "delivered"
        }
      }

      await order.save()

      res.json({
        success: true,
        message: `Return request ${action === "approve" ? "approved" : "rejected"} successfully`,
      })
    } catch (error) {
      console.error("Error processing return request:", error)
      res.status(500).json({
        success: false,
        message: "Failed to process return request",
      })
    }
  },
  
generateInvoice: async (req, res) => {
    try {
      const orderId = req.params.id

      const order = await Order.findById(orderId)
        .populate("user", "name email mobile")
        .populate({
          path: "products.product",
          select: "name images color variants",
        })
        .populate("address")

      if (!order) {
        return res.status(404).render("errors/404", {
          error_msg: "Order not found",
          admin: req.session.admin,
        })
      }
      await generateInvoice({
        order,
        user: order.user,
        res,
        isAdmin: true,
      })
    } catch (error) {
      console.error("Error generating invoice:", error)
      res.status(500).render("errors/404", {
        error_msg: "Failed to generate invoice",
        admin: req.session.admin,
      })
    }
  },
  clearFilters: (req, res) => {
    res.redirect('/admin/orders');
  },
  getInventoryStatus: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const lowStockThreshold = parseInt(req.query.threshold) || 5;
      const lowStockProducts = await Product.aggregate([
        { $unwind: '$variants' },
        { $match: { 'variants.varientquatity': { $lte: lowStockThreshold } } },
        { $group: {
          _id: '$_id',
          name: { $first: '$name' },
          color: { $first: '$color' },
          images: { $first: '$images' },
          lowStockVariants: {
            $push: {
              size: '$variants.size',
              quantity: '$variants.varientquatity',
              price: '$variants.varientPrice',
              salePrice: '$variants.salePrice'
            }
          },
          totalLowStockCount: { $sum: 1 }
        }}
      ]);
      const totalProducts = lowStockProducts.length;
      const totalPages = Math.ceil(totalProducts / limit);
      const paginatedProducts = lowStockProducts.slice(skip, skip + limit);
      res.render('admin/pages/adminInventory', {
        products: paginatedProducts,
        currentPage: page,
        totalPages,
        totalProducts,
        limit,
        threshold: lowStockThreshold,
        admin: req.session.admin
      });
    } catch (error) {
      console.error('Error fetching inventory status:', error);
      res.render('admin/pages/adminInventory', {
        error_msg: 'Failed to fetch inventory status',
        products: [],
        admin: req.session.admin
      });
    }
  },
  updateProductStock: async (req, res) => {
    try {
      const { productId, size, quantity } = req.body;
      
      const product = await Product.findById(productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      const variant = product.variants.find(v => v.size === size);
      
      if (!variant) {
        return res.status(404).json({
          success: false,
          message: 'Variant not found'
        });
      }
      variant.varientquatity = parseInt(quantity);
      
      await product.save();
      
      res.json({
        success: true,
        message: 'Stock updated successfully'
      });
    } catch (error) {
      console.error('Error updating product stock:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update product stock'
      });
    }
  }
};

function formatDate(date) {
  if (!date) return '';
  
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

module.exports = adminOrderController;

