/**
 * Application Enums
 * Centralized enum definitions for consistent status codes and values
 */

// Order Status Enum
const ORDER_STATUS = {
  PENDING: 'pending',
  SHIPPED: 'shipped',
  OUT_FOR_DELIVERY: 'out for delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
  RETURN_PENDING: 'return pending'
}

// Payment Status Enum
const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially refunded'
}

// Payment Method Enum
const PAYMENT_METHOD = {
  COD: 'COD',
  RAZORPAY: 'Razorpay',
  PAYPAL: 'PayPal',
  WALLET: 'Wallet'
}

// Transaction Status Enum
const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
}

// User Status Enum
const USER_STATUS = {
  ACTIVE: 'active',
  BLOCKED: 'blocked',
  SUSPENDED: 'suspended'
}

// Product Status Enum
const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OUT_OF_STOCK: 'out of stock',
  DISCONTINUED: 'discontinued'
}

// Coupon Status Enum
const COUPON_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
  USED: 'used'
}

// Return Status Enum
const RETURN_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed'
}

// Order Status Hierarchy for Validation
const ORDER_STATUS_HIERARCHY = {
  [ORDER_STATUS.PENDING]: 0,
  [ORDER_STATUS.SHIPPED]: 1,
  [ORDER_STATUS.OUT_FOR_DELIVERY]: 2,
  [ORDER_STATUS.DELIVERED]: 3,
  [ORDER_STATUS.CANCELLED]: 4,
  [ORDER_STATUS.RETURNED]: 5,
  [ORDER_STATUS.RETURN_PENDING]: 6
}

// Valid Status Transitions
const VALID_STATUS_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.DELIVERED]: [], // Final state
  [ORDER_STATUS.CANCELLED]: [], // Final state
  [ORDER_STATUS.RETURNED]: [], // Final state
  [ORDER_STATUS.RETURN_PENDING]: [ORDER_STATUS.RETURNED, ORDER_STATUS.DELIVERED]
}

// Status Display Names
const ORDER_STATUS_DISPLAY = {
  [ORDER_STATUS.PENDING]: 'Pending',
  [ORDER_STATUS.SHIPPED]: 'Shipped',
  [ORDER_STATUS.OUT_FOR_DELIVERY]: 'Out for Delivery',
  [ORDER_STATUS.DELIVERED]: 'Delivered',
  [ORDER_STATUS.CANCELLED]: 'Cancelled',
  [ORDER_STATUS.RETURNED]: 'Returned',
  [ORDER_STATUS.RETURN_PENDING]: 'Return Pending'
}

// Status Icons
const ORDER_STATUS_ICONS = {
  [ORDER_STATUS.PENDING]: 'fas fa-clock',
  [ORDER_STATUS.SHIPPED]: 'fas fa-shipping-fast',
  [ORDER_STATUS.OUT_FOR_DELIVERY]: 'fas fa-truck',
  [ORDER_STATUS.DELIVERED]: 'fas fa-check-circle',
  [ORDER_STATUS.CANCELLED]: 'fas fa-times-circle',
  [ORDER_STATUS.RETURNED]: 'fas fa-undo',
  [ORDER_STATUS.RETURN_PENDING]: 'fas fa-hourglass-half'
}

// Status Colors
const ORDER_STATUS_COLORS = {
  [ORDER_STATUS.PENDING]: '#ffc107',
  [ORDER_STATUS.SHIPPED]: '#17a2b8',
  [ORDER_STATUS.OUT_FOR_DELIVERY]: '#fd7e14',
  [ORDER_STATUS.DELIVERED]: '#28a745',
  [ORDER_STATUS.CANCELLED]: '#dc3545',
  [ORDER_STATUS.RETURNED]: '#6f42c1',
  [ORDER_STATUS.RETURN_PENDING]: '#6c757d'
}

module.exports = {
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  TRANSACTION_STATUS,
  USER_STATUS,
  PRODUCT_STATUS,
  COUPON_STATUS,
  RETURN_STATUS,
  ORDER_STATUS_HIERARCHY,
  VALID_STATUS_TRANSITIONS,
  ORDER_STATUS_DISPLAY,
  ORDER_STATUS_ICONS,
  ORDER_STATUS_COLORS
}
