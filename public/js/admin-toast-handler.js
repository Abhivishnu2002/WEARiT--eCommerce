document.addEventListener("DOMContentLoaded", () => {
  function showSuccessToast(message) {
    if (typeof toastr !== "undefined") {
      toastr.success(message)
    } else {
      console.warn("toastr is not defined. Ensure it is properly loaded.")
    }
  }
  function showErrorToast(message) {
    if (typeof toastr !== "undefined") {
      toastr.error(message)
    } else {
      console.warn("toastr is not defined. Ensure it is properly loaded.")
    }
  }
  function showWarningToast(message) {
    if (typeof toastr !== "undefined") {
      toastr.warning(message)
    } else {
      console.warn("toastr is not defined. Ensure it is properly loaded.")
    }
  }
  function showInfoToast(message) {
    if (typeof toastr !== "undefined") {
      toastr.info(message)
    } else {
      console.warn("toastr is not defined. Ensure it is properly loaded.")
    }
  }
  function createToastContainer() {
  }
  function processFlashMessages() {
    const successMessages = document.querySelectorAll(".alert-success")
    successMessages.forEach((alert) => {
      const message = alert.textContent.replace(/×/g, "").trim()
      if (message) {
        showSuccessToast(message)
      }
      alert.style.display = "none"
    })
    const errorMessages = document.querySelectorAll(".alert-danger")
    errorMessages.forEach((alert) => {
      const message = alert.textContent.replace(/×/g, "").trim()
      if (message) {
        showErrorToast(message)
      }
      alert.style.display = "none"
    })
    const warningMessages = document.querySelectorAll(".alert-warning")
    warningMessages.forEach((alert) => {
      const message = alert.textContent.replace(/×/g, "").trim()
      if (message) {
        showWarningToast(message)
      }
      alert.style.display = "none"
    })
    const infoMessages = document.querySelectorAll(".alert-info")
    infoMessages.forEach((alert) => {
      const message = alert.textContent.replace(/×/g, "").trim()
      if (message) {
        showInfoToast(message)
      }
      alert.style.display = "none"
    })
  }
  if (typeof createToastContainer === "function") {
    createToastContainer()
    processFlashMessages()
  } else {
    console.error("Toast notification system not loaded")
  }
  if (typeof $ !== "undefined") {
    $(document).ajaxError((event, jqXHR, settings, thrownError) => {
      showErrorToast(`Request failed: ${thrownError || jqXHR.statusText}`)
    })
  } else {
    console.warn("jQuery is not defined. Ensure it is properly loaded.")
  }
})
