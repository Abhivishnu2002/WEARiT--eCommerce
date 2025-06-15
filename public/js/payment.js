document.addEventListener("DOMContentLoaded", () => {
  const paymentMethodInputs = document.querySelectorAll('input[name="paymentMethod"]')
  const paymentMethodCards = document.querySelectorAll(".payment-method-card")
  const selectedPaymentMethodInput = document.getElementById("selectedPaymentMethod")
  const paypalButtonContainer = document.getElementById("paypal-button-container")
  const razorpayButtonContainer = document.getElementById("razorpay-button-container")
  const paypalErrorContainer = document.getElementById("paypal-error")
  const razorpayErrorContainer = document.getElementById("razorpay-error")
  const placeOrderBtn = document.getElementById("place-order-btn")
  const orderForm = document.getElementById("order-form")
  const loadingOverlay = document.getElementById("loading-overlay")
  const loadingMessage = document.getElementById("loading-message")
  const hiddenOrderId = document.getElementById("hiddenOrderId")

  const orderId = hiddenOrderId ? hiddenOrderId.value : ""
  let paypalInitialized = false
  const paypal = window.paypal
  const Razorpay = window.Razorpay

  // Validate required DOM elements exist
  function validateDOMElements() {
    const requiredElements = {
      loadingOverlay: loadingOverlay,
      loadingMessage: loadingMessage,
    }

    for (const [name, element] of Object.entries(requiredElements)) {
      if (!element) {
        console.warn(`Required DOM element '${name}' not found. Some functionality may not work correctly.`)
      }
    }
  }

  // Call validation on page load
  validateDOMElements()

  const checkedInput = document.querySelector('input[name="paymentMethod"]:checked')
  if (checkedInput && selectedPaymentMethodInput) {
    selectedPaymentMethodInput.value = checkedInput.value
  }

  updateSelectedCard()

  function updateSelectedCard() {
    const selectedInput = document.querySelector('input[name="paymentMethod"]:checked')
    if (!selectedInput) return

    const selectedMethod = selectedInput.value

    paymentMethodCards.forEach((card) => {
      if (card.dataset.method === selectedMethod) {
        card.classList.add("selected")
      } else {
        card.classList.remove("selected")
      }
    })
  }

  function showLoading(message) {
    if (loadingMessage) {
      loadingMessage.textContent = message || "Processing your payment..."
    }
    if (loadingOverlay) {
      loadingOverlay.classList.remove("d-none")
    }
  }

  function hideLoading() {
    if (loadingOverlay) {
      loadingOverlay.classList.add("d-none")
    }
  }

  function showError(message, paymentType) {
    const errorContainer = paymentType === "paypal" ? paypalErrorContainer : razorpayErrorContainer
    if (errorContainer) {
      errorContainer.textContent = message
      errorContainer.classList.remove("d-none")
    }
  }

  function hideErrors() {
    if (paypalErrorContainer) {
      paypalErrorContainer.classList.add("d-none")
    }
    if (razorpayErrorContainer) {
      razorpayErrorContainer.classList.add("d-none")
    }
  }

  // Enhanced error handling for Razorpay
  function handleRazorpayError(error, orderId) {
    console.error("Razorpay error:", error)

    // Send error details to server for logging and user feedback
    fetch("/payment/razorpay/failure", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: error,
        orderId: orderId,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl
        } else {
          // Fallback error handling
          const errorMessage = getErrorMessage(error)
          showError(errorMessage, "razorpay")
        }
      })
      .catch((err) => {
        console.error("Error sending failure data:", err)
        const errorMessage = getErrorMessage(error)
        showError(errorMessage, "razorpay")
      })
  }

  function getErrorMessage(error) {
    if (!error) return "Payment failed. Please try again."

    const errorCode = error.code || error.error?.code
    const errorDescription = error.description || error.error?.description || error.reason

    // Map common error codes to user-friendly messages
    const errorMessages = {
      BAD_REQUEST_ERROR: "Invalid payment request. Please check your details and try again.",
      GATEWAY_ERROR: "Payment gateway error. Please try again in a few moments.",
      SERVER_ERROR: "Payment service is temporarily unavailable. Please try again later.",
      NETWORK_ERROR: "Network error. Please check your connection and try again.",
      PAYMENT_DECLINED: "Payment was declined. Please try a different payment method.",
      INSUFFICIENT_FUNDS: "Insufficient funds. Please check your account balance.",
      CARD_DECLINED: "Card declined. Please try a different card or contact your bank.",
      AUTHENTICATION_FAILED: "Payment authentication failed. Please try again.",
      TIMEOUT_ERROR: "Payment timed out. Please try again.",
    }

    if (errorCode && errorMessages[errorCode]) {
      return errorMessages[errorCode]
    }

    if (errorDescription) {
      return errorDescription
    }

    return "Payment failed. Please try again or contact support."
  }

  // PayPal Integration
  if (paypalButtonContainer && typeof paypal !== "undefined") {
    paypal
      .Buttons({
        style: {
          layout: "vertical",
          color: "blue",
          shape: "rect",
          label: "pay",
        },

        createOrder: (data, actions) => {
          if (!paypalInitialized) {
            showLoading("Initializing PayPal payment...")
          }

          hideErrors()
          return fetch("/payment/paypal/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              orderId: orderId,
              addressId: document.querySelector('input[name="addressId"]')?.value,
            }),
          })
            .then((res) => {
              if (!res.ok) {
                hideLoading()
                throw new Error("Failed to create PayPal order. Status: " + res.status)
              }
              return res.json()
            })
            .then((data) => {
              hideLoading()
              paypalInitialized = true

              if (!data.success || !data.approvalUrl) {
                showError("Error creating PayPal payment: " + (data.message || "Unknown error"), "paypal")
                return null
              }
              if (data.orderId && hiddenOrderId) {
                hiddenOrderId.value = data.orderId
              }

              // Extract PayPal order ID from approval URL
              const urlParams = new URLSearchParams(new URL(data.approvalUrl).search)
              const token = urlParams.get("token")

              if (!token && data.paypalOrderId) {
                return data.paypalOrderId
              }

              if (!token) {
                showError("No PayPal token found", "paypal")
                return null
              }

              return token
            })
            .catch((err) => {
              hideLoading()
              console.error("PayPal create order error:", err)
              showError("Error creating PayPal payment: " + err.message, "paypal")
              return null
            })
        },

        onApprove: (data, actions) => {
          showLoading("Confirming your payment with PayPal...")
          const currentOrderId = hiddenOrderId ? hiddenOrderId.value : orderId
          window.location.href =
            "/payment/paypal/success?token=" + data.orderID + "&PayerID=" + data.payerID + "&orderId=" + currentOrderId
        },

        onCancel: (data) => {
          const currentOrderId = hiddenOrderId ? hiddenOrderId.value : orderId
          showLoading("Cancelling your payment...")
          window.location.href = "/payment/paypal/cancel?orderId=" + currentOrderId
        },

        onError: (err) => {
          hideLoading()
          console.error("PayPal error:", err)
          showError("An error occurred with PayPal: " + err.message, "paypal")
        },
      })
      .render("#paypal-button-container")
      .catch((err) => {
        console.error("Error rendering PayPal buttons:", err)
        showError("Failed to load PayPal payment option", "paypal")
      })
  }

  // Razorpay Integration
  if (razorpayButtonContainer && typeof Razorpay !== "undefined") {
    const razorpayBtn = document.getElementById("razorpay-pay-btn")
    if (razorpayBtn) {
      razorpayBtn.addEventListener("click", async () => {
        try {
          showLoading("Initializing Razorpay payment...")
          hideErrors()

          const addressInput = document.querySelector('input[name="addressId"]')
          if (!addressInput) {
            showError("Address information is missing. Please refresh the page and try again.", "razorpay")
            hideLoading()
            return
          }

          const response = await fetch("/payment/razorpay/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              orderId: orderId,
              addressId: addressInput.value,
            }),
          })

          const data = await response.json()
          hideLoading()

          if (!data.success) {
            const errorMessage = data.message || "Error creating Razorpay payment"
            showError(errorMessage, "razorpay")

            // If the error is retryable, don't redirect to failure page
            if (data.retryable === false) {
              setTimeout(() => {
                window.location.href = `/order-failure/${data.orderId || orderId}`
              }, 3000)
            }
            return
          }

          if (data.orderId && hiddenOrderId) {
            hiddenOrderId.value = data.orderId
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
              showLoading("Verifying your payment...")

              try {
                const verifyResponse = await fetch("/payment/razorpay/verify", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    orderId: data.orderId,
                  }),
                })

                const verifyData = await verifyResponse.json()
                hideLoading()

                if (verifyData.success) {
                  window.location.href = verifyData.redirectUrl || `/order-success/${data.orderId}`
                } else {
                  const errorMessage = verifyData.message || "Payment verification failed"
                  showError(errorMessage, "razorpay")

                  // Redirect to failure page after showing error
                  setTimeout(() => {
                    window.location.href = verifyData.redirectUrl || `/order-failure/${data.orderId}`
                  }, 3000)
                }
              } catch (err) {
                hideLoading()
                console.error("Razorpay verify error:", err)
                const errorMessage = "Error verifying payment: " + err.message
                showError(errorMessage, "razorpay")

                // Redirect to failure page
                setTimeout(() => {
                  window.location.href = `/order-failure/${data.orderId}`
                }, 3000)
              }
            },
            modal: {
              ondismiss: () => {
                hideLoading()
                console.log("Razorpay payment modal dismissed")
              },
            },
          }

          const rzp1 = new Razorpay(options)

          rzp1.on("payment.failed", (response) => {
            hideLoading()
            handleRazorpayError(response.error, data.orderId)
          })

          rzp1.open()
        } catch (err) {
          hideLoading()
          console.error("Razorpay create order error:", err)
          const errorMessage = "Error creating Razorpay payment: " + err.message
          showError(errorMessage, "razorpay")
        }
      })
    }
  }

  // Payment method selection handling
  paymentMethodInputs.forEach((input) => {
    input.addEventListener("change", () => {
      updateSelectedCard()
      hideErrors()

      if (selectedPaymentMethodInput) {
        selectedPaymentMethodInput.value = input.value
      }

      // Show/hide payment buttons based on selection
      if (input.value === "paypal") {
        if (paypalButtonContainer) paypalButtonContainer.classList.remove("d-none")
        if (razorpayButtonContainer) razorpayButtonContainer.classList.add("d-none")
        if (placeOrderBtn) placeOrderBtn.style.display = "none"
      } else if (input.value === "razorpay") {
        if (razorpayButtonContainer) razorpayButtonContainer.classList.remove("d-none")
        if (paypalButtonContainer) paypalButtonContainer.classList.add("d-none")
        if (placeOrderBtn) placeOrderBtn.style.display = "none"
      } else {
        if (paypalButtonContainer) paypalButtonContainer.classList.add("d-none")
        if (razorpayButtonContainer) razorpayButtonContainer.classList.add("d-none")
        if (placeOrderBtn) placeOrderBtn.style.display = "block"
      }
    })
  })

  // Initialize payment method display
  const initialSelectedInput = document.querySelector('input[name="paymentMethod"]:checked')
  if (initialSelectedInput) {
    const event = new Event("change")
    initialSelectedInput.dispatchEvent(event)
  }

  // Form submission handling
  if (orderForm) {
    orderForm.addEventListener("submit", (e) => {
      const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked')
      if (!selectedMethod) {
        e.preventDefault()
        alert("Please select a payment method")
        return
      }

      if (selectedMethod.value === "paypal" || selectedMethod.value === "razorpay") {
        e.preventDefault()
        return
      }

      showLoading("Processing your order...")
    })
  }
})
