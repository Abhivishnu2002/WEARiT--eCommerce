document.addEventListener("DOMContentLoaded", () => {
  const productId = document.querySelector(".btn-add-to-cart").getAttribute("data-product-id")
  const sizeButtons = document.querySelectorAll(".size-btn")
  const quantityInput = document.getElementById("quantity")
  const decreaseBtn = document.getElementById("decrease-qty")
  const increaseBtn = document.getElementById("increase-qty")
  const addToCartBtn = document.querySelector(".btn-add-to-cart")
  const wishlistBtn = document.querySelector(".btn-wishlist")
  const wishlistIcon = wishlistBtn ? wishlistBtn.querySelector("i") : null
  let selectedSize = null

  if (sizeButtons.length > 0) {
    const smallSizeBtn = Array.from(sizeButtons).find((btn) => btn.getAttribute("data-size").toLowerCase() === "s")
    const defaultSizeBtn = smallSizeBtn || sizeButtons[0]
    defaultSizeBtn.classList.add("active")
    selectedSize = defaultSizeBtn.getAttribute("data-size")
    updateVariantAvailability(selectedSize)
  }

  if (wishlistBtn && isAuthenticated()) {
    checkWishlistStatus()
  }

  sizeButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      sizeButtons.forEach((b) => b.classList.remove("active"))
      this.classList.add("active")
      selectedSize = this.getAttribute("data-size")
      updateVariantAvailability(selectedSize)
    })
  })

  if (decreaseBtn && increaseBtn && quantityInput) {
    const newDecreaseBtn = decreaseBtn.cloneNode(true)
    const newIncreaseBtn = increaseBtn.cloneNode(true)
    decreaseBtn.parentNode.replaceChild(newDecreaseBtn, decreaseBtn)
    increaseBtn.parentNode.replaceChild(newIncreaseBtn, increaseBtn)

    newDecreaseBtn.addEventListener("click", handleDecrease)
    newIncreaseBtn.addEventListener("click", handleIncrease)
  }

  function handleDecrease() {
    const currentValue = parseInt(quantityInput.value, 10)
    if (currentValue > 1) {
      quantityInput.value = currentValue - 1
    }
  }

  function handleIncrease() {
    const currentValue = parseInt(quantityInput.value, 10)
    const maxValue = parseInt(quantityInput.getAttribute("max"), 10)
    
    if (currentValue < maxValue) {
      quantityInput.value = currentValue + 1
    } else {
      showAlert("warning", `Maximum available quantity is ${maxValue}`)
    }
  }

  if (addToCartBtn && !addToCartBtn.classList.contains("disabled")) {
    addToCartBtn.addEventListener("click", () => {
      if (!selectedSize) {
        showAlert("warning", "Please select a size")
        highlightSizeSelection()
        return
      }

      const quantity = parseInt(quantityInput.value, 10)
      addToCart(productId, selectedSize, quantity)
    })
  }

  if (wishlistBtn) {
    wishlistBtn.addEventListener("click", () => {
      if (!isAuthenticated()) {
        window.location.href = "/login"
        return
      }

      const isInWishlist = wishlistIcon.classList.contains("fas")
      toggleWishlist(productId, isInWishlist)
    })
  }

  function updateVariantAvailability(size) {
    if (!size) return

    const variant = window.productVariants.find((v) => v.size === size)
    if (variant) {
      quantityInput.setAttribute("max", variant.varientquatity)
      if (parseInt(quantityInput.value, 10) > variant.varientquatity) {
        quantityInput.value = variant.varientquatity
      }
      updatePriceDisplay(variant)
      updateStockStatus(variant.varientquatity > 0)
    }
  }

  function updatePriceDisplay(variant) {
    const priceContainer = document.querySelector(".product-price h2")
    if (variant.varientPrice > variant.salePrice) {
      const discountPercentage = Math.round(((variant.varientPrice - variant.salePrice) / variant.varientPrice) * 100)
      priceContainer.innerHTML = `
        <span class="sale-price">₹${variant.salePrice}</span>
        <span class="original-price">₹${variant.varientPrice}</span>
        <span class="discount-percentage">(${discountPercentage}% off)</span>
      `
    } else {
      priceContainer.innerHTML = `₹${variant.salePrice}`
    }
  }

  function updateStockStatus(inStock) {
    const stockStatus = document.querySelector(".stock-status")
    const addToCartBtn = document.querySelector(".btn-add-to-cart")

    if (inStock) {
      stockStatus.innerHTML = '<span class="in-stock">In Stock</span>'
      addToCartBtn.textContent = "Add to Cart"
      addToCartBtn.classList.remove("disabled")
      addToCartBtn.disabled = false
    } else {
      stockStatus.innerHTML = '<span class="out-of-stock">Out of Stock</span>'
      addToCartBtn.textContent = "Out of Stock"
      addToCartBtn.classList.add("disabled")
      addToCartBtn.disabled = true
    }
  }

  function addToCart(productId, size, quantity) {
    fetch("/cart/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({ productId, size, quantity }),
    })
      .then((response) => {
        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = "/login"
            return Promise.reject("Unauthorized")
          }
          return response.json().then((data) => {
            throw new Error(data.message || "Something went wrong")
          })
        }
        return response.json()
      })
      .then((data) => {
        showAlert("success", "Product added to cart successfully!")
        updateCartCount(data.cartCount)

        if (wishlistIcon && wishlistIcon.classList.contains("fas")) {
          wishlistIcon.classList.remove("fas")
          wishlistIcon.classList.add("far")
        }
      })
      .catch((error) => {
        if (error === "Unauthorized") return

        console.error("Error adding product to cart:", error)
        showAlert("error", error.message || "Failed to add product to cart")
      })
  }

  function toggleWishlist(productId, isInWishlist) {
    const endpoint = isInWishlist ? "/wishlist/remove" : "/wishlist/add"

    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({ productId }),
    })
      .then((response) => {
        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = "/login"
            return Promise.reject("Unauthorized")
          }
          return response.json().then((data) => {
            throw new Error(data.message || "Something went wrong")
          })
        }
        return response.json()
      })
      .then((data) => {
        if (isInWishlist) {
          wishlistIcon.classList.remove("fas")
          wishlistIcon.classList.add("far")
          showAlert("success", "Product removed from wishlist")
        } else {
          wishlistIcon.classList.remove("far")
          wishlistIcon.classList.add("fas")
          showAlert("success", "Product added to wishlist")
        }
      })
      .catch((error) => {
        if (error === "Unauthorized") return

        console.error("Error updating wishlist:", error)
        showAlert("error", error.message || "Failed to update wishlist")
      })
  }

  function checkWishlistStatus() {
    fetch("/wishlist/check", {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((response) => {
        if (!response.ok) {
          if (response.status === 401) return Promise.reject("Unauthorized")
          return response.json().then((data) => {
            throw new Error(data.message || "Something went wrong")
          })
        }
        return response.json()
      })
      .then((data) => {
        if (data.wishlistItems && data.wishlistItems.includes(productId)) {
          wishlistIcon.classList.remove("far")
          wishlistIcon.classList.add("fas")
        }
      })
      .catch((error) => {
        if (error === "Unauthorized") return
        console.error("Error checking wishlist status:", error)
      })
  }

  function updateCartCount(count) {
    const cartCountElement = document.querySelector(".cart-count")
    if (cartCountElement) {
      cartCountElement.textContent = count
    }
  }

  function isAuthenticated() {
    return document.body.classList.contains("user-logged-in") || document.querySelector(".user-dropdown") !== null
  }

  function highlightSizeSelection() {
    const sizeSelection = document.querySelector(".size-selection")
    if (sizeSelection) {
      sizeSelection.classList.add("highlight-selection")
      setTimeout(() => {
        sizeSelection.classList.remove("highlight-selection")
      }, 2000)
    }
  }

  function showAlert(type, message) {
    if (typeof Swal !== "undefined") {
      const iconMap = {
        success: "success",
        error: "error",
        warning: "warning",
        info: "info",
      }

      Swal.fire({
        icon: iconMap[type] || "info",
        title: type.charAt(0).toUpperCase() + type.slice(1),
        text: message,
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
      })
    } else {
      alert(message)
    }
  }
})