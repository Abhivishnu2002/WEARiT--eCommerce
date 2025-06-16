document.addEventListener("DOMContentLoaded", () => {
  const bootstrap = window.bootstrap
  const paypal = window.paypal
  const Swal = window.Swal

  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
  tooltipTriggerList.map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl))

  const addMoneyForm = document.getElementById("addMoneyForm")
  const paymentMethodInputs = document.querySelectorAll('input[name="paymentMethod"]')
  const paymentMethodCards = document.querySelectorAll(".payment-method-card")
  const selectedPaymentMethodInput = document.getElementById("selectedPaymentMethod")
  const paypalButtonContainer = document.getElementById("paypal-button-container")
  const loadingOverlay = document.getElementById("loading-overlay")
  const loadingMessage = document.getElementById("loading-message")

  updateSelectedCard()
  paymentMethodInputs.forEach((input) => {
    input.addEventListener("change", function () {
      if (selectedPaymentMethodInput) {
        selectedPaymentMethodInput.value = this.value
      }
      updateSelectedCard()

      if (this.value === "paypal" && paypalButtonContainer) {
        paypalButtonContainer.classList.remove("d-none")
        document.getElementById("proceed-btn").classList.add("d-none")
      } else if (paypalButtonContainer) {
        paypalButtonContainer.classList.add("d-none")
        document.getElementById("proceed-btn").classList.remove("d-none")
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

  if (paypalButtonContainer && typeof paypal !== "undefined") {
    paypal
      .Buttons({
        style: {
          layout: "vertical",
          color: "black",
          shape: "rect",
          label: "pay",
        },

        createOrder: (data, actions) => {
          const amount = document.getElementById("amount").value

          if (!amount || Number.parseFloat(amount) <= 0) {
            Swal.fire({
              icon: "error",
              title: "Invalid Amount",
              text: "Please enter a valid amount greater than 0",
            })
            return null
          }

          showLoading("Initializing PayPal payment...")
          return fetch("/wallet/paypal/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: Number.parseFloat(amount),
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

              if (!data.success || !data.approvalUrl) {
                Swal.fire({
                  icon: "error",
                  title: "Error",
                  text: data.message || "Failed to create PayPal payment",
                })
                return null
              }
              const urlParams = new URLSearchParams(new URL(data.approvalUrl).search)
              const token = urlParams.get("token")

              if (!token) {
                Swal.fire({
                  icon: "error",
                  title: "Error",
                  text: "No PayPal token found",
                })
                return null
              }

              return token
            })
            .catch((err) => {
              hideLoading()
              Swal.fire({
                icon: "error",
                title: "Error",
                text: "Failed to create PayPal payment: " + err.message,
              })
              return null
            })
        },

        onApprove: (data, actions) => {
          showLoading("Confirming your payment with PayPal...")
          window.location.href = "/wallet/paypal/success?token=" + data.orderID + "&PayerID=" + data.payerID
        },

        onCancel: (data) => {
          showLoading("Cancelling your payment...")
          window.location.href = "/wallet/paypal/cancel"
        },

        onError: (err) => {
          hideLoading()
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "An error occurred with PayPal: " + err.message,
          })
        },
      })
      .render("#paypal-button-container")
  }

  if (addMoneyForm) {
    addMoneyForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const amount = document.getElementById("amount").value
      const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value

      if (!amount || Number.parseFloat(amount) <= 0) {
        Swal.fire({
          icon: "error",
          title: "Invalid Amount",
          text: "Please enter a valid amount greater than 0",
        })
        return
      }

      if (paymentMethod === "paypal") {
        return
      }

      Swal.fire({
        title: "Processing...",
        text: "Please wait while we process your payment",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        },
      })

      fetch("/wallet/add-money", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number.parseFloat(amount),
          paymentMethod: paymentMethod,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            if (data.usePayPal) {
              fetch("/wallet/paypal/create", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  amount: Number.parseFloat(amount),
                }),
              })
                .then((response) => response.json())
                .then((paypalData) => {
                  if (paypalData.success && paypalData.approvalUrl) {
                    window.location.href = paypalData.approvalUrl
                  } else {
                    Swal.fire({
                      icon: "error",
                      title: "Error",
                      text: paypalData.message || "Failed to create PayPal payment",
                      confirmButtonText: "OK",
                    })
                  }
                })
                .catch((error) => {
                  Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "An error occurred. Please try again.",
                    confirmButtonText: "OK",
                  })
                })
            } else {
              Swal.fire({
                icon: "success",
                title: "Success",
                text: data.message,
                confirmButtonText: "OK",
              }).then(() => {
                window.location.reload()
              })
            }
          } else {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: data.message || "Failed to add money to wallet",
              confirmButtonText: "OK",
            })
          }
        })
        .catch((error) => {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "An error occurred. Please try again.",
            confirmButtonText: "OK",
          })
        })
    })
  }

  document.querySelectorAll(".pagination .page-link").forEach((link) => {
    link.addEventListener("click", function (e) {
      if (this.parentElement.classList.contains("disabled") || this.parentElement.classList.contains("active")) {
        e.preventDefault()
        return
      }
    })
  })
})
