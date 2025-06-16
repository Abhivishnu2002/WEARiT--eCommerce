document.addEventListener("DOMContentLoaded", () => {
  const toggleForm = document.querySelector(".toggle-form")
  const Swal = window.Swal 

  if (toggleForm) {
    toggleForm.addEventListener("submit", function (e) {
      e.preventDefault()

      const isBlockAction = this.querySelector("button").classList.contains("btn-danger")
      const actionText = isBlockAction ? "block" : "unblock"

      Swal.fire({
        title: `Are you sure you want to ${actionText} this customer?`,
        text: isBlockAction
          ? "This will prevent the customer from logging in and placing orders."
          : "This will allow the customer to log in and place orders again.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: isBlockAction ? "#dc3545" : "#28a745",
        cancelButtonColor: "#6c757d",
        confirmButtonText: `Yes, ${actionText} customer`,
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          const formData = new FormData(this)
          const action = this.action
          const method = this.method

          Swal.fire({
            title: "Processing...",
            text: `${isBlockAction ? "Blocking" : "Unblocking"} customer`,
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading()
            },
          })

          fetch(action, {
            method: method,
            body: formData,
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error("Network response was not ok")
              }
              return response.text()
            })
            .then(() => {
              Swal.fire({
                icon: "success",
                title: "Success!",
                text: `Customer ${isBlockAction ? "blocked" : "unblocked"} successfully`,
                confirmButtonColor: "#667eea",
              }).then(() => {
                location.reload()
              })
            })
            .catch((error) => {
              Swal.fire({
                icon: "error",
                title: "Error",
                text: "An error occurred. Please try again later.",
                confirmButtonColor: "#667eea",
              })
            })
        }
      })
    })
  }
  try {
    const successMsg = document.querySelector(".alert-success")?.textContent.trim()
    const errorMsg = document.querySelector(".alert-danger")?.textContent.trim()

    if (successMsg && successMsg.length > 0) {
      Swal.fire({
        icon: "success",
        title: "Success",
        text: successMsg,
        confirmButtonColor: "#667eea",
      })
    }

    if (errorMsg && errorMsg.length > 0) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMsg,
        confirmButtonColor: "#667eea",
      })
    }
  } catch (e) {
    
  }
})
