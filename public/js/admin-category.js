document.addEventListener("DOMContentLoaded", () => {
    // Initialize tooltips
    if (typeof bootstrap !== "undefined" && bootstrap.Tooltip) {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl)
        })
    }

    // Category offer validation
    const categoryOfferInput = document.getElementById("categoryOffer")
    if (categoryOfferInput) {
        // Real-time validation for offer input
        function validateOfferValue() {
            const offerValue = parseInt(categoryOfferInput.value)

            // Clear any existing validation
            clearOfferValidation()

            if (categoryOfferInput.value !== "" && (isNaN(offerValue) || offerValue < 0 || offerValue > 99)) {
                showOfferValidationError("Offer percentage must be between 0 and 99")
                return false
            }
            return true
        }

        // Show validation error
        function showOfferValidationError(message) {
            const errorElement = document.getElementById("categoryOffer-error")

            // Add error styling to input
            categoryOfferInput.classList.remove("is-valid")
            categoryOfferInput.classList.add("is-invalid")

            // Show error message
            if (errorElement) {
                errorElement.textContent = message
                errorElement.style.display = "block"
                errorElement.style.color = "#dc3545"
                errorElement.classList.add("d-block")
            } else {
                // Fallback: create error element if it doesn't exist
                const newErrorElement = document.createElement("div")
                newErrorElement.id = "categoryOffer-error"
                newErrorElement.className = "invalid-feedback d-block"
                newErrorElement.style.color = "#dc3545"
                newErrorElement.style.fontSize = "0.875rem"
                newErrorElement.style.marginTop = "0.25rem"
                newErrorElement.textContent = message
                categoryOfferInput.parentNode.insertBefore(newErrorElement, categoryOfferInput.nextSibling)
            }
        }

        // Clear validation error
        function clearOfferValidation() {
            const errorElement = document.getElementById("categoryOffer-error")

            // Remove error styling from input
            categoryOfferInput.classList.remove("is-invalid", "is-valid")

            // Hide error message
            if (errorElement) {
                errorElement.textContent = ""
                errorElement.style.display = "none"
                errorElement.classList.remove("d-block")
            }
        }

        // Add event listeners for real-time validation
        categoryOfferInput.addEventListener("input", validateOfferValue)
        categoryOfferInput.addEventListener("blur", validateOfferValue)

        // Form submission validation
        const categoryForm = categoryOfferInput.closest("form")
        if (categoryForm) {
            categoryForm.addEventListener("submit", function(event) {
                if (!validateOfferValue()) {
                    event.preventDefault()

                    // Focus on the invalid input
                    categoryOfferInput.focus()

                    // Scroll to the field if needed
                    categoryOfferInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            })
        }
    }

    const deleteButtons = document.querySelectorAll(".delete-btn")
    deleteButtons.forEach((button) => {
      button.addEventListener("click", function () {
        if (this.disabled) {
          Swal.fire({
            title: "Cannot Delete",
            text: "This category has associated products and cannot be deleted",
            icon: "warning",
            confirmButtonColor: "#000",
          })
          return
        }
  
        const categoryId = this.getAttribute("data-id")
        const categoryName = this.getAttribute("data-name")
  
        Swal.fire({
          title: "Are you sure?",
          text: `Do you want to delete the category "${categoryName}"?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: "Yes, delete it!",
        }).then((result) => {
          if (result.isConfirmed) {
            Swal.fire({
              title: "Deleting...",
              html: "Please wait while we delete the category",
              allowOutsideClick: false,
              didOpen: () => {
                Swal.showLoading()
              },
            })

            fetch(`/admin/deletecategory/${categoryId}`, {
              method: "DELETE",
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.success) {
                  Swal.fire({
                    title: "Deleted!",
                    text: "Category has been deleted successfully.",
                    icon: "success",
                    confirmButtonColor: "#000",
                  }).then(() => {
                    window.location.reload()
                  })
                } else {
                  Swal.fire({
                    title: "Error!",
                    text: data.message,
                    icon: "error",
                    confirmButtonColor: "#000",
                  })
                }
              })
              .catch((error) => {
                Swal.fire({
                  title: "Error!",
                  text: "There was a problem deleting the category.",
                  icon: "error",
                  confirmButtonColor: "#000",
                })
              })
          }
        })
      })
    })

    const toggleForms = document.querySelectorAll(".toggle-form")
    toggleForms.forEach((form) => {
      const checkbox = form.querySelector('input[type="checkbox"]')
      checkbox.addEventListener("change", () => {
        const isChecked = checkbox.checked
        const action = isChecked ? "list" : "unlist"
  
        Swal.fire({
          title: `${action.charAt(0).toUpperCase() + action.slice(1)} Category?`,
          text: `Are you sure you want to ${action} this category?`,
          icon: "question",
          showCancelButton: true,
          confirmButtonColor: "#000",
          cancelButtonColor: "#6c757d",
          confirmButtonText: `Yes, ${action} it!`,
        }).then((result) => {
          if (result.isConfirmed) {
            Swal.fire({
              title: "Processing...",
              html: `Please wait while we ${action} the category`,
              allowOutsideClick: false,
              didOpen: () => {
                Swal.showLoading()
                form.submit()
              },
            })
          } else {
            checkbox.checked = !isChecked
          }
        })
      })
    })
  })
  