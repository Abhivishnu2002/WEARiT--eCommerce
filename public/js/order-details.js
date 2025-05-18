document.addEventListener("DOMContentLoaded", () => {
  const bootstrap = window.bootstrap
  if (!document.getElementById("toastContainer")) {
    const toastContainer = document.createElement("div")
    toastContainer.id = "toastContainer"
    toastContainer.className = "toast-container position-fixed bottom-0 end-0 p-3"
    document.body.appendChild(toastContainer)
  }
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
                        <input class="form-check-input" type="radio" name="paymentMethod" id="paypal" value="paypal" checked>
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
                window.location.href = data.redirect
              } else {
                this.disabled = false
                this.innerHTML = "Proceed to Payment"
                showToast(data.message || "Failed to process payment", "danger")
              }
            })
            .catch((error) => {
              console.error("Error:", error)
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
  const cancelOrderBtn = document.querySelector(".cancel-order-btn")
  if (cancelOrderBtn) {
    cancelOrderBtn.addEventListener("click", function () {
      const orderId = this.getAttribute("data-order-id")

      const confirmModal = document.createElement("div")
      confirmModal.innerHTML = `
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

      document.body.appendChild(confirmModal)
      const modalElement = confirmModal.querySelector(".modal")
      const modal = new bootstrap.Modal(modalElement)
      modal.show()

      confirmModal.querySelector(".confirm-cancel").addEventListener("click", function () {
        this.disabled = true
        const reason = document.getElementById("cancellationReason").value

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
              showToast("Order cancelled successfully", "success")
              setTimeout(() => {
                window.location.reload()
              }, 1500)
            } else {
              showToast(data.message || "Failed to cancel order", "danger")
              this.disabled = false
            }
          })
          .catch((error) => {
            console.error("Error:", error)
            showToast("An error occurred. Please try again.", "danger")
            this.disabled = false
          })
      })

      modalElement.addEventListener("hidden.bs.modal", () => {
        setTimeout(() => {
          confirmModal.remove()
        }, 300)
      })
    })
  }
  const cancelProductBtns = document.querySelectorAll(".cancel-product-btn")
  if (cancelProductBtns.length > 0) {
    cancelProductBtns.forEach((btn) => {
      btn.addEventListener("click", function () {
        const orderId = this.getAttribute("data-order-id")
        const productId = this.getAttribute("data-product-id")

        const confirmModal = document.createElement("div")
        confirmModal.innerHTML = `
            <div class="modal fade" tabindex="-1">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">Cancel Product</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    <p>Are you sure you want to cancel this product?</p>
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

        document.body.appendChild(confirmModal)
        const modalElement = confirmModal.querySelector(".modal")
        const modal = new bootstrap.Modal(modalElement)
        modal.show()

        confirmModal.querySelector(".confirm-cancel").addEventListener("click", function () {
          this.disabled = true
          const reason = document.getElementById("cancellationReason").value

          fetch(`/orders/cancel-product/${orderId}/${productId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reason }),
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.success) {
                showToast("Product cancelled successfully", "success")
                setTimeout(() => {
                  window.location.reload()
                }, 1500)
              } else {
                showToast(data.message || "Failed to cancel product", "danger")
                this.disabled = false
              }
            })
            .catch((error) => {
              console.error("Error:", error)
              showToast("An error occurred. Please try again.", "danger")
              this.disabled = false
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
      btn.addEventListener("click", function () {
        const orderId = this.getAttribute("data-order-id")
        const productId = this.getAttribute("data-product-id")

        const confirmModal = document.createElement("div")
        confirmModal.innerHTML = `
            <div class="modal fade" tabindex="-1">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">Return Product</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    <p>Please provide a reason for returning this product</p>
                    <div class="mb-3">
                      <label for="returnReason" class="form-label">Reason for return <span class="text-danger">*</span></label>
                      <textarea class="form-control" id="returnReason" rows="3" placeholder="Please provide a reason for return" required></textarea>
                      <div class="invalid-feedback">
                        Please provide a reason for return.
                      </div>
                    </div>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-warning confirm-return">Submit Return</button>
                  </div>
                </div>
              </div>
            </div>
          `

        document.body.appendChild(confirmModal)
        const modalElement = confirmModal.querySelector(".modal")
        const modal = new bootstrap.Modal(modalElement)
        modal.show()

        confirmModal.querySelector(".confirm-return").addEventListener("click", function () {
          const reasonInput = document.getElementById("returnReason")
          const reason = reasonInput.value.trim()

          if (!reason) {
            reasonInput.classList.add("is-invalid")
            return
          }

          this.disabled = true

          fetch(`/orders/return-product/${orderId}/${productId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reason }),
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.success) {
                showToast("Return request submitted successfully", "success")
                setTimeout(() => {
                  window.location.reload()
                }, 1500)
              } else {
                showToast(data.message || "Failed to submit return request", "danger")
                this.disabled = false
              }
            })
            .catch((error) => {
              console.error("Error:", error)
              showToast("An error occurred. Please try again.", "danger")
              this.disabled = false
            })
        })
        const reasonInput = document.getElementById("returnReason")
        reasonInput.addEventListener("input", function () {
          if (this.value.trim()) {
            this.classList.remove("is-invalid")
          } else {
            this.classList.add("is-invalid")
          }
        })

        modalElement.addEventListener("hidden.bs.modal", () => {
          setTimeout(() => {
            confirmModal.remove()
          }, 300)
        })
      })
    })
  }
  const returnOrderBtn = document.querySelector(".return-order-btn")
  if (returnOrderBtn) {
    returnOrderBtn.addEventListener("click", function () {
      const orderId = this.getAttribute("data-order-id")

      const confirmModal = document.createElement("div")
      confirmModal.innerHTML = `
          <div class="modal fade" tabindex="-1">
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">Return Order</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <p>Please provide a reason for returning this order</p>
                  <div class="mb-3">
                    <label for="returnReason" class="form-label">Reason for return <span class="text-danger">*</span></label>
                    <textarea class="form-control" id="returnReason" rows="3" placeholder="Please provide a reason for return" required></textarea>
                    <div class="invalid-feedback">
                      Please provide a reason for return.
                    </div>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                  <button type="button" class="btn btn-warning confirm-return">Submit Return</button>
                </div>
              </div>
            </div>
          </div>
        `

      document.body.appendChild(confirmModal)
      const modalElement = confirmModal.querySelector(".modal")
      const modal = new bootstrap.Modal(modalElement)
      modal.show()

      confirmModal.querySelector(".confirm-return").addEventListener("click", function () {
        const reasonInput = document.getElementById("returnReason")
        const reason = reasonInput.value.trim()

        if (!reason) {
          reasonInput.classList.add("is-invalid")
          return
        }

        this.disabled = true

        fetch(`/orders/return/${orderId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              showToast("Return request submitted successfully", "success")
              setTimeout(() => {
                window.location.reload()
              }, 1500)
            } else {
              showToast(data.message || "Failed to submit return request", "danger")
              this.disabled = false
            }
          })
          .catch((error) => {
            console.error("Error:", error)
            showToast("An error occurred. Please try again.", "danger")
            this.disabled = false
          })
      })
      const reasonInput = document.getElementById("returnReason")
      reasonInput.addEventListener("input", function () {
        if (this.value.trim()) {
          this.classList.remove("is-invalid")
        } else {
          this.classList.add("is-invalid")
        }
      })

      modalElement.addEventListener("hidden.bs.modal", () => {
        setTimeout(() => {
          confirmModal.remove()
        }, 300)
      })
    })
  }
})
