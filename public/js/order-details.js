document.addEventListener("DOMContentLoaded", () => {
  const bootstrap = window.bootstrap
  if (!document.getElementById("toastContainer")) {
    const toastContainer = document.createElement("div")
    toastContainer.id = "toastContainer"
    toastContainer.className = "toast-container position-fixed bottom-0 end-0 p-3"
    toastContainer.style.zIndex = "1060"
    document.body.appendChild(toastContainer)
  }

  function showToast(message, type = "success", duration = 4000) {
    const toastContainer = document.getElementById("toastContainer")
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const iconClass = type === "success" ? "fa-check-circle" : "fa-exclamation-triangle"
    const bgClass = type === "success" ? "bg-success" : "bg-danger"

    const toastHTML = `
      <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body d-flex align-items-center">
            <i class="fas ${iconClass} me-2"></i>
            ${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `

    toastContainer.insertAdjacentHTML("beforeend", toastHTML)
    const toastElement = document.getElementById(toastId)
    const toast = new bootstrap.Toast(toastElement, {
      autohide: true,
      delay: duration,
      animation: true,
    })
    toast.show()

    toastElement.addEventListener("hidden.bs.toast", () => {
      toastElement.remove()
    })

    return toast
  }

  function setButtonLoading(button, isLoading, originalText = null) {
    if (isLoading) {
      button.disabled = true
      button.dataset.originalText = originalText || button.innerHTML
      button.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processing...'
    } else {
      button.disabled = false
      button.innerHTML = button.dataset.originalText || originalText || button.innerHTML
    }
  }
  const cancelProductBtns = document.querySelectorAll(".cancel-product-btn")
  if (cancelProductBtns.length > 0) {
    cancelProductBtns.forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.preventDefault()

        const orderId = this.getAttribute("data-order-id")
        const productId = this.getAttribute("data-product-id")
        const productName = this.closest(".product-item").querySelector(".product-name")?.textContent || "this product"

        if (!orderId || !productId) {
          showToast("Missing order or product information", "error")
          return
        }

        const confirmModal = document.createElement("div")
        confirmModal.innerHTML = `
          <div class="modal fade" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content border-0 shadow">
                <div class="modal-header bg-danger text-white">
                  <h5 class="modal-title">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Cancel Product
                  </h5>
                  <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <div class="alert alert-warning d-flex align-items-center" role="alert">
                    <i class="fas fa-info-circle me-2"></i>
                    <div>
                      <strong>Product:</strong> ${productName}
                    </div>
                  </div>
                  <p class="mb-3">Are you sure you want to cancel this product? This action cannot be undone.</p>
                  <div class="mb-3">
                    <label for="cancellationReason" class="form-label">
                      Reason for cancellation <span class="text-muted">(optional)</span>
                    </label>
                    <textarea 
                      class="form-control" 
                      id="cancellationReason" 
                      rows="3" 
                      placeholder="Please provide a reason for cancellation (e.g., changed mind, found better price, etc.)"
                      maxlength="500"
                    ></textarea>
                    <div class="form-text">
                      <span id="charCount">0</span>/500 characters
                    </div>
                  </div>
                  <div class="alert alert-info d-flex align-items-start" role="alert">
                    <i class="fas fa-lightbulb me-2 mt-1"></i>
                    <div>
                      <strong>What happens next:</strong>
                      <ul class="mb-0 mt-1">
                        <li>Product will be cancelled immediately</li>
                        <li>Stock will be restored automatically</li>
                        <li>Refund will be processed if payment was made online</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times me-1"></i>Keep Product
                  </button>
                  <button type="button" class="btn btn-danger confirm-cancel">
                    <i class="fas fa-trash me-1"></i>Yes, Cancel Product
                  </button>
                </div>
              </div>
            </div>
          </div>
        `

        document.body.appendChild(confirmModal)
        const modalElement = confirmModal.querySelector(".modal")
        const modal = new bootstrap.Modal(modalElement)
        modal.show()

        const textarea = confirmModal.querySelector("#cancellationReason")
        const charCount = confirmModal.querySelector("#charCount")

        textarea.addEventListener("input", function () {
          charCount.textContent = this.value.length
          if (this.value.length > 450) {
            charCount.style.color = "#dc3545"
          } else {
            charCount.style.color = "#6c757d"
          }
        })

        const confirmBtn = confirmModal.querySelector(".confirm-cancel")
        confirmBtn.addEventListener("click", function () {
          const reason = textarea.value.trim()
          const originalText = this.innerHTML
          setButtonLoading(this, true, originalText)

          fetch(`/orders/cancel-product/${orderId}/${productId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Requested-With": "XMLHttpRequest",
            },
            body: JSON.stringify({ reason }),
          })
            .then(async (response) => {
              const data = await response.json()
              if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`)
              }
              return data
            })
            .then((data) => {
              if (data.success) {
                modal.hide()
                let successMessage = "Product cancelled successfully!"
                if (data.data && data.data.refundAmount && data.data.refundAmount > 0) {
                  successMessage += ` Refund of ₹${data.data.refundAmount.toFixed(2)} will be processed.`
                }
                showToast(successMessage, "success", 5000)
                setTimeout(() => {
                  window.location.reload()
                }, 2000)
              } else {
                throw new Error(data.message || "Failed to cancel product")
              }
            })
            .catch((error) => {
              console.error("Error cancelling product:", error)
              setButtonLoading(this, false, originalText)
              showToast(error.message || "Failed to cancel product. Please try again.", "error", 6000)
            })
        })

        modalElement.addEventListener("hidden.bs.modal", () => {
          setTimeout(() => {
            confirmModal.remove()
          }, 300)
        })
      })
    })
  }

  const returnProductBtns = document.querySelectorAll(".return-product-btn")
  if (returnProductBtns.length > 0) {
    returnProductBtns.forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.preventDefault()

        const orderId = this.getAttribute("data-order-id")
        const productId = this.getAttribute("data-product-id")
        const productName = this.closest(".product-item").querySelector(".product-name")?.textContent || "this product"

        if (!orderId || !productId) {
          showToast("Missing order or product information", "error")
          return
        }

        const confirmModal = document.createElement("div")
        confirmModal.innerHTML = `
          <div class="modal fade" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content border-0 shadow">
                <div class="modal-header bg-warning text-dark">
                  <h5 class="modal-title">
                    <i class="fas fa-undo me-2"></i>
                    Return Product
                  </h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <div class="alert alert-info d-flex align-items-center" role="alert">
                    <i class="fas fa-info-circle me-2"></i>
                    <div>
                      <strong>Product:</strong> ${productName}
                    </div>
                  </div>
                  <p class="mb-3">Please provide a reason for returning this product. Our team will review your request.</p>
                  <div class="mb-3">
                    <label for="returnReason" class="form-label">
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
                      id="returnReason" 
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
                      <strong>Return Policy:</strong>
                      <ul class="mb-0 mt-1">
                        <li>Returns accepted within 7 days of delivery</li>
                        <li>Product must be in original condition</li>
                        <li>Refund will be processed after quality check</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times me-1"></i>Cancel
                  </button>
                  <button type="button" class="btn btn-warning confirm-return">
                    <i class="fas fa-paper-plane me-1"></i>Submit Return Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        `

        document.body.appendChild(confirmModal)
        const modalElement = confirmModal.querySelector(".modal")
        const modal = new bootstrap.Modal(modalElement)
        modal.show()

        const reasonSelect = confirmModal.querySelector("#returnReasonSelect")
        const reasonTextarea = confirmModal.querySelector("#returnReason")
        const charCount = confirmModal.querySelector("#returnCharCount")

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
        })

        const confirmBtn = confirmModal.querySelector(".confirm-return")
        confirmBtn.addEventListener("click", function () {
          const reason = reasonTextarea.value.trim()

          if (!reason) {
            reasonTextarea.classList.add("is-invalid")
            reasonTextarea.focus()
            return
          }

          const originalText = this.innerHTML
          setButtonLoading(this, true, originalText)

          fetch(`/orders/return-product/${orderId}/${productId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Requested-With": "XMLHttpRequest",
            },
            body: JSON.stringify({ reason }),
          })
            .then(async (response) => {
              const data = await response.json()
              if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`)
              }
              return data
            })
            .then((data) => {
              if (data.success) {
                modal.hide()
                showToast("Return request submitted successfully! We'll review it within 24 hours.", "success", 5000)
                setTimeout(() => {
                  window.location.reload()
                }, 2000)
              } else {
                throw new Error(data.message || "Failed to submit return request")
              }
            })
            .catch((error) => {
              console.error("Error submitting return request:", error)
              setButtonLoading(this, false, originalText)
              showToast(error.message || "Failed to submit return request. Please try again.", "error")
            })
        })

        modalElement.addEventListener("hidden.bs.modal", () => {
          setTimeout(() => {
            confirmModal.remove()
          }, 300)
        })
      })
    })
  }
  const cancelOrderBtn = document.querySelector(".cancel-order-btn")
  if (cancelOrderBtn) {
    cancelOrderBtn.addEventListener("click", function (e) {
      e.preventDefault()

      const orderId = this.getAttribute("data-order-id")

      if (!orderId) {
        showToast("Missing order information", "error")
        return
      }

      const confirmModal = document.createElement("div")
      confirmModal.innerHTML = `
        <div class="modal fade" tabindex="-1" data-bs-backdrop="static">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
              <div class="modal-header bg-danger text-white">
                <h5 class="modal-title">
                  <i class="fas fa-exclamation-triangle me-2"></i>
                  Cancel Entire Order
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div class="alert alert-warning" role="alert">
                  <i class="fas fa-exclamation-triangle me-2"></i>
                  <strong>Warning:</strong> This will cancel all products in this order.
                </div>
                <p>Are you sure you want to cancel this entire order? This action cannot be undone.</p>
                <div class="mb-3">
                  <label for="orderCancellationReason" class="form-label">
                    Reason for cancellation <span class="text-muted">(optional)</span>
                  </label>
                  <textarea 
                    class="form-control" 
                    id="orderCancellationReason" 
                    rows="3" 
                    placeholder="Please provide a reason for cancelling the entire order"
                    maxlength="500"
                  ></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                  <i class="fas fa-times me-1"></i>Keep Order
                </button>
                <button type="button" class="btn btn-danger confirm-cancel">
                  <i class="fas fa-trash me-1"></i>Yes, Cancel Order
                </button>
              </div>
            </div>
          </div>
        </div>
      `

      document.body.appendChild(confirmModal)
      const modalElement = confirmModal.querySelector(".modal")
      const modal = new bootstrap.Modal(modalElement)
      modal.show()

      const confirmBtn = confirmModal.querySelector(".confirm-cancel")
      confirmBtn.addEventListener("click", function () {
        const reason = document.getElementById("orderCancellationReason").value.trim()
        const originalText = this.innerHTML

        setButtonLoading(this, true, originalText)

        fetch(`/orders/cancel/${orderId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify({ reason }),
        })
          .then(async (response) => {
            const data = await response.json()
            if (!response.ok) {
              throw new Error(data.message || `HTTP error! status: ${response.status}`)
            }
            return data
          })
          .then((data) => {
            if (data.success) {
              modal.hide()
              showToast("Order cancelled successfully!", "success", 5000)
              setTimeout(() => {
                window.location.reload()
              }, 2000)
            } else {
              throw new Error(data.message || "Failed to cancel order")
            }
          })
          .catch((error) => {
            console.error("Error cancelling order:", error)
            setButtonLoading(this, false, originalText)
            showToast(error.message || "Failed to cancel order. Please try again.", "error")
          })
      })

      modalElement.addEventListener("hidden.bs.modal", () => {
        setTimeout(() => {
          confirmModal.remove()
        }, 300)
      })
    })
  }
  const returnOrderBtn = document.querySelector(".return-order-btn")
  if (returnOrderBtn) {
    returnOrderBtn.addEventListener("click", function (e) {
      e.preventDefault()

      const orderId = this.getAttribute("data-order-id")

      if (!orderId) {
        showToast("Missing order information", "error")
        return
      }

      const confirmModal = document.createElement("div")
      confirmModal.innerHTML = `
        <div class="modal fade" tabindex="-1" data-bs-backdrop="static">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
              <div class="modal-header bg-warning text-dark">
                <h5 class="modal-title">
                  <i class="fas fa-undo me-2"></i>
                  Return Entire Order
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div class="alert alert-warning" role="alert">
                  <i class="fas fa-exclamation-triangle me-2"></i>
                  <strong>Warning:</strong> This will return all delivered products in this order.
                </div>
                <p>Please provide a reason for returning this entire order. Our team will review your request.</p>
                <div class="mb-3">
                  <label for="orderReturnReason" class="form-label">
                    Reason for return <span class="text-danger">*</span>
                  </label>
                  <select class="form-select mb-2" id="orderReturnReasonSelect">
                    <option value="">Select a reason</option>
                    <option value="defective">Products are defective/damaged</option>
                    <option value="wrong-items">Wrong items received</option>
                    <option value="size-issues">Size issues with products</option>
                    <option value="quality">Quality not as expected</option>
                    <option value="not-as-described">Products not as described</option>
                    <option value="other">Other (please specify)</option>
                  </select>
                  <textarea 
                    class="form-control" 
                    id="orderReturnReason" 
                    rows="3" 
                    placeholder="Please provide detailed reason for returning the entire order"
                    required
                    maxlength="500"
                  ></textarea>
                  <div class="invalid-feedback">
                    Please provide a reason for return.
                  </div>
                  <div class="form-text">
                    <span id="orderReturnCharCount">0</span>/500 characters
                  </div>
                </div>
                <div class="alert alert-info d-flex align-items-start" role="alert">
                  <i class="fas fa-clock me-2 mt-1"></i>
                  <div>
                    <strong>Return Policy:</strong>
                    <ul class="mb-0 mt-1">
                      <li>Returns accepted within 7 days of delivery</li>
                      <li>All products must be in original condition</li>
                      <li>Refund will be processed after quality check</li>
                      <li>Return request will be reviewed within 24 hours</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                  <i class="fas fa-times me-1"></i>Cancel
                </button>
                <button type="button" class="btn btn-warning confirm-order-return">
                  <i class="fas fa-paper-plane me-1"></i>Submit Return Request
                </button>
              </div>
            </div>
          </div>
        </div>
      `

      document.body.appendChild(confirmModal)
      const modalElement = confirmModal.querySelector(".modal")
      const modal = new bootstrap.Modal(modalElement)
      modal.show()

      const reasonSelect = confirmModal.querySelector("#orderReturnReasonSelect")
      const reasonTextarea = confirmModal.querySelector("#orderReturnReason")
      const charCount = confirmModal.querySelector("#orderReturnCharCount")

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

      const confirmBtn = confirmModal.querySelector(".confirm-order-return")
      confirmBtn.addEventListener("click", function () {
        const reason = reasonTextarea.value.trim()

        if (!reason) {
          reasonTextarea.classList.add("is-invalid")
          reasonTextarea.focus()
          return
        }

        const originalText = this.innerHTML
        setButtonLoading(this, true, originalText)

        fetch(`/orders/return/${orderId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify({ reason }),
        })
          .then(async (response) => {
            const data = await response.json()
            if (!response.ok) {
              throw new Error(data.message || `HTTP error! status: ${response.status}`)
            }
            return data
          })
          .then((data) => {
            if (data.success) {
              modal.hide()
              showToast("Return request submitted successfully! We'll review it within 24 hours.", "success", 5000)
              setTimeout(() => {
                window.location.reload()
              }, 2000)
            } else {
              throw new Error(data.message || "Failed to submit return request")
            }
          })
          .catch((error) => {
            console.error("Error submitting return request:", error)
            setButtonLoading(this, false, originalText)
            showToast(error.message || "Failed to submit return request. Please try again.", "error")
          })
      })

      modalElement.addEventListener("hidden.bs.modal", () => {
        setTimeout(() => {
          confirmModal.remove()
        }, 300)
      })
    })
  }
  const retryPaymentButtons = document.querySelectorAll(".retry-payment-btn")
  if (retryPaymentButtons.length > 0) {
    retryPaymentButtons.forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.preventDefault()
        const orderId = this.getAttribute("data-order-id")

        if (!orderId) {
          showToast("Missing order information", "error")
          return
        }

        const retryModal = document.createElement("div")
        retryModal.innerHTML = `
          <div class="modal fade" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content border-0 shadow">
                <div class="modal-header bg-warning text-dark">
                  <h5 class="modal-title">
                    <i class="fas fa-sync-alt me-2"></i>
                    Retry Payment
                  </h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <p>Choose a payment method to complete your order:</p>
                  <div class="payment-options">
                    <div class="form-check mb-3 p-3 border rounded">
                      <input class="form-check-input" type="radio" name="paymentMethod" id="paypal" value="paypal" checked>
                      <label class="form-check-label w-100" for="paypal">
                        <i class="fab fa-paypal me-2 text-primary"></i> 
                        <strong>PayPal</strong>
                        <small class="d-block text-muted">Secure online payment</small>
                      </label>
                    </div>
                    <div class="form-check mb-3 p-3 border rounded">
                      <input class="form-check-input" type="radio" name="paymentMethod" id="wallet" value="wallet">
                      <label class="form-check-label w-100" for="wallet">
                        <i class="fas fa-wallet me-2 text-success"></i> 
                        <strong>Wallet</strong>
                        <small class="d-block text-muted">Use wallet balance</small>
                      </label>
                    </div>
                    <div class="form-check mb-3 p-3 border rounded">
                      <input class="form-check-input" type="radio" name="paymentMethod" id="cod" value="COD">
                      <label class="form-check-label w-100" for="cod">
                        <i class="fas fa-money-bill-wave me-2 text-warning"></i> 
                        <strong>Cash on Delivery</strong>
                        <small class="d-block text-muted">Pay when you receive</small>
                      </label>
                    </div>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times me-1"></i>Cancel
                  </button>
                  <button type="button" class="btn btn-warning confirm-retry">
                    <i class="fas fa-credit-card me-1"></i>Proceed to Payment
                  </button>
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
          const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value

          if (!paymentMethod) {
            showToast("Please select a payment method", "error")
            return
          }

          const originalText = this.innerHTML
          setButtonLoading(this, true, originalText)

          fetch(`/order/retry-payment/${orderId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Requested-With": "XMLHttpRequest",
            },
            body: JSON.stringify({ paymentMethod }),
          })
            .then(async (response) => {
              const data = await response.json()
              if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`)
              }
              return data
            })
            .then((data) => {
              if (data.success) {
                showToast("Redirecting to payment...", "success")
                setTimeout(() => {
                  window.location.href = data.redirect
                }, 1000)
              } else {
                throw new Error(data.message || "Failed to process payment")
              }
            })
            .catch((error) => {
              console.error("Error:", error)
              setButtonLoading(this, false, originalText)
              showToast(error.message || "An error occurred. Please try again.", "error")
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
  window.addEventListener("online", () => {
    showToast("Connection restored", "success", 2000)
  })

  window.addEventListener("offline", () => {
    showToast("Connection lost. Please check your internet connection.", "error", 5000)
  })
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const openModals = document.querySelectorAll(".modal.show")
      openModals.forEach((modal) => {
        const modalInstance = bootstrap.Modal.getInstance(modal)
        if (modalInstance) {
          modalInstance.hide()
        }
      })
    }
  })
})
