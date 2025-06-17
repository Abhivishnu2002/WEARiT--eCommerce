document.addEventListener("DOMContentLoaded", () => {
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
  function updateCartItemUI(cartItem, newQuantity, itemPrice) {
    const quantityInput = cartItem.querySelector(".quantity-input")
    quantityInput.value = newQuantity
    updateCartTotals()
  }
  function updateCartTotals() {
    let subtotal = 0
    let discount = 0
    let total = 0
    document.querySelectorAll(".cart-item").forEach(item => {
      const quantity = parseInt(item.querySelector(".quantity-input").value)
      const priceElement = item.querySelector(".price-amount")
      const price = parseFloat(priceElement.textContent.replace("₹", "").replace(",", ""))
      const originalPriceElement = item.querySelector(".original-price")
      if (originalPriceElement) {
        const originalPrice = parseFloat(originalPriceElement.textContent.replace("₹", "").replace(",", ""))
        discount += (originalPrice - price) * quantity
        subtotal += originalPrice * quantity
      } else {
        subtotal += price * quantity
      }
      
      total += price * quantity
    })
    const subtotalElement = document.querySelector(".final-subtotal")
    if (subtotalElement) {
      subtotalElement.textContent = `INR ${total.toLocaleString('en-IN')}`
    }
    const originalSubtotalElement = document.querySelector(".original-subtotal")
    if (originalSubtotalElement && discount > 0) {
      originalSubtotalElement.textContent = `INR ${subtotal.toLocaleString('en-IN')}`
    }
    const saveAmountElement = document.querySelector(".cart-summary .save-amount")
    if (saveAmountElement && discount > 0) {
      saveAmountElement.textContent = `Save ₹${discount.toLocaleString('en-IN')}`
    }
  }
  document.querySelectorAll(".quantity-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const cartItem = this.closest(".cart-item")
      const productId = cartItem.dataset.productId
      const size = cartItem.dataset.size
      const action = this.dataset.action
      const quantityInput = cartItem.querySelector(".quantity-input")
      const currentQuantity = parseInt(quantityInput.value)
      this.disabled = true
      
      fetch("/cart/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: productId,
          size: size,
          action: action,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          this.disabled = false
          
          if (data.success) {
            updateCartItemUI(cartItem, data.quantity)
            showToast(`Quantity updated to ${data.quantity}`, "success")
          } else {
            showToast(data.message || "Failed to update quantity", "danger")
          }
        })
        .catch((error) => {
          this.disabled = false
          
          showToast("Failed to update quantity", "danger")
        })
    })
  })
  document.querySelectorAll(".remove-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const cartItem = this.closest(".cart-item")
      const productId = cartItem.dataset.productId
      const size = cartItem.dataset.size
      const confirmModal = new bootstrap.Modal(document.createElement("div"))
      confirmModal.element = confirmModal._element = document.createElement("div")
      confirmModal.element.innerHTML = `
        <div class="modal fade" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Remove Item</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <p>Are you sure you want to remove this item from your cart?</p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger confirm-remove">Remove</button>
              </div>
            </div>
          </div>
        </div>
      `
      
      document.body.appendChild(confirmModal.element)
      confirmModal.element.querySelector(".modal").classList.add("show")
      confirmModal.element.querySelector(".modal").style.display = "block"
      
      confirmModal.element.querySelector(".confirm-remove").addEventListener("click", function() {
        this.disabled = true
        fetch("/cart/remove", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: productId,
            size: size,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              cartItem.remove()
              updateCartTotals()
              if (document.querySelectorAll(".cart-item").length === 0) {
                const cartItems = document.querySelector(".cart-items")
                cartItems.innerHTML = `
                  <div class="empty-cart-message text-center py-5">
                    <i class="fa-solid fa-shopping-cart fa-3x mb-3"></i>
                    <h3>Your cart is empty</h3>
                    <p>Looks like you haven't added anything to your cart yet.</p>
                    <a href="/products" class="btn btn-dark mt-3">Continue Shopping</a>
                  </div>
                `
                document.querySelector(".cart-summary")?.remove()
                document.querySelector(".shipping-note")?.remove()
                document.querySelector(".cart-actions")?.remove()
                document.querySelector(".empty-cart-btn")?.remove()
              }
              
              showToast("Item removed from cart", "success")
              if (typeof window.updateHeaderCounts === 'function') {
                window.updateHeaderCounts()
              }

              confirmModal.element.querySelector(".modal").classList.remove("show")
              confirmModal.element.querySelector(".modal").style.display = "none"
              setTimeout(() => {
                confirmModal.element.remove()
              }, 300)
            } else {
              showToast(data.message || "Failed to remove item", "danger")
            }
          })
          .catch((error) => {
            showToast("Failed to remove item", "danger")
          })
      })
      
      confirmModal.element.querySelector(".btn-close, .btn-secondary").addEventListener("click", function() {
        confirmModal.element.querySelector(".modal").classList.remove("show")
        confirmModal.element.querySelector(".modal").style.display = "none"
        setTimeout(() => {
          confirmModal.element.remove()
        }, 300)
      })
    })
  })
  const emptyCartBtn = document.getElementById("emptyCartBtn")
  if (emptyCartBtn) {
    emptyCartBtn.addEventListener("click", () => {
      const confirmModal = new bootstrap.Modal(document.createElement("div"))
      confirmModal.element = confirmModal._element = document.createElement("div")
      confirmModal.element.innerHTML = `
        <div class="modal fade" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Empty Cart</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <p>Are you sure you want to empty your cart? This action cannot be undone.</p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger confirm-empty">Empty Cart</button>
              </div>
            </div>
          </div>
        </div>
      `
      
      document.body.appendChild(confirmModal.element)
      confirmModal.element.querySelector(".modal").classList.add("show")
      confirmModal.element.querySelector(".modal").style.display = "block"
      
      confirmModal.element.querySelector(".confirm-empty").addEventListener("click", function() {
        this.disabled = true
        emptyCartBtn.disabled = true
        
        fetch("/cart/empty", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin"
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              const cartItems = document.querySelector(".cart-items")
              cartItems.innerHTML = `
                <div class="empty-cart-message text-center py-5">
                  <i class="fa-solid fa-shopping-cart fa-3x mb-3"></i>
                  <h3>Your cart is empty</h3>
                  <p>Looks like you haven't added anything to your cart yet.</p>
                  <a href="/products" class="btn btn-dark mt-3">Continue Shopping</a>
                </div>
              `
              document.querySelector(".cart-summary")?.remove()
              document.querySelector(".shipping-note")?.remove()
              document.querySelector(".cart-actions")?.remove()
              emptyCartBtn.remove()
              
              showToast("Cart emptied successfully", "success")
              if (typeof window.updateHeaderCounts === 'function') {
                window.updateHeaderCounts()
              }

              confirmModal.element.querySelector(".modal").classList.remove("show")
              confirmModal.element.querySelector(".modal").style.display = "none"
              setTimeout(() => {
                confirmModal.element.remove()
              }, 300)
            } else {
              emptyCartBtn.disabled = false
              showToast(data.message || "Failed to empty cart", "danger")
            }
          })
          .catch((error) => {
            emptyCartBtn.disabled = false
            showToast("Failed to empty cart", "danger")
          })
      })
      
      confirmModal.element.querySelector(".btn-close, .btn-secondary").addEventListener("click", function() {
        confirmModal.element.querySelector(".modal").classList.remove("show")
        confirmModal.element.querySelector(".modal").style.display = "none"
        setTimeout(() => {
          confirmModal.element.remove()
        }, 300)
      })
    })
  }
  const checkoutBtn = document.querySelector('.checkout-btn')
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async function(e) {
      e.preventDefault()

      const originalText = this.textContent
      this.textContent = 'Validating...'
      this.disabled = true

      try {
        const response = await fetch('/cart/check-stock', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin'
        })

        const data = await response.json()

        if (!data.success) {
          await Swal.fire({
            title: 'Error',
            text: data.message || 'Failed to validate cart',
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#1a1a1a'
          })
          this.textContent = originalText
          this.disabled = false
          return
        }
        if (data.hasUnavailableProducts && data.unavailableProducts.length > 0) {
          let unavailableMessage = '<div class="unavailable-products">'
          unavailableMessage += '<p><strong>The following products are no longer available:</strong></p>'
          unavailableMessage += '<ul style="text-align: left; margin: 10px 0;">'

          data.unavailableProducts.forEach(item => {
            unavailableMessage += `<li><strong>${item.productName}</strong> (Size: ${item.size}) - ${item.reason}</li>`
          })

          unavailableMessage += '</ul>'
          unavailableMessage += '<p>Please remove these items from your cart to continue.</p>'
          unavailableMessage += '</div>'

          await Swal.fire({
            title: 'Products Unavailable',
            html: unavailableMessage,
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#1a1a1a'
          })

          this.textContent = originalText
          this.disabled = false
          return
        }
        if (data.hasStockIssues && data.stockIssues.length > 0) {
          let stockMessage = '<div class="stock-issues">'
          stockMessage += '<p><strong>Stock issues detected:</strong></p>'
          stockMessage += '<ul style="text-align: left; margin: 10px 0;">'

          data.stockIssues.forEach(issue => {
            if (issue.availableStock === 0) {
              stockMessage += `<li><strong>${issue.productName}</strong> (Size: ${issue.size}) is <span style="color: #dc3545;">out of stock</span></li>`
            } else if (issue.isPartialStock) {
              stockMessage += `<li><strong>${issue.productName}</strong> (Size: ${issue.size}) - Only ${issue.availableStock} available (you requested ${issue.requestedQuantity})</li>`
            }
          })

          stockMessage += '</ul>'
          stockMessage += '<p>Please update quantities or remove out-of-stock items to continue.</p>'
          stockMessage += '</div>'

          await Swal.fire({
            title: 'Stock Issues Detected',
            html: stockMessage,
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#1a1a1a'
          })

          this.textContent = originalText
          this.disabled = false
          return
        }
        window.location.href = '/checkout'

      } catch (error) {
        await Swal.fire({
          title: 'Error',
          text: 'Failed to validate cart. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#1a1a1a'
        })

        this.textContent = originalText
        this.disabled = false
      }
    })
  }

})
