document.addEventListener("DOMContentLoaded", () => {
    const mobileMenuToggle = document.getElementById("mobileMenuToggle")
    const closeMenu = document.getElementById("closeMenu")
    const mobileMenu = document.getElementById("mobileMenu")
    const menuOverlay = document.getElementById("menuOverlay")
  
    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener("click", () => {
        mobileMenu.classList.add("active")
        menuOverlay.classList.add("active")
        document.body.style.overflow = "hidden"
      })
    }
  
    if (closeMenu) {
      closeMenu.addEventListener("click", closeMenuFunction)
    }
  
    if (menuOverlay) {
      menuOverlay.addEventListener("click", closeMenuFunction)
    }
  
    function closeMenuFunction() {
      mobileMenu.classList.remove("active")
      menuOverlay.classList.remove("active")
      document.body.style.overflow = ""
    }
  
    const userIcon = document.querySelector(".user-icon")
    const userDropdown = document.querySelector(".user-dropdown")
    let dropdownTimeout
  
    if (userIcon && userDropdown) {
      userIcon.addEventListener("click", (e) => {
        e.stopPropagation()
        userDropdown.classList.toggle("show")
      })
  
      userDropdown.addEventListener("mouseenter", () => {
        clearTimeout(dropdownTimeout)
      })
  
      userDropdown.addEventListener("mouseleave", () => {
        dropdownTimeout = setTimeout(() => {
          userDropdown.classList.remove("show")
        }, 500)
      })
  
      document.addEventListener("click", (e) => {
        if (!userIcon.contains(e.target) && !userDropdown.contains(e.target)) {
          userDropdown.classList.remove("show")
        }
      })
    }
  
    const searchInput = document.getElementById("searchInput")
    const searchResults = document.getElementById("searchResults")
    let debounceTimer
  
    if (searchInput && searchResults) {
      const fetchSearchResults = async (query) => {
        try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
          const data = await response.json()

          searchResults.innerHTML = ""
  
          if (data.products.length > 0) {
            data.products.forEach((product) => {
              const resultItem = document.createElement("a")
              resultItem.href = `/products/${product.id}`
              resultItem.className = "search-result-item"
              resultItem.innerHTML = `
                              <img src="${product.imageUrl}" alt="${product.name}" class="search-result-image">
                              <div class="search-result-name">${product.name}</div>
                          `
              searchResults.appendChild(resultItem)
            })
  
            const viewAllLink = document.createElement("a")
            viewAllLink.href = `/products?search=${encodeURIComponent(query)}`
            viewAllLink.className = "search-all-link"
            viewAllLink.textContent = "View all results"
            searchResults.appendChild(viewAllLink)
  
            searchResults.classList.add("show")
          } else {
            const noResults = document.createElement("div")
            noResults.className = "no-results"
            noResults.textContent = "No products found"
            searchResults.appendChild(noResults)
            searchResults.classList.add("show")
          }
        } catch (e) {
    
  }
      }
  
      searchInput.addEventListener("input", function () {
        const query = this.value.trim()
        clearTimeout(debounceTimer)
        if (query === "") {
          searchResults.innerHTML = ""
          searchResults.classList.remove("show")
          return
        }
        debounceTimer = setTimeout(() => {
          fetchSearchResults(query)
        }, 300)
      })

      document.addEventListener("click", (event) => {
        if (!searchInput.contains(event.target) && !searchResults.contains(event.target)) {
          searchResults.classList.remove("show")
        }
      })

      searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault()
          const query = this.value.trim()
          if (query) {
            window.location.href = `/products?search=${encodeURIComponent(query)}`
          }
        }
      })
    }

    // Function to update cart and wishlist counts in header
    window.updateHeaderCounts = function() {
      fetch('/api/cart-wishlist-counts')
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            updateCartCount(data.cartCount)
            updateWishlistCount(data.wishlistCount)
          }
        })
        .catch(error => {
          })
    }

    function updateCartCount(count) {
      const cartCountElement = document.getElementById('headerCartCount')
      const cartContainer = cartCountElement ? cartCountElement.parentElement : null

      if (count > 0) {
        if (cartCountElement) {
          cartCountElement.textContent = count
          cartCountElement.style.display = 'flex'
        } else if (cartContainer) {
          // Create count badge if it doesn't exist
          const badge = document.createElement('span')
          badge.className = 'count-badge cart-count'
          badge.id = 'headerCartCount'
          badge.textContent = count
          cartContainer.appendChild(badge)
        }
      } else {
        if (cartCountElement) {
          cartCountElement.style.display = 'none'
        }
      }
    }

    function updateWishlistCount(count) {
      const wishlistCountElement = document.getElementById('headerWishlistCount')
      const wishlistContainer = wishlistCountElement ? wishlistCountElement.parentElement : null

      if (count > 0) {
        if (wishlistCountElement) {
          wishlistCountElement.textContent = count
          wishlistCountElement.style.display = 'flex'
        } else if (wishlistContainer) {
          // Create count badge if it doesn't exist
          const badge = document.createElement('span')
          badge.className = 'count-badge wishlist-count'
          badge.id = 'headerWishlistCount'
          badge.textContent = count
          wishlistContainer.appendChild(badge)
        }
      } else {
        if (wishlistCountElement) {
          wishlistCountElement.style.display = 'none'
        }
      }
    }

    // Update counts on page load if user is logged in
    if (document.querySelector('.user-dropdown')) {
      updateHeaderCounts()
    }
  })
  