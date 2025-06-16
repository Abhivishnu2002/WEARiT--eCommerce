document.addEventListener("DOMContentLoaded", () => {
  // Import Bootstrap
  const bootstrap = window.bootstrap

  // Initialize toast container
  if (!document.getElementById("toastContainer")) {
    const toastContainer = document.createElement("div")
    toastContainer.id = "toastContainer"
    toastContainer.className = "toast-container position-fixed bottom-0 end-0 p-3"
    document.body.appendChild(toastContainer)
  }

  // Toast notification function
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

  // Stock status checking function
  function checkStockStatus() {
    fetch("/wishlist/check-stock", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.stockStatus) {
          updateStockDisplay(data.stockStatus)
        }
      })
      .catch((error) => {
        })
  }

  // Update stock display based on current status
  function updateStockDisplay(stockStatus) {
    Object.keys(stockStatus).forEach((productId) => {
      const productItem = document.querySelector(`.wishlist-item[data-product-id="${productId}"]`)
      if (!productItem) return

      const stock = stockStatus[productId]
      const currentStatus = productItem.getAttribute("data-stock-status")
      const newStatus = stock.stockStatus

      // Only update if status has changed
      if (currentStatus !== newStatus) {
        updateProductStockUI(productItem, stock)

        // Show notification for status change
        const productName = productItem.querySelector(".product-title a").textContent.trim()
        if (newStatus === "in-stock" && currentStatus === "out-of-stock") {
          showToast(`${productName} is now back in stock!`, "success")
        } else if (newStatus === "out-of-stock" && currentStatus === "in-stock") {
          showToast(`${productName} is now out of stock`, "danger")
        }
      }
    })
  }

  // Update individual product stock UI
  function updateProductStockUI(productItem, stockInfo) {
    const productId = productItem.getAttribute("data-product-id")

    // Update data attribute
    productItem.setAttribute("data-stock-status", stockInfo.stockStatus)

    // Update stock badge
    const stockBadge = productItem.querySelector(".stock-status-badge")
    if (stockBadge) {
      if (stockInfo.hasStock) {
        stockBadge.innerHTML = `
          <span class="badge bg-success">
            <i class="fas fa-check-circle me-1"></i>
            In Stock (${stockInfo.totalStock} available)
          </span>
        `
      } else {
        stockBadge.innerHTML = `
          <span class="badge bg-danger">
            <i class="fas fa-times-circle me-1"></i>
            Out of Stock
          </span>
        `
      }
    }

    // Update size selection
    const sizeSelection = productItem.querySelector(".size-selection")
    if (stockInfo.hasStock && stockInfo.availableVariants.length > 0) {
      if (!sizeSelection) {
        // Create size selection if it doesn't exist
        const sizeSelectionHTML = `
          <div class="size-selection mb-3">
            <label class="form-label small">Available Sizes:</label>
            <select class="form-select form-select-sm size-selector" data-product-id="${productId}">
              ${stockInfo.availableVariants
                .map((variant, index) => {
                  return `<option value="${variant.size}" ${index === 0 ? "selected" : ""}>
                    ${variant.size} (${variant.stock} left)
                  </option>`
                })
                .join("")}
            </select>
          </div>
        `
        productItem.querySelector(".product-price").insertAdjacentHTML("afterend", sizeSelectionHTML)
      } else {
        // Update existing size selection
        const sizeSelector = sizeSelection.querySelector(".size-selector")
        sizeSelector.innerHTML = stockInfo.availableVariants
          .map((variant, index) => {
            return `<option value="${variant.size}" ${index === 0 ? "selected" : ""}>
              ${variant.size} (${variant.stock} left)
            </option>`
          })
          .join("")
      }
    } else if (sizeSelection) {
      sizeSelection.remove()
    }

    // Update button
    const addToCartBtn = productItem.querySelector(".add-to-cart-btn")
    const outOfStockBtn = productItem.querySelector(".out-of-stock-btn")
    const stockAlert = productItem.querySelector(".stock-alert")

    if (stockInfo.hasStock) {
      // Show add to cart button
      if (outOfStockBtn) {
        outOfStockBtn.outerHTML = `
          <button class="btn btn-dark add-to-cart-btn" data-product-id="${productId}" data-size="${stockInfo.availableVariants[0]?.size || ""}">
            <i class="fas fa-shopping-cart me-2"></i>
            Add To Cart
          </button>
        `
        // Re-attach event listener
        attachAddToCartListener(productItem.querySelector(".add-to-cart-btn"))
      }

      // Remove stock alert
      if (stockAlert) {
        stockAlert.remove()
      }
    } else {
      // Show out of stock button
      if (addToCartBtn) {
        addToCartBtn.outerHTML = `
          <button class="btn btn-secondary out-of-stock-btn" disabled data-product-id="${productId}">
            <i class="fas fa-times me-2"></i>
            Out of Stock
          </button>
        `
      }

      // Add stock alert if it doesn't exist
      if (!stockAlert) {
        const stockAlertHTML = `
          <div class="stock-alert mt-2">
            <small class="text-muted">
              <i class="fas fa-bell me-1"></i>
              We'll notify you when this item is back in stock
            </small>
          </div>
        `
        productItem.querySelector(".remove-btn").insertAdjacentHTML("afterend", stockAlertHTML)
      }
    }

    // Add animation class
    productItem.classList.add("stock-status-update")
    setTimeout(() => {
      productItem.classList.remove("stock-status-update")
    }, 600)
  }

  // Attach event listener to add to cart button
  function attachAddToCartListener(button) {
    if (!button) return

    button.addEventListener("click", function () {
      const productId = this.getAttribute("data-product-id")
      const sizeSelector = document.querySelector(`.size-selector[data-product-id="${productId}"]`)
      const size = sizeSelector ? sizeSelector.value : this.getAttribute("data-size")

      this.disabled = true
      this.classList.add("loading")

      addToCart(productId, size)
        .then(() => {
          this.disabled = false
          this.classList.remove("loading")
        })
        .catch(() => {
          this.disabled = false
          this.classList.remove("loading")
        })
    })
  }

  // Handle size selection changes
  document.addEventListener("change", (e) => {
    if (e.target.classList.contains("size-selector")) {
      const productId = e.target.getAttribute("data-product-id")
      const selectedSize = e.target.value
      const addToCartBtn = document.querySelector(`.add-to-cart-btn[data-product-id="${productId}"]`)

      if (addToCartBtn) {
        addToCartBtn.setAttribute("data-size", selectedSize)
      }
    }
  })

  // Initialize event listeners for existing buttons
  document.querySelectorAll(".remove-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const productId = this.getAttribute("data-product-id")
      const confirmModal = document.createElement("div")
      confirmModal.innerHTML = `
        <div class="modal fade" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Remove Item</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <p>Are you sure you want to remove this item from your wishlist?</p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger confirm-remove">Remove</button>
              </div>
            </div>
          </div>
        </div>
      `

      document.body.appendChild(confirmModal)
      const modalElement = confirmModal.querySelector(".modal")
      const modal = new bootstrap.Modal(modalElement)
      modal.show()

      confirmModal.querySelector(".confirm-remove").addEventListener("click", function () {
        this.disabled = true
        removeFromWishlist(productId).then(() => {
          modal.hide()
          setTimeout(() => {
            confirmModal.remove()
          }, 300)
        })
      })

      modalElement.addEventListener("hidden.bs.modal", () => {
        setTimeout(() => {
          confirmModal.remove()
        }, 300)
      })
    })
  })

  // Initialize add to cart listeners
  document.querySelectorAll(".add-to-cart-btn").forEach((button) => {
    attachAddToCartListener(button)
  })

  // Empty wishlist functionality
  const emptyWishlistBtn = document.getElementById("emptyWishlist")
  if (emptyWishlistBtn) {
    emptyWishlistBtn.addEventListener("click", () => {
      const confirmModal = document.createElement("div")
      confirmModal.innerHTML = `
        <div class="modal fade" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Empty Wishlist</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <p>Are you sure you want to empty your wishlist? This action cannot be undone.</p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger confirm-empty">Empty Wishlist</button>
              </div>
            </div>
          </div>
        </div>
      `

      document.body.appendChild(confirmModal)
      const modalElement = confirmModal.querySelector(".modal")
      const modal = new bootstrap.Modal(modalElement)
      modal.show()

      confirmModal.querySelector(".confirm-empty").addEventListener("click", function () {
        this.disabled = true
        emptyWishlistBtn.disabled = true

        fetch("/wishlist/empty", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              showToast("Wishlist emptied successfully", "success")
              location.reload()
            } else {
              emptyWishlistBtn.disabled = false
              showToast(data.message || "Failed to empty wishlist", "danger")
            }
          })
          .catch((error) => {
            emptyWishlistBtn.disabled = false
            showToast("An error occurred. Please try again.", "danger")
          })
          .finally(() => {
            modal.hide()
            setTimeout(() => {
              confirmModal.remove()
            }, 300)
          })
      })

      modalElement.addEventListener("hidden.bs.modal", () => {
        setTimeout(() => {
          confirmModal.remove()
        }, 300)
      })
    })
  }

  // Move all to cart functionality
  const moveAllToCartBtn = document.getElementById("moveAllToCart")
  if (moveAllToCartBtn) {
    moveAllToCartBtn.addEventListener("click", () => {
      const inStockProducts = Array.from(document.querySelectorAll(".wishlist-item[data-stock-status='in-stock']"))
        .map((item) => {
          const productId = item.getAttribute("data-product-id")
          const sizeSelector = item.querySelector(".size-selector")
          const size = sizeSelector
            ? sizeSelector.value
            : item.querySelector(".add-to-cart-btn")?.getAttribute("data-size")
          return { id: productId, size }
        })
        .filter((product) => product.size) // Only include products with valid sizes

      if (inStockProducts.length === 0) {
        showToast("No items available to move to cart", "danger")
        return
      }

      const confirmModal = document.createElement("div")
      confirmModal.innerHTML = `
        <div class="modal fade" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Move Available Items to Cart</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <p>Move ${inStockProducts.length} available item(s) to your cart?</p>
                <small class="text-muted">Out of stock items will remain in your wishlist.</small>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-dark confirm-move">Move Available Items</button>
              </div>
            </div>
          </div>
        </div>
      `

      document.body.appendChild(confirmModal)
      const modalElement = confirmModal.querySelector(".modal")
      const modal = new bootstrap.Modal(modalElement)
      modal.show()

      confirmModal.querySelector(".confirm-move").addEventListener("click", function () {
        this.disabled = true
        moveAllToCartBtn.disabled = true

        showToast("Moving available items to cart...", "success")

        const processItems = async () => {
          for (const product of inStockProducts) {
            try {
              await addToCart(product.id, product.size, false)
            } catch (e) {
    
  }
          }

          window.location.href = "/cart"
        }

        processItems()
        modal.hide()
      })

      modalElement.addEventListener("hidden.bs.modal", () => {
        setTimeout(() => {
          confirmModal.remove()
        }, 300)
      })
    })
  }

  // Helper functions
  function removeFromWishlist(productId, reload = true) {
    return fetch("/wishlist/remove", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          if (reload) {
            const wishlistItem = document.querySelector(`.wishlist-item[data-product-id="${productId}"]`)
            if (wishlistItem) {
              const column = wishlistItem.closest(".col-xl-3, .col-lg-4, .col-md-6, .col-sm-6")
              if (column) {
                column.remove()
                const titleElement = document.querySelector(".wishlist-title")
                const currentCount = Number.parseInt(titleElement.textContent.match(/\d+/)[0])
                const newCount = currentCount - 1
                titleElement.textContent = `Wishlist (${newCount})`
                if (newCount === 0) {
                  location.reload()
                }
              }
            }

            showToast("Item removed from wishlist", "success")

            // Update header counts
            if (typeof window.updateHeaderCounts === 'function') {
              window.updateHeaderCounts()
            }
          }
        } else {
          showToast(data.message || "Failed to remove from wishlist", "danger")
        }
        return data
      })
      .catch((error) => {
        showToast("An error occurred. Please try again.", "danger")
      })
  }

  function addToCart(productId, size, redirect = true) {
    return fetch("/cart/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId, size, quantity: 1 }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          showToast("Product added to cart", "success")

          // Update header counts
          if (typeof window.updateHeaderCounts === 'function') {
            window.updateHeaderCounts()
          }

          return removeFromWishlist(productId, false).then(() => {
            if (redirect) {
              window.location.href = "/cart"
            }
            return data
          })
        } else {
          showToast(data.message || "Failed to add to cart", "danger")
          return Promise.reject(data)
        }
      })
      .catch((error) => {
        showToast("An error occurred. Please try again.", "danger")
        return Promise.reject(error)
      })
  }

  // Auto-check stock status every 30 seconds
  setInterval(checkStockStatus, 30000)

  // Initial stock check
  checkStockStatus()
})
