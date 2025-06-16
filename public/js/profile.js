document.addEventListener("DOMContentLoaded", () => {
  const editProfileModal = document.getElementById("editProfileModal")
  const saveBasicInfoBtn = document.getElementById("saveBasicInfoBtn")
  const updateEmailBtn = document.getElementById("updateEmailBtn")
  const basicUpdateSuccess = document.getElementById("basicUpdateSuccess")
  const basicUpdateError = document.getElementById("basicUpdateError")

  let modalInstance = null
  if (editProfileModal) {
    modalInstance = new bootstrap.Modal(editProfileModal)
  }

  const profileTabs = document.getElementById("profileTabs")
  if (profileTabs) {
    profileTabs.addEventListener("shown.bs.tab", (event) => {
      const activeTabId = event.target.id

      if (activeTabId === "basic-tab") {
        saveBasicInfoBtn.classList.remove("d-none")
        updateEmailBtn.classList.add("d-none")
      } else if (activeTabId === "email-tab") {
        saveBasicInfoBtn.classList.add("d-none")
        updateEmailBtn.classList.remove("d-none")
      }
    })
  }

  if (saveBasicInfoBtn) {
    saveBasicInfoBtn.addEventListener("click", () => {
      if (basicUpdateSuccess) basicUpdateSuccess.classList.add("d-none")
      if (basicUpdateError) basicUpdateError.classList.add("d-none")

      const fullName = document.getElementById("fullName").value.trim()
      const mobile = document.getElementById("mobile").value.trim()

      if (!fullName) {
        Swal.fire({
          title: "Error!",
          text: "Full name is required",
          icon: "error",
          confirmButtonColor: "#000000",
        })
        return
      }

      if (mobile && !mobile.match(/^\d{10}$/)) {
        Swal.fire({
          title: "Error!",
          text: "Please enter a valid 10-digit phone number",
          icon: "error",
          confirmButtonColor: "#000000",
        })
        return
      }
      saveBasicInfoBtn.disabled = true
      saveBasicInfoBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...'

      fetch("/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          name: fullName,
          mobile: mobile,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            const nameElement = document.querySelector(".detail-group:nth-child(1) p")
            const mobileElement = document.querySelector(".detail-group:nth-child(3) p")

            if (nameElement) nameElement.textContent = fullName
            if (mobileElement) mobileElement.textContent = mobile || "Not provided"

            if (modalInstance) modalInstance.hide()

            Swal.fire({
              title: "Success!",
              text: data.message || "Profile updated successfully",
              icon: "success",
              confirmButtonColor: "#000000",
            }).then(() => {
              window.location.reload()
            })
          } else {
            saveBasicInfoBtn.disabled = false
            saveBasicInfoBtn.textContent = "Save Basic Info"

            Swal.fire({
              title: "Error!",
              text: data.message || "An error occurred. Please try again.",
              icon: "error",
              confirmButtonColor: "#000000",
            })
          }
        })
        .catch((error) => {
          saveBasicInfoBtn.disabled = false
          saveBasicInfoBtn.textContent = "Save Basic Info"

          Swal.fire({
            title: "Error!",
            text: "An error occurred. Please try again.",
            icon: "error",
            confirmButtonColor: "#000000",
          })
        })
    })
  }

  if (updateEmailBtn) {
    updateEmailBtn.addEventListener("click", () => {
      const newEmail = document.getElementById("newEmail").value.trim()

      if (!newEmail || !isValidEmail(newEmail)) {
        Swal.fire({
          title: "Error!",
          text: "Please enter a valid email address",
          icon: "error",
          confirmButtonColor: "#000000",
        })
        return
      }

      const currentEmail = document.getElementById("currentEmail")
      if (currentEmail && newEmail === currentEmail.value.trim()) {
        Swal.fire({
          title: "Error!",
          text: "New email must be different from your current email",
          icon: "error",
          confirmButtonColor: "#000000",
        })
        return
      }

      updateEmailBtn.disabled = true
      updateEmailBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...'

      fetch("/profile/update-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          email: newEmail,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            if (modalInstance) modalInstance.hide()
            Swal.fire({
              title: "OTP Sent!",
              text: data.message || "An OTP has been sent to your new email for verification",
              icon: "success",
              confirmButtonColor: "#000000",
            }).then(() => {
              window.location.href = "/profile/verify-email"
            })
          } else {
            updateEmailBtn.disabled = false
            updateEmailBtn.textContent = "Update Email"

            Swal.fire({
              title: "Error!",
              text: data.message || "Failed to update email",
              icon: "error",
              confirmButtonColor: "#000000",
            })
          }
        })
        .catch((error) => {
          updateEmailBtn.disabled = false
          updateEmailBtn.textContent = "Update Email"

          Swal.fire({
            title: "Error!",
            text: "An error occurred. Please try again.",
            icon: "error",
            confirmButtonColor: "#000000",
          })
        })
    })
  }

  if (editProfileModal) {
    editProfileModal.addEventListener("hidden.bs.modal", () => {
      const editBasicInfoForm = document.getElementById("editBasicInfoForm")
      if (editBasicInfoForm) editBasicInfoForm.reset()

      if (basicUpdateSuccess) basicUpdateSuccess.classList.add("d-none")
      if (basicUpdateError) basicUpdateError.classList.add("d-none")

      const editEmailForm = document.getElementById("editEmailForm")
      if (editEmailForm) editEmailForm.reset()

      const fullNameElement = document.getElementById("fullName")
      const nameTextElement = document.querySelector(".detail-group:nth-child(1) p")
      if (fullNameElement && nameTextElement) {
        fullNameElement.value = nameTextElement.textContent
      }

      const mobileElement = document.getElementById("mobile")
      const mobileTextElement = document.querySelector(".detail-group:nth-child(3) p")
      if (mobileElement && mobileTextElement) {
        const mobileText = mobileTextElement.textContent
        mobileElement.value = mobileText === "Not provided" ? "" : mobileText
      }

      const basicTab = document.getElementById("basic-tab")
      if (basicTab) {
        const bsTab = new bootstrap.Tab(basicTab)
        bsTab.show()
      }

      if (saveBasicInfoBtn) {
        saveBasicInfoBtn.disabled = false
        saveBasicInfoBtn.textContent = "Save Basic Info"
      }

      if (updateEmailBtn) {
        updateEmailBtn.disabled = false
        updateEmailBtn.textContent = "Update Email"
      }
    })
  }

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const flashMessages = document.querySelectorAll(".alert-float")
  if (flashMessages.length > 0) {
    flashMessages.forEach((message) => {
      message.style.display = "none"

      if (message.classList.contains("alert-success")) {
        Swal.fire({
          title: "Success!",
          text: message.textContent,
          icon: "success",
          confirmButtonColor: "#000000",
        })
      } else if (message.classList.contains("alert-danger")) {
        Swal.fire({
          title: "Error!",
          text: message.textContent,
          icon: "error",
          confirmButtonColor: "#000000",
        })
      } else if (message.classList.contains("alert-info")) {
        Swal.fire({
          title: "Information",
          text: message.textContent,
          icon: "info",
          confirmButtonColor: "#000000",
        })
      }
    })
  }
})
