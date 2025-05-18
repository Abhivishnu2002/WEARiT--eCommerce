document.addEventListener("DOMContentLoaded", () => {
  if (typeof $ !== "undefined" && $.fn.select2) {
    $(".select2").select2({
      placeholder: "Select options",
      allowClear: true,
      width: "100%",
    })
  }
  if (typeof flatpickr !== "undefined") {
    const today = new Date()
    flatpickr("#startDate", {
      enableTime: false,
      dateFormat: "Y-m-d",
      minDate: "today",
      allowInput: true,
    })
    flatpickr("#endDate", {
      enableTime: false,
      dateFormat: "Y-m-d",
      minDate: "today",
      allowInput: true,
    })
  }
  const discountTypeSelect = document.getElementById("discountType")
  const discountSymbol = document.querySelector(".discount-symbol")
  const maxDiscountContainer = document.querySelector(".max-discount-container")

  if (discountTypeSelect) {
    discountTypeSelect.addEventListener("change", function () {
      if (this.value === "percentage") {
        discountSymbol.textContent = "%"
        maxDiscountContainer.classList.remove("d-none")
      } else {
        discountSymbol.textContent = "₹"
        maxDiscountContainer.classList.add("d-none")
      }
    })
  }
  const userSpecificCheckbox = document.getElementById("userSpecific")
  const userSelectContainer = document.querySelector(".user-select-container")

  if (userSpecificCheckbox && userSelectContainer) {
    userSpecificCheckbox.addEventListener("change", function () {
      if (this.checked) {
        userSelectContainer.classList.remove("d-none")
        const userSelect = document.getElementById("applicableUsers")
        if (userSelect && userSelect.options.length === 0) {
          showInfoToast("Loading users...", "", 2000)

          fetch("/admin/api/users?active=true")
            .then((response) => {
              if (!response.ok) {
                throw new Error("Failed to fetch users")
              }
              return response.json()
            })
            .then((data) => {
              if (data.success && data.users && data.users.length > 0) {
                userSelect.innerHTML = ""
                data.users.forEach((user) => {
                  const option = document.createElement("option")
                  option.value = user._id
                  option.text = `${user.name} (${user.email})`
                  userSelect.appendChild(option)
                })
                if ($ && $.fn.select2) {
                  $(userSelect).trigger("change")
                }

                showSuccessToast(`Loaded ${data.users.length} users`)
              } else {
                showWarningToast("No active users found")
              }
            })
            .catch((error) => {
              console.error("Error fetching users:", error)
              showErrorToast(`Failed to load users: ${error.message}`)
            })
        }
      } else {
        userSelectContainer.classList.add("d-none")
      }
    })
  }
  const autoExpireCheckbox = document.getElementById("autoExpire")
  const usageLimitInput = document.getElementById("usageLimit")

  if (autoExpireCheckbox && usageLimitInput) {
    autoExpireCheckbox.addEventListener("change", function () {
      if (this.checked) {
        usageLimitInput.setAttribute("required", "required")
        if (usageLimitInput.value < 1) {
          usageLimitInput.value = 1
        }
      } else {
        usageLimitInput.removeAttribute("required")
      }
    })
    usageLimitInput.addEventListener("change", function () {
      if (autoExpireCheckbox.checked && this.value < 1) {
        showWarningToast("Usage limit must be at least 1 when auto-expire is enabled")
        this.value = 1
      }
    })
  }

  const form = document.getElementById("couponForm")
  if (form) {
    form.addEventListener("submit", (event) => {
      let isValid = true

      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
        isValid = false
        showErrorToast("Please fill in all required fields correctly")
      }
      form.classList.add("was-validated")
      const startDate = new Date(document.getElementById("startDate").value)
      const endDate = new Date(document.getElementById("endDate").value)

      if (endDate <= startDate) {
        event.preventDefault()
        isValid = false
        showErrorToast("End date must be after start date")
      }

      const discountType = document.getElementById("discountType").value
      const discountValue = Number.parseFloat(document.getElementById("discountValue").value)

      if (discountType === "percentage" && (discountValue <= 0 || discountValue > 100)) {
        event.preventDefault()
        isValid = false
        showErrorToast("Percentage discount must be between 1 and 100")
      }

      if (discountType === "fixed" && discountValue <= 0) {
        event.preventDefault()
        isValid = false
        showErrorToast("Fixed discount must be greater than 0")
      }
      const autoExpire = document.getElementById("autoExpire").checked
      const usageLimit = Number.parseInt(document.getElementById("usageLimit").value)

      if (autoExpire && usageLimit < 1) {
        event.preventDefault()
        isValid = false
        showErrorToast("Usage limit must be at least 1 when auto-expire is enabled")
      }
      const userSpecificChecked = document.getElementById("userSpecific").checked
      if (userSpecificChecked) {
        const applicableUsers = document.getElementById("applicableUsers")
        if (applicableUsers && applicableUsers.selectedOptions.length === 0) {
          event.preventDefault()
          isValid = false
          showWarningToast("You've enabled user-specific coupons but haven't selected any users")
        }
      }
      if (isValid) {
        if (typeof clearAllToasts === "function") {
          clearAllToasts()
        }
        showInfoToast("Processing your request...", "Please wait", 0)
        const loadingIndicator = document.createElement("div")
        loadingIndicator.className =
          "position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75"
        loadingIndicator.style.zIndex = "9999"
        loadingIndicator.innerHTML = `
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        `
        document.body.appendChild(loadingIndicator)
        return true
      }
    })
  }
  const generateCodeBtn = document.getElementById("generateCodeBtn")
  const codeInput = document.getElementById("code")

  if (generateCodeBtn && codeInput) {
    generateCodeBtn.addEventListener("click", () => {
      const randomCode = generateRandomCode(8)
      codeInput.value = randomCode
      showInfoToast(`Generated coupon code: ${randomCode}`)
    })
  }
  function generateRandomCode(length) {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let result = ""
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
  }
  const previewBtn = document.getElementById("previewCouponBtn")

  if (previewBtn) {
    previewBtn.addEventListener("click", (e) => {
      e.preventDefault()
      const code = document.getElementById("code").value || "SAMPLE"
      const discountType = document.getElementById("discountType").value || "percentage"
      const discountValue = document.getElementById("discountValue").value || "10"
      const minimumPurchase = document.getElementById("minimumPurchase").value || "0"
      const maximumDiscount = document.getElementById("maximumDiscount").value || ""
      const usageLimit = document.getElementById("usageLimit").value || "1"
      const description = document.getElementById("description").value || "Sample coupon description"
      if (typeof Swal !== "undefined") {
        let discountText = ""
        if (discountType === "percentage") {
          discountText = `${discountValue}% off`
          if (maximumDiscount) {
            discountText += ` (up to ₹${maximumDiscount})`
          }
        } else {
          discountText = `₹${discountValue} off`
        }

        let minPurchaseText = ""
        if (Number.parseFloat(minimumPurchase) > 0) {
          minPurchaseText = `<div class="min-purchase">Minimum purchase: ₹${minimumPurchase}</div>`
        }

        const usageLimitText = `<div class="usage-limit">Usage limit: ${usageLimit}</div>`

        Swal.fire({
          title: `<div class="coupon-code">${code}</div>`,
          html: `
            <div class="coupon-preview">
              <div class="discount-text">${discountText}</div>
              <div class="coupon-description">${description}</div>
              ${minPurchaseText}
              ${usageLimitText}
            </div>
          `,
          confirmButtonText: "Close Preview",
          customClass: {
            popup: "coupon-preview-popup",
          },
        })
      }
    })
  }
  function showInfoToast(message, title = "Info", duration = 3000) {
    if (typeof window.showInfoToast === "function") {
      window.showInfoToast(message, title, duration)
    } else {
      console.info(`${title}: ${message}`)
    }
  }

  function showSuccessToast(message, title = "Success", duration = 3000) {
    if (typeof window.showSuccessToast === "function") {
      window.showSuccessToast(message, title, duration)
    } else {
      console.log(`${title}: ${message}`)
    }
  }

  function showWarningToast(message, title = "Warning", duration = 3000) {
    if (typeof window.showWarningToast === "function") {
      window.showWarningToast(message, title, duration)
    } else {
      console.warn(`${title}: ${message}`)
    }
  }

  function showErrorToast(message, title = "Error", duration = 3000) {
    if (typeof window.showErrorToast === "function") {
      window.showErrorToast(message, title, duration)
    } else {
      console.error(`${title}: ${message}`)
    }
  }

  function clearAllToasts() {
    if (typeof window.clearAllToasts === "function") {
      window.clearAllToasts()
    } else {
      console.log("Clearing all toasts")
    }
  }
})
