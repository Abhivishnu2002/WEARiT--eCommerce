document.addEventListener("DOMContentLoaded", () => {
  const Swal = window.Swal

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

  const toggleForms = document.querySelectorAll(".toggle-form")

  toggleForms.forEach((form) => {
    form.addEventListener("submit", function (e) {
      e.preventDefault()

      const isBlockAction = !form.querySelector('input[type="checkbox"]')?.checked
      const actionText = isBlockAction ? "block" : "unblock"
      const customerName = this.closest("tr").querySelector(".customer-name")?.textContent.trim() || "this customer"

      Swal.fire({
        title: `Are you sure you want to ${actionText} ${customerName}?`,
        text: isBlockAction
          ? "This will prevent the customer from logging in and placing orders."
          : "This will allow the customer to log in and place orders again.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: isBlockAction ? "#dc3545" : "#28a745",
        cancelButtonColor: "#6c757d",
        confirmButtonText: `Yes, ${actionText}`,
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: "Processing...",
            text: `${isBlockAction ? "Blocking" : "Unblocking"} customer`,
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading()
              form.submit()
            },
          })
        }
      })
    })
  })
  const searchForm = document.querySelector('form[action="/admin/customer"]')
  if (searchForm) {
    const searchInput = searchForm.querySelector('input[name="search"]')

    searchForm.addEventListener("submit", (e) => {
      if (searchInput && searchInput.value.trim() === "") {
        e.preventDefault()
        window.location.href = "/admin/customer"
      }
    })
  }
})
