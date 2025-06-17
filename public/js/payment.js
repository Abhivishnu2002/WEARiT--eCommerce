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

  async function validateStock() {
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

        hideLoading()

        await Swal.fire({
          title: 'Error',
          text: data.message || 'Failed to validate cart',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#1a1a1a'
        })
        return false
      }

      if (data.hasUnavailableProducts && data.unavailableProducts.length > 0) {

        hideLoading()

        let unavailableMessage = '<div class="unavailable-products">'
        unavailableMessage += '<p><strong>The following products are no longer available:</strong></p>'
        unavailableMessage += '<ul style="text-align: left; margin: 10px 0;">'

        data.unavailableProducts.forEach(item => {
          unavailableMessage += `<li><strong>${item.productName}</strong> (Size: ${item.size}) - ${item.reason}</li>`
        })

        unavailableMessage += '</ul>'
        unavailableMessage += '<p>Please remove these items from your cart to continue.</p>'
        unavailableMessage += '</div>'

        const result = await Swal.fire({
          title: 'Products Unavailable',
          html: unavailableMessage,
          icon: 'error',
          showCancelButton: true,
          confirmButtonText: 'Go to Cart',
          cancelButtonText: 'Stay Here',
          confirmButtonColor: '#1a1a1a',
          cancelButtonColor: '#6c757d'
        })

        if (result.isConfirmed) {
          window.location.href = '/cart'
        }

        return false
      }

      if (data.hasStockIssues && data.stockIssues.length > 0) {

        hideLoading()

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

        const result = await Swal.fire({
          title: 'Stock Issues Detected',
          html: stockMessage,
          icon: 'error',
          showCancelButton: true,
          confirmButtonText: 'Go to Cart',
          cancelButtonText: 'Stay Here',
          confirmButtonColor: '#1a1a1a',
          cancelButtonColor: '#6c757d'
        })

        if (result.isConfirmed) {
          window.location.href = '/cart'
        }

        return false
      }

      return true

    } catch (error) {

      hideLoading()

      await Swal.fire({
        title: 'Error',
        text: 'Failed to validate cart. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#1a1a1a'
      })

      return false
    }
  }

  const orderId = hiddenOrderId ? hiddenOrderId.value : ""
  let paypalInitialized = false
  const paypal = window.paypal
  const Razorpay = window.Razorpay

  function validateDOMElements() {
    const requiredElements = {
      loadingOverlay: loadingOverlay,
      loadingMessage: loadingMessage,
    }

    for (const [name, element] of Object.entries(requiredElements)) {
      if (!element) {
        }
    }
  }

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

      loadingOverlay.style.display = "block"
      loadingOverlay.style.zIndex = "1050"
    }
  }

  function hideLoading() {
    if (loadingOverlay) {
      loadingOverlay.classList.add("d-none")

      loadingOverlay.style.display = "none"
      loadingOverlay.style.zIndex = "-1"
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

  function handleRazorpayError(error, orderId) {

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

          const errorMessage = getErrorMessage(error)
          showError(errorMessage, "razorpay")
        }
      })
      .catch((err) => {
        const errorMessage = getErrorMessage(error)
        showError(errorMessage, "razorpay")
      })
  }

  function getErrorMessage(error) {
    if (!error) return "Payment failed. Please try again."

    const errorCode = error.code || error.error?.code
    const errorDescription = error.description || error.error?.description || error.reason

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

  if (paypalButtonContainer && typeof paypal !== "undefined") {
    paypal
      .Buttons({
        style: {
          layout: "vertical",
          color: "blue",
          shape: "rect",
          label: "pay",
        },

        createOrder: async (data, actions) => {
          if (!paypalInitialized) {
            showLoading("Validating cart...")
          }

          const stockValid = await validateStock()
          hideLoading() // Always hide loading after validation
          if (!stockValid) {
            return null
          }

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

              if (!data.success) {
                showError("Error creating PayPal payment: " + (data.message || "Unknown error"), "paypal")
                return null
              }

              if (data.orderId && hiddenOrderId) {
                hiddenOrderId.value = data.orderId
              }

              // Return the PayPal order ID directly
              if (data.paypalOrderId) {
                console.log("PayPal order created successfully:", data.paypalOrderId)
                return data.paypalOrderId
              }

              // Fallback: try to extract token from approval URL
              if (data.approvalUrl) {
                const urlParams = new URLSearchParams(new URL(data.approvalUrl).search)
                const token = urlParams.get("token")
                if (token) {
                  console.log("PayPal token extracted from URL:", token)
                  return token
                }
              }

              showError("No PayPal order ID received", "paypal")
              return null
            })
            .catch((err) => {
              hideLoading()
              showError("Error creating PayPal payment: " + err.message, "paypal")
              return null
            })
        },

        onApprove: (data, actions) => {
          showLoading("Confirming your payment with PayPal...")
          const currentOrderId = hiddenOrderId ? hiddenOrderId.value : orderId
          console.log("PayPal onApprove called:", { orderID: data.orderID, payerID: data.payerID, currentOrderId })
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
          showError("An error occurred with PayPal: " + err.message, "paypal")
        },
      })
      .render("#paypal-button-container")
      .catch((err) => {
        showError("Failed to load PayPal payment option", "paypal")
      })
  }

  if (razorpayButtonContainer && typeof Razorpay !== "undefined") {
    const razorpayBtn = document.getElementById("razorpay-pay-btn")
    if (razorpayBtn) {
      razorpayBtn.addEventListener("click", async () => {
        try {
          showLoading("Validating cart...")
          hideErrors()

          const stockValid = await validateStock()
          hideLoading() // Always hide loading after validation
          if (!stockValid) {
            return
          }

          showLoading("Initializing Razorpay payment...")

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
          console.log("Razorpay order creation response:", data)
          hideLoading()

          if (!data.success) {
            console.log("Razorpay order creation failed:", data)
            const errorMessage = data.message || "Error creating Razorpay payment"
            showError(errorMessage, "razorpay")

            if (data.retryable === false) {
              setTimeout(() => {
                window.location.href = `/order-failure/${data.orderId || orderId}`
              }, 3000)
            }
            return
          }

          console.log("Razorpay order created successfully:", data.razorpayOrderId)
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
              console.log("Razorpay payment success, verifying:", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                orderId: data.orderId
              })

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
                console.log("Razorpay verification response:", verifyData)
                hideLoading()

                if (verifyData.success) {
                  console.log("Razorpay verification successful, redirecting to success")
                  window.location.href = verifyData.redirectUrl || `/order-success/${data.orderId}`
                } else {
                  console.log("Razorpay verification failed:", verifyData)
                  const errorMessage = verifyData.message || "Payment verification failed"
                  showError(errorMessage, "razorpay")

                  setTimeout(() => {
                    window.location.href = verifyData.redirectUrl || `/order-failure/${data.orderId}`
                  }, 3000)
                }
              } catch (err) {
                console.error("Razorpay verification error:", err)
                hideLoading()
                const errorMessage = "Error verifying payment: " + err.message
                showError(errorMessage, "razorpay")

                setTimeout(() => {
                  window.location.href = `/order-failure/${data.orderId}`
                }, 3000)
              }
            },
            modal: {
              ondismiss: () => {
                hideLoading()
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
          const errorMessage = "Error creating Razorpay payment: " + err.message
          showError(errorMessage, "razorpay")
        }
      })
    }
  }

  paymentMethodInputs.forEach((input) => {
    input.addEventListener("change", () => {
      updateSelectedCard()
      hideErrors()

      console.log("Payment method changed to:", input.value)

      if (selectedPaymentMethodInput) {
        selectedPaymentMethodInput.value = input.value
      }

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

  const initialSelectedInput = document.querySelector('input[name="paymentMethod"]:checked')
  if (initialSelectedInput) {
    const event = new Event("change")
    initialSelectedInput.dispatchEvent(event)
  }

  if (orderForm) {
    orderForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked')
      if (!selectedMethod) {
        await Swal.fire({
          title: 'Payment Method Required',
          text: 'Please select a payment method',
          icon: 'warning',
          confirmButtonText: 'OK',
          confirmButtonColor: '#1a1a1a'
        })
        return
      }

      // Update the hidden input with selected payment method
      if (selectedPaymentMethodInput) {
        selectedPaymentMethodInput.value = selectedMethod.value
      }

      console.log("Form submission - Selected payment method:", selectedMethod.value)

      if (selectedMethod.value === "paypal" || selectedMethod.value === "razorpay") {
        return
      }

      showLoading("Validating cart...")
      const stockValid = await validateStock()
      hideLoading() // Always hide loading after validation
      if (!stockValid) {
        return
      }

      showLoading("Processing your order...")

      // Create JSON payload for the request
      const requestData = {
        addressId: document.querySelector('input[name="addressId"]')?.value,
        paymentMethod: selectedMethod.value,
        selectedPaymentMethod: selectedMethod.value,
        orderId: document.querySelector('input[name="orderId"]')?.value || ''
      }

      console.log("Form data being sent:", requestData)

      try {
        const response = await fetch(orderForm.action, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
          credentials: 'same-origin'
        })

        if (response.redirected) {
          window.location.href = response.url
        } else {
          const contentType = response.headers.get('content-type')

          if (contentType && contentType.includes('application/json')) {
            const result = await response.json()
            hideLoading()

            if (result.success) {
              if (result.redirect) {
                window.location.href = result.redirect
              } else {
                window.location.href = '/'
              }
            } else {
              await Swal.fire({
                title: 'Payment Failed',
                text: result.message || 'There was an error processing your payment. Please try again.',
                icon: 'error',
                confirmButtonText: 'OK',
                confirmButtonColor: '#1a1a1a'
              })

              if (result.redirect) {
                setTimeout(() => {
                  window.location.href = result.redirect
                }, 2000)
              }
            }
          } else {
            const result = await response.text()
            hideLoading()

            if (result.includes('error') || !response.ok) {
              await Swal.fire({
                title: 'Payment Failed',
                text: 'There was an error processing your payment. Please try again.',
                icon: 'error',
                confirmButtonText: 'OK',
                confirmButtonColor: '#1a1a1a'
              })
            } else {
              window.location.href = '/'
            }
          }
        }
      } catch (error) {
        console.error('Payment submission error:', error)
        hideLoading()
        await Swal.fire({
          title: 'Payment Failed',
          text: 'There was an error processing your payment. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#1a1a1a'
        })
      }
    })
  }
})
