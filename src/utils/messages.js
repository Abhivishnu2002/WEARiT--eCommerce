
const ORDER_STATUS_MESSAGES = {
  TRANSITION_ERROR: {
    INVALID: (currentStatus, newStatus) => 
      `Cannot change status from "${currentStatus}" to "${newStatus}". You can only move forward in the order process.`,
    FINAL_STATE: (status) => 
      `Cannot change status from "${status}". ${status.charAt(0).toUpperCase() + status.slice(1)} orders are final.`,
    USE_RETURN_PROCESS: 'Cannot change status from "delivered". Use the return process to handle returns.'
  },
  UPDATE_SUCCESS: {
    STATUS_UPDATED: 'Order status updated successfully',
    PRODUCT_STATUS_UPDATED: 'Product status updated successfully',
    BULK_UPDATE: 'Multiple orders updated successfully'
  },
  TRACKING_UPDATES: {
    ORDER_SHIPPED: 'Your order has been shipped and is on its way!',
    OUT_FOR_DELIVERY: 'Your order is out for delivery and will arrive soon!',
    ORDER_DELIVERED: 'Your order has been delivered successfully!',
    ORDER_CANCELLED: 'Your order has been cancelled.',
    ORDER_RETURNED: 'All items in this order have been returned.',
    PARTIAL_RETURN: 'Some items in this order have been returned.'
  }
}
const PAYMENT_MESSAGES = {
  SUCCESS: {
    PAYMENT_COMPLETED: 'Payment completed successfully',
    REFUND_PROCESSED: 'Refund has been processed successfully',
    WALLET_CREDITED: 'Amount has been credited to your wallet'
  },
  ERROR: {
    PAYMENT_FAILED: 'Payment failed. Please try again.',
    INSUFFICIENT_FUNDS: 'Insufficient funds in wallet',
    INVALID_PAYMENT_METHOD: 'Invalid payment method selected',
    PAYMENT_TIMEOUT: 'Payment timeout. Please try again.'
  },
  COD: {
    ORDER_PLACED: 'Order placed successfully. Pay on delivery.',
    PAYMENT_COMPLETED_ON_DELIVERY: 'Payment completed on delivery'
  }
}
const INVOICE_MESSAGES = {
  AVAILABILITY: {
    NOT_AVAILABLE: 'Invoice is not available for this order',
    FAILED_PAYMENT: 'Invoice is not available for failed payments',
    PENDING_PAYMENT: 'Invoice is only available after payment is completed',
    COD_AFTER_DELIVERY: 'Invoice for COD orders is only available after delivery',
    PAYMENT_COMPLETED: 'Invoice is only available after payment is completed'
  },
  DOWNLOAD: {
    SUCCESS: 'Invoice downloaded successfully',
    ERROR: 'Failed to generate invoice. Please try again.',
    GENERATING: 'Generating invoice...'
  }
}
const USER_MESSAGES = {
  AUTH: {
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    REGISTRATION_SUCCESS: 'Registration successful',
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCOUNT_BLOCKED: 'Your account has been blocked. Please contact support.',
    EMAIL_ALREADY_EXISTS: 'Email already exists'
  },
  PROFILE: {
    UPDATE_SUCCESS: 'Profile updated successfully',
    PASSWORD_CHANGED: 'Password changed successfully',
    INVALID_CURRENT_PASSWORD: 'Current password is incorrect'
  }
}
const ADDRESS_MESSAGES = {
  SUCCESS: {
    ADDED: 'Address added successfully',
    UPDATED: 'Address updated successfully',
    DELETED: 'Address deleted successfully',
    DEFAULT_SET: 'Default address updated successfully'
  },
  ERROR: {
    NOT_FOUND: 'Address not found',
    DELETE_DEFAULT: 'Cannot delete default address. Set another address as default first.',
    INVALID_DATA: 'Please provide valid address information',
    REQUIRED_FIELDS: 'Please fill in all required fields'
  },
  VALIDATION: {
    NAME_REQUIRED: 'Name is required',
    MOBILE_REQUIRED: 'Mobile number is required',
    MOBILE_INVALID: 'Please enter a valid 10-digit mobile number',
    ADDRESS_REQUIRED: 'Address is required',
    CITY_REQUIRED: 'City is required',
    STATE_REQUIRED: 'State is required',
    PINCODE_REQUIRED: 'PIN code is required',
    PINCODE_INVALID: 'Please enter a valid 6-digit PIN code'
  }
}
const PRODUCT_MESSAGES = {
  STOCK: {
    OUT_OF_STOCK: 'This product is currently out of stock',
    LOW_STOCK: (quantity) => `Only ${quantity} items left in stock`,
    INSUFFICIENT_STOCK: (available) => `Only ${available} items available`,
    STOCK_UPDATED: 'Stock updated successfully'
  },
  CART: {
    ADDED: 'Product added to cart',
    UPDATED: 'Cart updated successfully',
    REMOVED: 'Product removed from cart',
    CLEARED: 'Cart cleared successfully',
    EMPTY: 'Your cart is empty'
  },
  WISHLIST: {
    ADDED: 'Product added to wishlist',
    REMOVED: 'Product removed from wishlist',
    MOVED_TO_CART: 'Product moved to cart'
  }
}
const COUPON_MESSAGES = {
  SUCCESS: {
    APPLIED: 'Coupon applied successfully',
    REMOVED: 'Coupon removed successfully'
  },
  ERROR: {
    INVALID: 'Invalid coupon code',
    EXPIRED: 'This coupon has expired',
    NOT_APPLICABLE: 'This coupon is not applicable to your order',
    MINIMUM_AMOUNT: (amount) => `Minimum order amount of ₹${amount} required for this coupon`,
    ALREADY_USED: 'This coupon has already been used',
    USER_LIMIT_EXCEEDED: 'You have exceeded the usage limit for this coupon'
  }
}
const RETURN_MESSAGES = {
  SUCCESS: {
    REQUEST_SUBMITTED: 'Return request submitted successfully',
    REQUEST_APPROVED: 'Return request approved',
    REQUEST_REJECTED: 'Return request rejected',
    RETURN_COMPLETED: 'Return completed successfully'
  },
  ERROR: {
    INVALID_PRODUCT: 'Invalid product for return',
    RETURN_WINDOW_EXPIRED: 'Return window has expired for this product',
    ALREADY_RETURNED: 'This product has already been returned',
    CANNOT_RETURN: 'This product cannot be returned'
  }
}
const GENERAL_MESSAGES = {
  SUCCESS: {
    OPERATION_COMPLETED: 'Operation completed successfully',
    DATA_SAVED: 'Data saved successfully',
    CHANGES_APPLIED: 'Changes applied successfully'
  },
  ERROR: {
    SOMETHING_WENT_WRONG: 'Something went wrong. Please try again.',
    INVALID_REQUEST: 'Invalid request',
    UNAUTHORIZED: 'You are not authorized to perform this action',
    NOT_FOUND: 'Requested resource not found',
    VALIDATION_ERROR: 'Please check your input and try again'
  },
  LOADING: {
    PLEASE_WAIT: 'Please wait...',
    PROCESSING: 'Processing your request...',
    LOADING: 'Loading...'
  }
}

module.exports = {
  ORDER_STATUS_MESSAGES,
  PAYMENT_MESSAGES,
  INVOICE_MESSAGES,
  USER_MESSAGES,
  ADDRESS_MESSAGES,
  PRODUCT_MESSAGES,
  COUPON_MESSAGES,
  RETURN_MESSAGES,
  GENERAL_MESSAGES
}
