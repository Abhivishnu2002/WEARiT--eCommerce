document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("toastContainer")) {
    const toastContainer = document.createElement("div")
    toastContainer.id = "toastContainer"
    toastContainer.className = "toast-container position-fixed bottom-0 end-0 p-3"
    document.body.appendChild(toastContainer)
  }

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

  const copyButtons = document.querySelectorAll(".copy-coupon")

  copyButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const couponCode = this.getAttribute("data-coupon")
      navigator.clipboard
        .writeText(couponCode)
        .then(() => {
          const originalHTML = this.innerHTML
          this.innerHTML = '<i class="fas fa-check"></i> Copied!'
          this.classList.add("copied")
          showToast(`Coupon code ${couponCode} copied to clipboard!`, "success")
          setTimeout(() => {
            this.innerHTML = originalHTML
            this.classList.remove("copied")
          }, 2000)
        })
        .catch((err) => {
          console.error("Could not copy text: ", err)
          showToast("Failed to copy coupon code", "danger")
        })
    })
  })
})
