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
      originallyRequiredShipping: saleTotal < this.SHIPPING_THRESHOLD,
    }
  }
  calculateOrderDetailsTotals(order) {
    let regularTotal = 0
    let discountTotal = 0
    let saleTotal = 0
    const activeProducts = order.products.filter(
      (product) => product.status !== "cancelled" && product.status !== "returned",
    )

    activeProducts.forEach((product) => {
      const regularPrice = (Number(product.variant?.varientPrice) || 0) * (Number(product.quantity) || 0)
      const salePrice = (Number(product.variant?.salePrice) || 0) * (Number(product.quantity) || 0)
      regularTotal += regularPrice
      discountTotal += regularPrice - salePrice
      saleTotal += salePrice
    })
    let shippingCharge = 0
    const originalOrderTotal = this.calculateOriginalOrderTotal(order.products)
    const originallyRequiredShipping = originalOrderTotal < this.SHIPPING_THRESHOLD

    if (originallyRequiredShipping && activeProducts.length > 0) {
      if (saleTotal >= this.SHIPPING_THRESHOLD) {
        shippingCharge = 0
      } else {
        shippingCharge = this.SHIPPING_CHARGE 
      }
    }
    let remainingCouponDiscount = 0
    if (order.coupon && order.coupon.discountAmount > 0) {
      const originalCouponDiscount = Number(order.coupon.discountAmount) || 0
      const originalOrderTotal = this.calculateOriginalOrderTotal(order.products)

      if (originalOrderTotal > 0 && activeProducts.length > 0) {
        const activeProductsTotal = saleTotal
        const proportionOfActiveProducts = activeProductsTotal / originalOrderTotal
        remainingCouponDiscount = originalCouponDiscount * proportionOfActiveProducts
      }
    }

    const grandTotal = saleTotal - remainingCouponDiscount + shippingCharge

    return {
      regularTotal: Math.round(regularTotal * 100) / 100,
      itemsTotal: Math.round(saleTotal * 100) / 100,
      discount: Math.round(discountTotal * 100) / 100,
      couponDiscount: Math.round(remainingCouponDiscount * 100) / 100,
      shippingCharge: Math.round(shippingCharge * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      activeProductsCount: activeProducts.length,
      originallyRequiredShipping: originallyRequiredShipping,
    }
  }
  calculateOriginalOrderTotal(allProducts) {
    let originalTotal = 0
    allProducts.forEach((product) => {
      const salePrice = (Number(product.variant?.salePrice) || 0) * (Number(product.quantity) || 0)
      originalTotal += salePrice
    })
    return originalTotal
  }
  calculateRefundAmount(products, originalOrder) {
    let refundAmount = 0
    products.forEach((item) => {
      const salePrice = Number(item.variant?.salePrice) || 0
      const quantity = Number(item.quantity) || 0
      refundAmount += salePrice * quantity
    })
    if (originalOrder.coupon && originalOrder.coupon.discountAmount > 0) {
      const originalOrderTotal = this.calculateOriginalOrderTotal(originalOrder.products)
      const originalCouponDiscount = Number(originalOrder.coupon.discountAmount) || 0

      if (originalOrderTotal > 0) {
        const refundedProductsTotal = refundAmount
        const proportionOfRefundedProducts = refundedProductsTotal / originalOrderTotal
        const proportionalCouponDiscount = originalCouponDiscount * proportionOfRefundedProducts
        refundAmount -= proportionalCouponDiscount
      }
    }
    const shippingRefund = this.calculateShippingRefund(products, originalOrder)
    refundAmount += shippingRefund

    return Math.max(0, Math.round(refundAmount * 100) / 100)
  }
  calculateShippingRefund(cancelledProducts, originalOrder) {
    const originalOrderTotal = this.calculateOriginalOrderTotal(originalOrder.products)
    const originallyRequiredShipping = originalOrderTotal < this.SHIPPING_THRESHOLD

    if (!originallyRequiredShipping) {
      return 0
    }
    const activeProducts = originalOrder.products.filter(
      (product) =>
        !cancelledProducts.some((cancelled) => cancelled._id.toString() === product._id.toString()) &&
        product.status !== "cancelled" &&
        product.status !== "returned",
    )

    let remainingTotal = 0
    activeProducts.forEach((product) => {
      const salePrice = (Number(product.variant?.salePrice) || 0) * (Number(product.quantity) || 0)
      remainingTotal += salePrice
    })
    if (activeProducts.length === 0) {
      return this.SHIPPING_CHARGE
    }
    if (remainingTotal >= this.SHIPPING_THRESHOLD) {
      return this.SHIPPING_CHARGE
    }
    return 0
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
    const calculatedTotals = this.calculateOrderDetailsTotals(order)

    return {
      totalAmount: calculatedTotals.itemsTotal,
      discount: calculatedTotals.discount,
      finalAmount: calculatedTotals.grandTotal,
      shippingCharge: calculatedTotals.shippingCharge,
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
  static calculateInvoiceTotals(order, validProducts = null) {
    try {
      const products =
        validProducts || order.products.filter((item) => item.status !== "cancelled" && item.status !== "returned")

      let subtotal = 0
      let productDiscount = 0
      products.forEach((item) => {
        const regularPrice = (Number(item.variant?.varientPrice) || 0) * (Number(item.quantity) || 0)
        const salePrice = (Number(item.variant?.salePrice) || 0) * (Number(item.quantity) || 0)

        subtotal += regularPrice
        productDiscount += regularPrice - salePrice
      })

      const saleTotal = subtotal - productDiscount
      const calculator = new PriceCalculator()
      const originalOrderTotal = calculator.calculateOriginalOrderTotal(order.products)
      const originallyRequiredShipping = originalOrderTotal < calculator.SHIPPING_THRESHOLD

      let shippingCharge = 0
      if (originallyRequiredShipping && products.length > 0) {
        shippingCharge = saleTotal >= calculator.SHIPPING_THRESHOLD ? 0 : calculator.SHIPPING_CHARGE
      }
      let couponDiscount = 0
      if (order.coupon && order.coupon.discountAmount > 0) {
        const originalCouponDiscount = Number(order.coupon.discountAmount) || 0

        if (originalOrderTotal > 0 && products.length > 0) {
          const invoiceProductsTotal = saleTotal
          const proportionOfInvoiceProducts = invoiceProductsTotal / originalOrderTotal
          couponDiscount = originalCouponDiscount * proportionOfInvoiceProducts
        }
      }
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
  calculateRefundBreakdown(products, originalOrder) {
    let productRefundAmount = 0
    let appliedCouponDiscount = 0
    let shippingRefund = 0
    products.forEach((item) => {
      const salePrice = Number(item.variant?.salePrice) || 0
      const quantity = Number(item.quantity) || 0
      productRefundAmount += salePrice * quantity
    })
    if (originalOrder.coupon && originalOrder.coupon.discountAmount > 0) {
      const originalOrderTotal = this.calculateOriginalOrderTotal(originalOrder.products)
      const originalCouponDiscount = Number(originalOrder.coupon.discountAmount) || 0

      if (originalOrderTotal > 0) {
        const proportionOfRefundedProducts = productRefundAmount / originalOrderTotal
        appliedCouponDiscount = originalCouponDiscount * proportionOfRefundedProducts
      }
    }
    shippingRefund = this.calculateShippingRefund(products, originalOrder)
    const netRefundAmount = productRefundAmount - appliedCouponDiscount + shippingRefund

    return {
      productRefundAmount: Math.round(productRefundAmount * 100) / 100,
      appliedCouponDiscount: Math.round(appliedCouponDiscount * 100) / 100,
      shippingRefund: Math.round(shippingRefund * 100) / 100,
      netRefundAmount: Math.max(0, Math.round(netRefundAmount * 100) / 100),
      breakdown: {
        message: `Product Value: ₹${Math.round(productRefundAmount * 100) / 100}${appliedCouponDiscount > 0 ? ` - Coupon Discount: ₹${Math.round(appliedCouponDiscount * 100) / 100}` : ""}${shippingRefund > 0 ? ` + Shipping Refund: ₹${Math.round(shippingRefund * 100) / 100}` : ""} = Net Refund: ₹${Math.max(0, Math.round(netRefundAmount * 100) / 100)}`,
      },
    }
  }
}

module.exports = PriceCalculator
