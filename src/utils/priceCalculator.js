class PriceCalculator {
  constructor() {
    this.SHIPPING_THRESHOLD = 1000
    this.SHIPPING_CHARGE = 200
    this.COD_MAXIMUM = 1000
  }
  calculateOrderTotals(products, coupon = null) {
    let regularTotal = 0
    let saleTotal = 0
    let totalDiscount = 0
    products.forEach((item) => {
      const varientPrice = Number(item.variant?.varientPrice) || 0
      const salePrice = Number(item.variant?.salePrice) || 0
      const quantity = Number(item.quantity) || 0
      const regularItemTotal = varientPrice * quantity
      const saleItemTotal = salePrice * quantity
      const itemDiscount = regularItemTotal - saleItemTotal
      regularTotal += regularItemTotal
      saleTotal += saleItemTotal
      totalDiscount += itemDiscount
    })
    const shippingCharge = saleTotal >= this.SHIPPING_THRESHOLD ? 0 : this.SHIPPING_CHARGE
    let couponDiscount = 0
    if (coupon && coupon.discountAmount > 0) {
      couponDiscount = Number(coupon.discountAmount) || 0
    }
    const finalAmount = Math.max(0, saleTotal - couponDiscount + shippingCharge)

    return {
      regularTotal: Math.round(regularTotal * 100) / 100,
      saleTotal: Math.round(saleTotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      couponDiscount: Math.round(couponDiscount * 100) / 100,
      shippingCharge: Math.round(shippingCharge * 100) / 100,
      finalAmount: Math.round(finalAmount * 100) / 100,
      canUseCOD: saleTotal < this.COD_MAXIMUM,
    }
  }
  calculateRefundAmount(products, originalOrder) {
    let refundAmount = 0
    products.forEach((item) => {
      const salePrice = Number(item.variant?.salePrice) || 0
      const quantity = Number(item.quantity) || 0
      refundAmount += salePrice * quantity
    })
    if (originalOrder.coupon && originalOrder.coupon.discountAmount > 0) {
      const originalOrderTotal = originalOrder.totalAmount || 0
      const couponDiscount = Number(originalOrder.coupon.discountAmount) || 0

      if (originalOrderTotal > 0) {
        const proportionalCouponDiscount = (refundAmount / originalOrderTotal) * couponDiscount
        refundAmount -= proportionalCouponDiscount
      }
    }

    return Math.max(0, Math.round(refundAmount * 100) / 100)
  }
  recalculateOrderTotals(order) {
    const activeProducts = order.products.filter((p) => p.status !== "cancelled" && p.status !== "returned")

    if (activeProducts.length === 0) {
      return {
        totalAmount: 0,
        discount: 0,
        finalAmount: 0,
        shippingCharge: 0,
      }
    }

    const totals = this.calculateOrderTotals(activeProducts, order.coupon)

    return {
      totalAmount: totals.saleTotal,
      discount: totals.totalDiscount,
      finalAmount: totals.finalAmount,
      shippingCharge: totals.shippingCharge,
    }
  }
  validatePaymentMethod(paymentMethod, orderTotal) {
    if (paymentMethod === "COD" && orderTotal >= this.COD_MAXIMUM) {
      return {
        valid: false,
        message: `Cash on Delivery is only available for orders under ₹${this.COD_MAXIMUM}`,
      }
    }

    return { valid: true }
  }
  calculateCheckoutTotals(products, couponDiscount = 0) {
    let subtotal = 0
    let totalDiscount = 0

    products.forEach((item) => {
      const variant = item.product ? item.product.variants.find((v) => v.size === item.size) : item.variant

      if (variant) {
        const itemTotal = variant.varientPrice * item.quantity
        const discountAmount = (variant.varientPrice - variant.salePrice) * item.quantity

        subtotal += itemTotal
        totalDiscount += discountAmount
      }
    })
    const saleTotal = subtotal - totalDiscount
    const shippingCharge = saleTotal >= this.SHIPPING_THRESHOLD ? 0 : this.SHIPPING_CHARGE
    const finalAmount = saleTotal - couponDiscount + shippingCharge

    return {
      subtotal,
      totalDiscount,
      saleTotal,
      shippingCharge,
      finalAmount: Math.max(0, finalAmount),
      canUseCOD: saleTotal < this.COD_MAXIMUM,
    }
  }

  calculateOrderDetailsTotals(order) {
    let regularTotal = 0
    let discountTotal = 0
    let saleTotal = 0

    order.products.forEach((product) => {
      if (product.status !== "cancelled" && product.status !== "returned") {
        const regularPrice = (Number(product.variant?.varientPrice) || 0) * (Number(product.quantity) || 0)
        const salePrice = (Number(product.variant?.salePrice) || 0) * (Number(product.quantity) || 0)
        regularTotal += regularPrice
        discountTotal += regularPrice - salePrice
        saleTotal += salePrice
      }
    })

    const shippingCharge = saleTotal >= this.SHIPPING_THRESHOLD ? 0 : this.SHIPPING_CHARGE
    const couponDiscount = Number(order.coupon?.discountAmount) || 0
    const grandTotal = saleTotal - couponDiscount + shippingCharge

    return {
      regularTotal: Math.round(regularTotal * 100) / 100,
      itemsTotal: Math.round(saleTotal * 100) / 100,
      discount: Math.round(discountTotal * 100) / 100,
      couponDiscount: Math.round(couponDiscount * 100) / 100,
      shippingCharge: Math.round(shippingCharge * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
    }
  }

  static calculateInvoiceTotals(order, validProducts = null) {
    try {
      const products = validProducts || order.products.filter((item) => item.status !== "cancelled" && item.status !== "returned")
      let subtotal = 0
      let productDiscount = 0
      products.forEach((item) => {
        const regularPrice = (Number(item.variant?.varientPrice) || 0) * (Number(item.quantity) || 0)
        const salePrice = (Number(item.variant?.salePrice) || 0) * (Number(item.quantity) || 0)

        subtotal += regularPrice
        productDiscount += regularPrice - salePrice
      })
      const saleTotal = subtotal - productDiscount
      const shippingCharge = saleTotal >= 1000 ? 0 : 200
      const couponDiscount = Number(order.coupon?.discountAmount) || 0
      const finalAmount = saleTotal + shippingCharge - couponDiscount

      return {
        subtotal: Math.round(subtotal * 100) / 100,
        productDiscount: Math.round(productDiscount * 100) / 100,
        saleTotal: Math.round(saleTotal * 100) / 100,
        shippingCharge: Math.round(shippingCharge * 100) / 100,
        couponDiscount: Math.round(couponDiscount * 100) / 100,
        finalAmount: Math.max(0, Math.round(finalAmount * 100) / 100),
        productCount: products.length,
        totalQuantity: products.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
      }
    } catch (error) {
      console.error("[PRICE_CALCULATOR] Error calculating invoice totals:", error)
      return {
        subtotal: 0,
        productDiscount: 0,
        saleTotal: 0,
        shippingCharge: 0,
        couponDiscount: 0,
        finalAmount: 0,
        productCount: 0,
        totalQuantity: 0,
      }
    }
  }
}

module.exports = PriceCalculator
