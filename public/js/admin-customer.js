document.addEventListener("DOMContentLoaded", () => {
    try {
      const successMsg = document.querySelector(".alert-success")?.textContent.trim()
      const errorMsg = document.querySelector(".alert-danger")?.textContent.trim()
  
      if (successMsg && successMsg.length > 0) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: successMsg,
          confirmButtonColor: "#0d6efd",
        })
      }
  
      if (errorMsg && errorMsg.length > 0) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: errorMsg,
          confirmButtonColor: "#0d6efd",
        })
      }
    } catch (e) {
      console.log("Flash message check error:", e)
    }
 
    const toggleForms = document.querySelectorAll(".toggle-form")
  
    toggleForms.forEach((form) => {
      const checkbox = form.querySelector('input[type="checkbox"]')
  
      if (checkbox) {
        const originalChecked = checkbox.checked

        checkbox.addEventListener("change", function (e) {

          e.preventDefault()
          e.stopPropagation()
  
          this.checked = originalChecked

          const action = originalChecked ? "Unblocking" : "Blocking"
          Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
            text:'Processing...',
            icon: action === "processing",
          }).then((result) => {
            if (result.isConfirmed) {
              Swal.fire({
                title: "Processing...",
                html: `Please wait while we ${action} this user`,
                allowOutsideClick: false,
                didOpen: () => {
                  Swal.showLoading()
                  form.submit()
                },
              })
            }
          })
  
          return false
        })
      }
    })
  })
  