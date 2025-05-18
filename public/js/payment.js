document.addEventListener("DOMContentLoaded", () => {
  const paymentMethodInputs = document.querySelectorAll('input[name="paymentMethod"]')
  const paymentMethodCards = document.querySelectorAll(".payment-method-card")
  const selectedPaymentMethodInput = document.getElementById("selectedPaymentMethod")
  const paypalButtonContainer = document.getElementById("paypal-button-container")
  const paypalErrorContainer = document.getElementById("paypal-error")
  const placeOrderBtn = document.getElementById("place-order-btn")
  const orderForm = document.getElementById("order-form")
  const loadingOverlay = document.getElementById("loading-overlay")
  const loadingMessage = document.getElementById("loading-message")
  const hiddenOrderId = document.getElementById("hiddenOrderId")

  const orderId = hiddenOrderId ? hiddenOrderId.value : ""
  let paypalInitialized = false
  const paypal = window.paypal
  updateSelectedCard()
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

          if (paypalErrorContainer) {
            paypalErrorContainer.classList.add("d-none")
          }
          return fetch("/payment/paypal/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              orderId: orderId,
              addressId: document.querySelector('input[name="addressId"]').value,
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
                showError("Error creating PayPal payment: " + (data.message || "Unknown error"))
                return null
              }
              if (data.orderId && hiddenOrderId) {
                hiddenOrderId.value = data.orderId
              }
              const urlParams = new URLSearchParams(new URL(data.approvalUrl).search)
              const token = urlParams.get("token")

              if (!token) {
                showError("No PayPal token found")
                return null
              }

              return token
            })
            .catch((err) => {
              hideLoading()
              console.error("PayPal create order error:", err)
              showError("Error creating PayPal payment: " + err.message)
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
          showError("An error occurred with PayPal: " + err.message)
        },
      })
      .render("#paypal-button-container")
  }

  paymentMethodInputs.forEach((input) => {
    input.addEventListener("change", function () {
      if (selectedPaymentMethodInput) {
        selectedPaymentMethodInput.value = this.value
      }

      if (paypalErrorContainer) {
        paypalErrorContainer.classList.add("d-none")
      }

      updateSelectedCard()

      if (this.value === "paypal" && paypalButtonContainer) {
        paypalButtonContainer.classList.remove("d-none")
        if (placeOrderBtn) {
          placeOrderBtn.classList.add("d-none")
        }
      } else if (paypalButtonContainer) {
        paypalButtonContainer.classList.add("d-none")
        if (placeOrderBtn) {
          placeOrderBtn.classList.remove("d-none")
        }
      }
    })
  })

  paymentMethodCards.forEach((card) => {
    card.addEventListener("click", function () {
      const method = this.dataset.method
      const input = document.getElementById("paymentMethod" + method.charAt(0).toUpperCase() + method.slice(1))

      if (input && !input.disabled) {
        input.checked = true
        const event = new Event("change")
        input.dispatchEvent(event)
      }
    })
  })
  if (orderForm) {
    orderForm.addEventListener("submit", (e) => {
      const selectedMethod = selectedPaymentMethodInput ? selectedPaymentMethodInput.value : ""

      if (selectedMethod === "paypal") {
        e.preventDefault()
        return false
      }
      const paymentMethodRadios = document.querySelectorAll('input[name="paymentMethod"]')
      let selectedPaymentMethod = null

      paymentMethodRadios.forEach((radio) => {
        if (radio.checked) {
          selectedPaymentMethod = radio.value
        }
      })

      if (selectedPaymentMethod && selectedPaymentMethodInput) {
        selectedPaymentMethodInput.value = selectedPaymentMethod
        paymentMethodRadios.forEach((radio) => {
          if (!radio.checked) {
            radio.disabled = true
          }
        })
      }

      showLoading("Processing your order...")
      return true
    })
  }

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

  function showError(message) {
    if (paypalErrorContainer) {
      paypalErrorContainer.textContent = message
      paypalErrorContainer.classList.remove("d-none")
    }
  }
})
