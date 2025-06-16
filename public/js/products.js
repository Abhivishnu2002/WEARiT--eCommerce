document.addEventListener("DOMContentLoaded", () => {
    const toastOptions = {
      animation: true,
      autohide: true,
      delay: 3000,
    }
  
    const cartToast = new bootstrap.Toast(document.getElementById("cartToast"), toastOptions)
    const wishlistToast = new bootstrap.Toast(document.getElementById("wishlistToast"), toastOptions)
    const sidebarOverlay = document.getElementById("sidebarOverlay")
    const filterToggle = document.getElementById("filterToggle")
    const filterSidebar = document.getElementById("filterSidebar")
    const closeFilterBtn = document.getElementById("closeFilterBtn")
    const closeFilter = document.getElementById("closeFilter")
  
    if (filterToggle && filterSidebar && sidebarOverlay) {
      filterToggle.addEventListener("click", () => {
        filterSidebar.classList.add("show")
        sidebarOverlay.style.display = "block"
        document.body.style.overflow = "hidden"
      })
    }
  
    if ((closeFilterBtn || closeFilter) && filterSidebar && sidebarOverlay) {
      const closeFilterElements = [closeFilterBtn, closeFilter].filter((el) => el)
      closeFilterElements.forEach((el) => {
        el.addEventListener("click", () => {
          filterSidebar.classList.remove("show")
          sidebarOverlay.style.display = "none"
          document.body.style.overflow = ""
        })
      })
    }
    const sortToggle = document.getElementById("sortToggle")
    const sortSidebar = document.getElementById("sortSidebar")
    const closeSort = document.getElementById("closeSort")
  
    if (sortToggle && sortSidebar && sidebarOverlay) {
      sortToggle.addEventListener("click", () => {
        sortSidebar.classList.add("show")
        sidebarOverlay.style.display = "block"
        document.body.style.overflow = "hidden"
      })
    }
  
    if (closeSort && sortSidebar && sidebarOverlay) {
      closeSort.addEventListener("click", () => {
        sortSidebar.classList.remove("show")
        sidebarOverlay.style.display = "none"
        document.body.style.overflow = ""
      })
    }
  
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener("click", () => {
        if (filterSidebar) filterSidebar.classList.remove("show")
        if (sortSidebar) sortSidebar.classList.remove("show")
        sidebarOverlay.style.display = "none"
        document.body.style.overflow = ""
      })
    }
  
    const filterSearch = document.querySelector(".filter-search input")
    if (filterSearch) {
      filterSearch.addEventListener("input", function () {
        const searchTerm = this.value.toLowerCase()
        const filterOptions = document.querySelectorAll(".filter-options .form-check")
  
        filterOptions.forEach((option) => {
          const label = option.querySelector(".form-check-label span").textContent.toLowerCase()
          if (label.includes(searchTerm)) {
            option.style.display = ""
          } else {
            option.style.display = "none"
          }
        })
      })
    }

    const viewOptions = document.querySelectorAll(".view-option")
    const productsGrid = document.getElementById("productsGrid")
  
    if (viewOptions.length && productsGrid) {
      viewOptions.forEach((option) => {
        option.addEventListener("click", function () {
          viewOptions.forEach((opt) => opt.classList.remove("active"))
          this.classList.add("active")
  
          const viewType = this.getAttribute("data-view")

          if (viewType === "grid-2") {
            productsGrid.className = "row row-cols-1 row-cols-sm-2 g-4"
          } else if (viewType === "grid-3") {
            productsGrid.className = "row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4"
          } else if (viewType === "grid-4") {
            productsGrid.className = "row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4"
          } else if (viewType === "list") {
            productsGrid.className = "row row-cols-1 g-4"
          }
        })
      })
    }
    const checkWishlistStatus = () => {
      fetch("/wishlist/check", {
        method: "GET",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      })
        .then((response) => {
          if (!response.ok) {
            if (response.status === 401) {
              return null
            }
            throw new Error("Network response was not ok")
          }
          return response.json()
        })
        .then((data) => {
          if (data && data.wishlistItems) {
            const wishlistBtns = document.querySelectorAll(".wishlist-btn")
            wishlistBtns.forEach((btn) => {
              const productId = btn.getAttribute("data-product-id")
              if (data.wishlistItems.includes(productId)) {
                btn.classList.add("active")
                btn.setAttribute("data-in-wishlist", "true")
                const icon = btn.querySelector("i")
                if (icon) {
                  icon.classList.remove("bi-heart")
                  icon.classList.add("bi-heart-fill")
                }
              }
            })
          }
        })
        .catch((error) => {
          })
    }
    checkWishlistStatus()
    const wishlistBtns = document.querySelectorAll(".wishlist-btn")
  
    if (wishlistBtns.length) {
      wishlistBtns.forEach((btn) => {
        btn.addEventListener("click", function (e) {
          e.preventDefault()
          e.stopPropagation()
  
          const productId = this.getAttribute("data-product-id")
          if (!productId) return
          const isInWishlist = this.getAttribute("data-in-wishlist") === "true"
          const icon = this.querySelector("i")
          if (icon) {
            if (!isInWishlist) {
              icon.classList.remove("bi-heart")
              icon.classList.add("bi-heart-fill")
              this.classList.add("active")
              this.setAttribute("data-in-wishlist", "true")
              document.querySelector("#wishlistToast .toast-body").textContent = "Product added to wishlist!"
            } else {
              icon.classList.remove("bi-heart-fill")
              icon.classList.add("bi-heart")
              this.classList.remove("active")
              this.setAttribute("data-in-wishlist", "false")
              document.querySelector("#wishlistToast .toast-body").textContent = "Product removed from wishlist!"
            }
          }
          fetch("/wishlist/" + (!isInWishlist ? "add" : "remove"), {
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
                  return
                }
                throw new Error("Network response was not ok")
              }
              return response.json()
            })
            .then((data) => {
              wishlistToast.show()
            })
            .catch((error) => {
              if (icon) {
                if (isInWishlist) {
                  icon.classList.remove("bi-heart")
                  icon.classList.add("bi-heart-fill")
                  this.classList.add("active")
                  this.setAttribute("data-in-wishlist", "true")
                } else {
                  icon.classList.remove("bi-heart-fill")
                  icon.classList.add("bi-heart")
                  this.classList.remove("active")
                  this.setAttribute("data-in-wishlist", "false")
                }
              }
            })
        })
      })
    }
    const addToCartBtns = document.querySelectorAll(".add-to-cart-btn")
  
    if (addToCartBtns.length) {
      addToCartBtns.forEach((btn) => {
        btn.addEventListener("click", function (e) {
          e.preventDefault()
  
          const productId = this.getAttribute("data-product-id")
          if (!productId) return
          fetch("/cart/add", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Requested-With": "XMLHttpRequest",
            },
            body: JSON.stringify({ productId, quantity: 1 }),
          })
            .then((response) => {
              if (!response.ok) {
                if (response.status === 401) {
                  window.location.href = "/login"
                  return
                }
                throw new Error("Network response was not ok")
              }
              return response.json()
            })
            .then((data) => {
              cartToast.show()
            })
            .catch((error) => {
              document.querySelector("#cartToast .toast-body").textContent =
                "Failed to add product to cart. Please try again."
              cartToast.show()
            })
        })
      })
    }
    const colorOptions = document.querySelectorAll(".color-option")
    const selectedColorInput = document.getElementById("selectedColor")
  
    if (colorOptions.length && selectedColorInput) {
      colorOptions.forEach((option) => {
        option.addEventListener("click", function () {
          colorOptions.forEach((opt) => opt.classList.remove("selected"))
          this.classList.add("selected")
          selectedColorInput.value = this.getAttribute("data-value") || ""
        })
      })
    }
    const priceRange = document.getElementById("priceRange")
    const minPriceInput = document.querySelector(".price-inputs input:first-child")
    const maxPriceInput = document.querySelector(".price-inputs input:last-child")
  
    if (priceRange && minPriceInput && maxPriceInput) {
      priceRange.addEventListener("input", function () {
        maxPriceInput.value = this.value
      })
  
      minPriceInput.addEventListener("change", function () {
        if (Number.parseInt(this.value) > Number.parseInt(maxPriceInput.value)) {
          this.value = maxPriceInput.value
        }
      })
  
      maxPriceInput.addEventListener("change", function () {
        if (Number.parseInt(this.value) < Number.parseInt(minPriceInput.value)) {
          this.value = minPriceInput.value
        }
        priceRange.value = this.value
      })
    }
    const filterCheckboxes = document.querySelectorAll(".filter-checkbox")
    if (filterCheckboxes.length) {
      filterCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", function () {
          if (this.checked) {
            document.getElementById("filterForm").submit()
          }
        })
      })
    }
  })
  