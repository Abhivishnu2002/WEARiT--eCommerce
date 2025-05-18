document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const couponCodeInput = document.getElementById("couponCode")
  const applyCouponBtn = document.getElementById("applyCouponBtn")
  const viewAvailableCoupons = document.getElementById("viewAvailableCoupons")
  const couponsModalElement = document.getElementById("couponsModal")
  const couponsModal = new bootstrap.Modal(couponsModalElement)
  const availableCouponsContainer = document.getElementById("availableCouponsContainer")
  const appliedCouponInfo = document.getElementById("appliedCouponInfo")
  const appliedCouponCode = document.getElementById("appliedCouponCode")
  const appliedCouponDiscount = document.getElementById("appliedCouponDiscount")
  const removeCouponBtn = document.getElementById("removeCouponBtn")
  const couponDiscountRow = document.getElementById("couponDiscountRow")
  const couponDiscountValue = document.getElementById("couponDiscountValue")
  const finalAmountElement = document.getElementById("finalAmount")
  const subtotalElement = document.getElementById("subtotal-value")
  const discountElement = document.getElementById("discount-value")
  const shippingElement = document.getElementById("shipping-value")
  const subtotalAmount = Number.parseFloat(subtotalElement.textContent.replace("₹", ""))
  const productDiscount = Number.parseFloat(discountElement.textContent.replace("-₹", ""))
  const shippingAmount =
    shippingElement.textContent === "Free" ? 0 : Number.parseFloat(shippingElement.textContent.replace("₹", ""))
  let currentCouponDiscount = 0
  let isApplying = false
  const baseTotal = subtotalAmount - productDiscount + shippingAmount
  checkSessionCoupon()
  if (couponCodeInput) {
    couponCodeInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        applyCouponBtn.click()
      }
    })
  }

  if (applyCouponBtn) {
    applyCouponBtn.addEventListener("click", () => {
      if (isApplying) return

      const couponCode = couponCodeInput.value.trim()
      if (couponCode) {
        applyCoupon(couponCode)
      } else {
        showNotification("Please enter a coupon code", "error")
      }
    })
  }

  if (viewAvailableCoupons) {
    viewAvailableCoupons.addEventListener("click", () => {
      fetchAvailableCoupons()
      couponsModal.show()
    })
  }

  if (removeCouponBtn) {
    removeCouponBtn.addEventListener("click", () => {
      removeCoupon()
    })
  }
  function checkSessionCoupon() {
    fetch("/checkout/session-coupon")
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.coupon) {
          displayAppliedCoupon(data.coupon.code, data.coupon.discountAmount)
          updateTotalWithDiscount(data.coupon.discountAmount)
        }
      })
      .catch((error) => {
        console.error("Error checking session coupon:", error)
      })
  }

  function fetchAvailableCoupons() {
    availableCouponsContainer.innerHTML = `
      <div class="loading-coupons">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p>Loading available coupons...</p>
      </div>
    `

    fetch("/checkout/available-coupons")
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.coupons.length > 0) {
          renderAvailableCoupons(data.coupons)
        } else {
          availableCouponsContainer.innerHTML = `
            <div class="text-center py-3">
              <p>No coupons available at the moment.</p>
            </div>
          `
        }
      })
      .catch((error) => {
        console.error("Error fetching coupons:", error)
        availableCouponsContainer.innerHTML = `
          <div class="text-center py-3">
            <p>Failed to load coupons. Please try again.</p>
          </div>
        `
      })
  }

  function renderAvailableCoupons(coupons) {
    let couponsHTML = ""

    coupons.forEach((coupon) => {
      const expiryDate = new Date(coupon.endDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })

      const discountText =
        coupon.discountType === "percentage" ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`

      const minimumPurchaseText =
        coupon.minimumPurchase > 0 ? `Min. Purchase: ₹${coupon.minimumPurchase}` : "No minimum purchase"

      const isEligible = coupon.isEligible
      const eligibilityClass = isEligible ? "" : "disabled"
      const eligibilityText = isEligible
        ? ""
        : `<div class="text-danger mt-1">Minimum purchase of ₹${coupon.minimumPurchase} required</div>`

      couponsHTML += `
        <div class="coupon-card">
          <div class="coupon-header">
            <span class="coupon-code">${coupon.code}</span>
            <span class="coupon-discount">${discountText}</span>
          </div>
          <div class="coupon-desc">${coupon.description || "Get special discount with this coupon"}</div>
          <div class="coupon-details">
            ${minimumPurchaseText}
            ${coupon.maximumDiscount ? `<span> | Max Discount: ₹${coupon.maximumDiscount}</span>` : ""}
            <span class="coupon-expiry">Valid till: ${expiryDate}</span>
            ${eligibilityText}
          </div>
          <div class="coupon-actions">
            <button class="apply-coupon-btn ${eligibilityClass}" data-coupon-code="${coupon.code}" ${!isEligible ? "disabled" : ""}>
              Apply
            </button>
          </div>
          ${
            coupon.remainingUses > 0 && coupon.remainingUses < 3
              ? `<span class="coupon-label">Only ${coupon.remainingUses} uses left</span>`
              : ""
          }
        </div>
      `
    })

    availableCouponsContainer.innerHTML = couponsHTML
    document.querySelectorAll(".apply-coupon-btn:not(.disabled)").forEach((button) => {
      button.addEventListener("click", function () {
        const couponCode = this.getAttribute("data-coupon-code")
        couponsModal.hide()
        applyCoupon(couponCode)
      })
    })
  }

  function applyCoupon(couponCode) {
    if (isApplying) return

    isApplying = true
    applyCouponBtn.disabled = true
    applyCouponBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Applying...`

    fetch("/checkout/apply-coupon", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ couponCode }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          displayAppliedCoupon(data.coupon.code, data.coupon.discountAmount)
          updateTotalWithDiscount(data.coupon.discountAmount)
          showNotification(`Coupon "${data.coupon.code}" applied successfully!`, "success")
          couponCodeInput.value = ""
        } else {
          showNotification(data.message, "error")
        }
      })
      .catch((error) => {
        console.error("Error applying coupon:", error)
        showNotification("Failed to apply coupon. Please try again.", "error")
      })
      .finally(() => {
        isApplying = false
        applyCouponBtn.disabled = false
        applyCouponBtn.innerHTML = "APPLY"
      })
  }

  function removeCoupon() {
    fetch("/checkout/remove-coupon", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          hideAppliedCoupon()
          finalAmountElement.textContent = `₹${baseTotal.toFixed(2)}`
          finalAmountElement.classList.add("highlight-animation")
          setTimeout(() => {
            finalAmountElement.classList.remove("highlight-animation")
          }, 1000)

          showNotification("Coupon removed successfully", "success")
        } else {
          showNotification(data.message, "error")
        }
      })
      .catch((error) => {
        console.error("Error removing coupon:", error)
        showNotification("Failed to remove coupon. Please try again.", "error")
      })
  }

  function displayAppliedCoupon(code, discountAmount) {
    appliedCouponCode.textContent = code
    appliedCouponDiscount.textContent = `-₹${discountAmount.toFixed(2)}`
    appliedCouponInfo.style.display = "flex"

    couponDiscountValue.textContent = `-₹${discountAmount.toFixed(2)}`
    couponDiscountRow.style.display = "flex"

    currentCouponDiscount = discountAmount
    appliedCouponInfo.classList.add("highlight-animation")
    setTimeout(() => {
      appliedCouponInfo.classList.remove("highlight-animation")
    }, 1000)
  }

  function hideAppliedCoupon() {
    appliedCouponInfo.style.display = "none"
    couponDiscountRow.style.display = "none"
    currentCouponDiscount = 0
  }

  function updateTotalWithDiscount(couponDiscount) {
    const newTotal = baseTotal - couponDiscount
    finalAmountElement.textContent = `₹${newTotal.toFixed(2)}`
    finalAmountElement.classList.add("highlight-animation")
    setTimeout(() => {
      finalAmountElement.classList.remove("highlight-animation")
    }, 1000)
  }

  function showNotification(message, type = "info") {
    if (typeof window.showNotification === "function") {
      window.showNotification(message, type)
    } else {
      alert(message)
    }
  }
})
