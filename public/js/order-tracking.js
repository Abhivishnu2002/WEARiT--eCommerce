document.addEventListener("DOMContentLoaded", () => {
  updateProgressLine()
  animateTimelineItems()
  addPulseAnimation()
  addHoverEffects()
  window.addEventListener("resize", updateProgressLine)
  if (typeof bootstrap !== "undefined" && bootstrap.Tooltip) {
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    tooltips.forEach((tooltip) => {
      new bootstrap.Tooltip(tooltip)
    })
  }
  setupReturnOrderButton()
  setupCancelOrderButton()
})
function updateProgressLine() {
  const progressLine = document.querySelector(".progress-line")
  if (!progressLine) return

  const completedSteps = document.querySelectorAll(".progress-step.completed").length
  const totalSteps = document.querySelectorAll(".progress-step").length - 1

  if (completedSteps > 0 && totalSteps > 0) {
    const progressPercentage = (completedSteps / totalSteps) * 100
    progressLine.style.width = `${progressPercentage}%`
  }
  if (window.innerWidth < 768) {
    const progressSteps = document.querySelectorAll(".progress-step")
    progressSteps.forEach((step, index) => {
      if (index < progressSteps.length - 1 && step.classList.contains("completed")) {
        step.classList.add("mobile-completed")
      }
    })
  }
}
function animateTimelineItems() {
  const timelineItems = document.querySelectorAll(".timeline-item")
  if (!timelineItems.length) return

  timelineItems.forEach((item, index) => {
    setTimeout(
      () => {
        item.style.opacity = "1"
        item.style.transform = "translateY(0)"
      },
      300 + index * 150,
    )
  })
}

function addPulseAnimation() {
  const activeStepIcon = document.querySelector(".progress-step.active .step-icon-container")
  if (activeStepIcon) {
    activeStepIcon.classList.add("pulse")
  }
}

function addHoverEffects() {
  const productRows = document.querySelectorAll(".product-row")
  productRows.forEach((row) => {
    row.addEventListener("mouseenter", function () {
      this.style.backgroundColor = "var(--light-color)"
    })

    row.addEventListener("mouseleave", function () {
      this.style.backgroundColor = ""
    })
  })
  const infoCards = document.querySelectorAll(".order-info-card")
  infoCards.forEach((card) => {
    card.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-5px)"
      this.style.boxShadow = "var(--shadow-md)"
    })

    card.addEventListener("mouseleave", function () {
      this.style.transform = ""
      this.style.boxShadow = "var(--shadow-sm)"
    })
  })
  const timelineContents = document.querySelectorAll(".timeline-content")
  timelineContents.forEach((content) => {
    content.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-5px)"
      this.style.boxShadow = "var(--shadow-md)"
    })

    content.addEventListener("mouseleave", function () {
      this.style.transform = ""
      this.style.boxShadow = "var(--shadow-sm)"
    })
  })
}
function setupReturnOrderButton() {
  const returnOrderBtn = document.querySelector(".return-order-btn")
  if (!returnOrderBtn) return

  returnOrderBtn.addEventListener("click", function () {
    const orderId = this.getAttribute("data-order-id")

    if (typeof Swal === "undefined") {
      return
    }

    Swal.fire({
      title: "Return Order",
      html: `
        <div class="text-start mb-4">
          <p>Please provide a reason for returning this order:</p>
          <select id="return-reason" class="form-select mb-3">
            <option value="">Select a reason</option>
            <option value="Wrong size">Wrong size</option>
            <option value="Damaged product">Damaged product</option>
            <option value="Not as described">Not as described</option>
            <option value="Changed my mind">Changed my mind</option>
            <option value="Other">Other</option>
          </select>
          <textarea id="return-details" class="form-control" placeholder="Additional details (optional)" rows="3"></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Submit Return Request",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#000",
      cancelButtonColor: "#6c757d",
      focusConfirm: false,
      preConfirm: () => {
        const reason = document.getElementById("return-reason").value
        const details = document.getElementById("return-details").value

        if (!reason) {
          Swal.showValidationMessage("Please select a reason for return")
          return false
        }

        const returnReason = details ? `${reason}: ${details}` : reason

        return fetch(`/orders/return/${orderId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: returnReason }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (!data.success) {
              throw new Error(data.message || "Failed to process return request")
            }
            return data
          })
          .catch((error) => {
            Swal.showValidationMessage(`Request failed: ${error.message}`)
          })
      },
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: "success",
          title: "Return Request Submitted",
          text: "Your return request has been submitted successfully. We will process it shortly.",
          confirmButtonColor: "#000",
        }).then(() => {
          window.location.reload()
        })
      }
    })
  })
}

function setupCancelOrderButton() {
  const cancelOrderBtn = document.querySelector(".cancel-order-btn")
  if (!cancelOrderBtn) return

  cancelOrderBtn.addEventListener("click", function () {
    const orderId = this.getAttribute("data-order-id")

    if (typeof Swal === "undefined") {
      return
    }

    Swal.fire({
      title: "Cancel Order",
      text: "Are you sure you want to cancel this order?",
      icon: "warning",
      input: "textarea",
      inputLabel: "Reason for cancellation (optional)",
      inputPlaceholder: "Please provide a reason for cancellation",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, cancel it",
      cancelButtonText: "No, keep it",
    }).then((result) => {
      if (result.isConfirmed) {
        const reason = result.value || ""

        fetch(`/orders/cancel/${orderId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              Swal.fire({
                icon: "success",
                title: "Order Cancelled",
                text: "Your order has been cancelled successfully.",
                confirmButtonColor: "#000",
              }).then(() => {
                window.location.reload()
              })
            } else {
              Swal.fire({
                icon: "error",
                title: "Error",
                text: data.message || "Failed to cancel order.",
                confirmButtonColor: "#000",
              })
            }
          })
          .catch((error) => {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: "Something went wrong. Please try again.",
              confirmButtonColor: "#000",
            })
          })
      }
    })
  })
}
