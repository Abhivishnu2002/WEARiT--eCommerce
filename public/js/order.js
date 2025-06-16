document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("toastContainer")) {
    const toastContainer = document.createElement("div")
    toastContainer.id = "toastContainer"
    toastContainer.className = "toast-container position-fixed bottom-0 end-0 p-3"
    document.body.appendChild(toastContainer)
  }

  const bootstrap = window.bootstrap

  function showToast(message, type = "success") {
    const toastContainer = document.getElementById("toastContainer")
    const toastId = `toast-${Date.now()}`

    const toastHTML = `
      <div id="${toastId}" class="toast align-items-center text-white bg-${type === "success" ? "success" : "danger"}" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">
            ${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `

    toastContainer.insertAdjacentHTML("beforeend", toastHTML)
    const toastElement = document.getElementById(toastId)
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 })
    toast.show()

    toastElement.addEventListener("hidden.bs.toast", () => {
      toastElement.remove()
    })
  }
  const reorderButtons = document.querySelectorAll(".reorder-btn")
  if (reorderButtons.length > 0) {
    reorderButtons.forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.preventDefault()
        const orderId = this.getAttribute("data-order-id")
        this.disabled = true
        const originalText = this.innerHTML
        this.innerHTML =
          '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...'

        fetch(`/orders/reorder/${orderId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then((response) => response.json())
          .then((data) => {
            this.disabled = false
            this.innerHTML = originalText

            if (data.success) {
              showToast("Products added to cart successfully", "success")
              const cartCountElement = document.querySelector(".cart-count")
              if (cartCountElement && data.cartCount) {
                cartCountElement.textContent = data.cartCount
              }
            } else {
              showToast(data.message || "Failed to add products to cart", "danger")
            }
          })
          .catch((error) => {
            this.disabled = false
            this.innerHTML = originalText
            showToast("An error occurred. Please try again.", "danger")
          })
      })
    })
  }
  const retryPaymentButtons = document.querySelectorAll(".retry-payment-btn")
  if (retryPaymentButtons.length > 0) {
    retryPaymentButtons.forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.preventDefault()
        const orderId = this.getAttribute("data-order-id")

        const retryModal = document.createElement("div")
        retryModal.innerHTML = `
          <div class="modal fade" tabindex="-1">
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">Retry Payment</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <p>Choose a payment method to complete your order:</p>
                  <div class="payment-options">
                    <div class="form-check mb-3">
                      <input class="form-check-input" type="radio" name="paymentMethod" id="razorpay" value="razorpay" checked>
                      <label class="form-check-label" for="razorpay">
                        <i class="fas fa-credit-card me-2"></i> Credit/Debit Card, UPI, Net Banking
                      </label>
                    </div>
                    <div class="form-check mb-3">
                      <input class="form-check-input" type="radio" name="paymentMethod" id="paypal" value="paypal">
                      <label class="form-check-label" for="paypal">
                        <i class="fab fa-paypal me-2"></i> PayPal
                      </label>
                    </div>
                    <div class="form-check mb-3">
                      <input class="form-check-input" type="radio" name="paymentMethod" id="wallet" value="wallet">
                      <label class="form-check-label" for="wallet">
                        <i class="fas fa-wallet me-2"></i> Wallet
                      </label>
                    </div>
                    <div class="form-check mb-3">
                      <input class="form-check-input" type="radio" name="paymentMethod" id="cod" value="COD">
                      <label class="form-check-label" for="cod">
                        <i class="fas fa-money-bill-wave me-2"></i> Cash on Delivery
                      </label>
                    </div>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                  <button type="button" class="btn btn-dark confirm-retry">Proceed to Payment</button>
                </div>
              </div>
            </div>
          </div>
        `

        document.body.appendChild(retryModal)
        const modalElement = retryModal.querySelector(".modal")
        const modal = new bootstrap.Modal(modalElement)
        modal.show()

        const confirmRetryBtn = retryModal.querySelector(".confirm-retry")
        confirmRetryBtn.addEventListener("click", function () {
          const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value

          this.disabled = true
          this.innerHTML =
            '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...'

          fetch(`/order/retry-payment/${orderId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ paymentMethod }),
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.success) {
                if (paymentMethod === 'razorpay' && data.razorpayOrderId) {
                  // Handle Razorpay payment
                  modal.hide()
                  handleRazorpayPayment(data, orderId)
                } else {
                  window.location.href = data.redirect
                }
              } else {
                this.disabled = false
                this.innerHTML = "Proceed to Payment"
                showToast(data.message || "Failed to process payment", "danger")
              }
            })
            .catch((error) => {
              this.disabled = false
              this.innerHTML = "Proceed to Payment"
              showToast("An error occurred. Please try again.", "danger")
            })
        })

        modalElement.addEventListener("hidden.bs.modal", () => {
          setTimeout(() => {
            retryModal.remove()
          }, 300)
        })
      })
    })
  }
  const returnButtons = document.querySelectorAll(".return-btn")
  if (returnButtons.length > 0) {
    returnButtons.forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.preventDefault()
        const orderId = this.getAttribute("data-order-id")

        const returnModal = document.createElement("div")
        returnModal.innerHTML = `
          <div class="modal fade" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content border-0 shadow">
                <div class="modal-header bg-warning text-dark">
                  <h5 class="modal-title">
                    <i class="fas fa-undo me-2"></i>
                    Return Order
                  </h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <div class="alert alert-info d-flex align-items-center" role="alert">
                    <i class="fas fa-info-circle me-2"></i>
                    <div>
                      <strong>Return Policy:</strong> Returns are accepted within 7 days of delivery.
                    </div>
                  </div>
                  <p>Please provide a reason for returning this order. Our team will review your request.</p>
                  <div class="mb-3">
                    <label for="returnOrderReason" class="form-label">
                      Reason for return <span class="text-danger">*</span>
                    </label>
                    <select class="form-select mb-2" id="returnReasonSelect">
                      <option value="">Select a reason</option>
                      <option value="defective">Product is defective/damaged</option>
                      <option value="wrong-item">Wrong item received</option>
                      <option value="size-issue">Size doesn't fit</option>
                      <option value="quality">Quality not as expected</option>
                      <option value="not-as-described">Not as described</option>
                      <option value="other">Other (please specify)</option>
                    </select>
                    <textarea 
                      class="form-control" 
                      id="returnOrderReason" 
                      rows="3" 
                      placeholder="Please provide detailed reason for return"
                      required
                      maxlength="500"
                    ></textarea>
                    <div class="invalid-feedback">
                      Please provide a reason for return.
                    </div>
                    <div class="form-text">
                      <span id="returnCharCount">0</span>/500 characters
                    </div>
                  </div>
                  <div class="alert alert-warning d-flex align-items-start" role="alert">
                    <i class="fas fa-clock me-2 mt-1"></i>
                    <div>
                      <strong>What happens next:</strong>
                      <ul class="mb-0 mt-1">
                        <li>Return request will be submitted for review</li>
                        <li>Our team will contact you within 24 hours</li>
                        <li>Refund will be processed after quality check</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times me-1"></i>Cancel
                  </button>
                  <button type="button" class="btn btn-warning confirm-return-order">
                    <i class="fas fa-paper-plane me-1"></i>Submit Return Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        `

        document.body.appendChild(returnModal)
        const modalElement = returnModal.querySelector(".modal")
        const modal = new bootstrap.Modal(modalElement)
        modal.show()
        const reasonSelect = returnModal.querySelector("#returnReasonSelect")
        const reasonTextarea = returnModal.querySelector("#returnOrderReason")
        const charCount = returnModal.querySelector("#returnCharCount")

        reasonSelect.addEventListener("change", function () {
          if (this.value && this.value !== "other") {
            reasonTextarea.value = this.options[this.selectedIndex].text
            charCount.textContent = reasonTextarea.value.length
          } else if (this.value === "other") {
            reasonTextarea.value = ""
            reasonTextarea.focus()
          }
        })

        reasonTextarea.addEventListener("input", function () {
          charCount.textContent = this.value.length
          if (this.value.trim()) {
            this.classList.remove("is-invalid")
          }
          if (this.value.length > 450) {
            charCount.style.color = "#dc3545"
          } else {
            charCount.style.color = "#6c757d"
          }
        })
        const confirmReturnBtn = returnModal.querySelector(".confirm-return-order")
        confirmReturnBtn.addEventListener("click", function () {
          const reason = reasonTextarea.value.trim()

          if (!reason) {
            reasonTextarea.classList.add("is-invalid")
            reasonTextarea.focus()
            return
          }

          this.disabled = true
          this.innerHTML =
            '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...'

          fetch(`/orders/return/${orderId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Requested-With": "XMLHttpRequest",
            },
            body: JSON.stringify({ reason }),
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.success) {
                modal.hide()
                showToast("Return request submitted successfully! We'll review it within 24 hours.", "success")
                setTimeout(() => {
                  window.location.reload()
                }, 2000)
              } else {
                this.disabled = false
                this.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Submit Return Request'
                showToast(data.message || "Failed to submit return request", "danger")
              }
            })
            .catch((error) => {
              this.disabled = false
              this.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Submit Return Request'
              showToast("An error occurred. Please try again.", "danger")
            })
        })

        modalElement.addEventListener("hidden.bs.modal", () => {
          setTimeout(() => {
            returnModal.remove()
          }, 300)
        })
      })
    })
  }
  const cancelButtons = document.querySelectorAll(".cancel-btn")
  if (cancelButtons.length > 0) {
    cancelButtons.forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.preventDefault()
        const orderId = this.getAttribute("data-order-id")

        const cancelModal = document.createElement("div")
        cancelModal.innerHTML = `
          <div class="modal fade" tabindex="-1">
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">Cancel Order</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <p>Are you sure you want to cancel this order?</p>
                  <div class="mb-3">
                    <label for="cancellationReason" class="form-label">Reason for cancellation (optional)</label>
                    <textarea class="form-control" id="cancellationReason" rows="3" placeholder="Please provide a reason for cancellation"></textarea>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                  <button type="button" class="btn btn-danger confirm-cancel">Yes, cancel it!</button>
                </div>
              </div>
            </div>
          </div>
        `

        document.body.appendChild(cancelModal)
        const modalElement = cancelModal.querySelector(".modal")
        const modal = new bootstrap.Modal(modalElement)
        modal.show()

        const confirmCancelBtn = cancelModal.querySelector(".confirm-cancel")
        confirmCancelBtn.addEventListener("click", function () {
          const reason = document.getElementById("cancellationReason").value

          this.disabled = true
          this.innerHTML =
            '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...'

          fetch(`/orders/cancel/${orderId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reason }),
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.success) {
                modal.hide()
                showToast("Order cancelled successfully", "success")
                setTimeout(() => {
                  window.location.reload()
                }, 1500)
              } else {
                this.disabled = false
                this.innerHTML = "Yes, cancel it!"
                showToast(data.message || "Failed to cancel order", "danger")
              }
            })
            .catch((error) => {
              this.disabled = false
              this.innerHTML = "Yes, cancel it!"
              showToast("An error occurred. Please try again.", "danger")
            })
        })

        modalElement.addEventListener("hidden.bs.modal", () => {
          setTimeout(() => {
            cancelModal.remove()
          }, 300)
        })
      })
    })
  }

  function handleRazorpayPayment(data, orderId) {
    if (typeof Razorpay === 'undefined') {
      showToast("Razorpay is not loaded. Please refresh the page and try again.", "danger")
      return
    }

    const options = {
      key: data.key,
      amount: data.amount,
      currency: data.currency,
      name: data.name,
      description: data.description,
      order_id: data.razorpayOrderId,
      prefill: data.prefill,
      theme: data.theme,
      handler: async (response) => {
        try {
          showToast("Verifying your payment...", "info")

          const verifyResponse = await fetch('/payment/razorpay/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              orderId: orderId
            })
          })

          if (!verifyResponse.ok) {
            const errorText = await verifyResponse.text()
            throw new Error(`HTTP ${verifyResponse.status}: ${errorText}`)
          }

          const verifyData = await verifyResponse.json()
          if (verifyData.success) {
            showToast("Payment successful! Redirecting...", "success")
            setTimeout(() => {
              window.location.href = verifyData.redirectUrl || `/order-success/${orderId}`
            }, 1500)
          } else {
            throw new Error(verifyData.message || 'Payment verification failed')
          }
        } catch (error) {
          showToast(error.message || "Payment verification failed. Please contact support.", "danger")
          setTimeout(() => {
            window.location.href = `/order-failure/${orderId}`
          }, 3000)
        }
      },
      modal: {
        ondismiss: () => {
          showToast("Payment cancelled", "warning")
        }
      }
    }

    const rzp = new Razorpay(options)
    rzp.on('payment.failed', (response) => {
      showToast(`Payment failed: ${response.error.description}`, "danger")
      setTimeout(() => {
        window.location.href = `/order-failure/${orderId}`
      }, 3000)
    })

    rzp.open()
  }
})
