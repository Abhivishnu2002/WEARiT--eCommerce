document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm")
  const emailInput = document.getElementById("email")
  const passwordInput = document.getElementById("password")
  const togglePassword = document.getElementById("togglePassword")
  const loginBtn = document.getElementById("loginBtn")
  const btnText = loginBtn.querySelector(".btn-text")
  const btnSpinner = loginBtn.querySelector(".btn-spinner")
  const emailValid = document.getElementById("emailValid")
  const emailInvalid = document.getElementById("emailInvalid")
  const emailError = document.getElementById("emailError")
  const passwordError = document.getElementById("passwordError")
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  const passwordMinLength = 6
  let isEmailValid = false
  let isPasswordValid = false
  let hasUserInteracted = false
  function validateEmail() {
    const email = emailInput.value.trim()

    if (!email) {
      if (hasUserInteracted) {
        showFieldError(emailInput, emailError, "Email address is required")
        updateValidationIcon("email", false)
      }
      isEmailValid = false
      return false
    }

    if (!emailPattern.test(email)) {
      if (hasUserInteracted) {
        showFieldError(emailInput, emailError, "Please enter a valid email address")
        updateValidationIcon("email", false)
      }
      isEmailValid = false
      return false
    }

    hideFieldError(emailInput, emailError)
    updateValidationIcon("email", true)
    isEmailValid = true
    return true
  }

  function validatePassword() {
    const password = passwordInput.value

    if (!password) {
      if (hasUserInteracted) {
        showFieldError(passwordInput, passwordError, "Password is required")
      }
      isPasswordValid = false
      return false
    }

    if (password.length < passwordMinLength) {
      if (hasUserInteracted) {
        showFieldError(passwordInput, passwordError, `Password must be at least ${passwordMinLength} characters long`)
      }
      isPasswordValid = false
      return false
    }

    hideFieldError(passwordInput, passwordError)
    isPasswordValid = true
    return true
  }

  function showFieldError(input, errorContainer, message) {
    input.classList.add("is-invalid")
    input.classList.remove("is-valid")
    errorContainer.textContent = message
    errorContainer.style.display = "block"
    errorContainer.classList.add("show")
    input.style.animation = "shake 0.5s ease-in-out"
    setTimeout(() => {
      input.style.animation = ""
    }, 500)
  }
  function hideFieldError(input, errorContainer) {
    input.classList.remove("is-invalid")
    input.classList.add("is-valid")
    errorContainer.textContent = ""
    errorContainer.style.display = "none"
    errorContainer.classList.remove("show")
  }
  function updateValidationIcon(field, isValid) {
    if (field === "email" && emailValid && emailInvalid) {
      if (isValid) {
        emailValid.classList.remove("d-none")
        emailInvalid.classList.add("d-none")
      } else {
        emailValid.classList.add("d-none")
        emailInvalid.classList.remove("d-none")
      }
    }
  }
  function markUserInteraction() {
    hasUserInteracted = true
  }
  emailInput.addEventListener("input", function () {
    markUserInteraction()
    if (this.value.trim()) {
      validateEmail()
    } else {
      this.classList.remove("is-valid", "is-invalid")
      if (emailError) {
        emailError.style.display = "none"
        emailError.classList.remove("show")
      }
      if (emailValid && emailInvalid) {
        emailValid.classList.add("d-none")
        emailInvalid.classList.add("d-none")
      }
      isEmailValid = false
    }
    updateSubmitButton()
  })

  emailInput.addEventListener("blur", () => {
    markUserInteraction()
    validateEmail()
  })

  passwordInput.addEventListener("input", function () {
    markUserInteraction()
    if (this.value) {
      validatePassword()
    } else {
      this.classList.remove("is-valid", "is-invalid")
      if (passwordError) {
        passwordError.style.display = "none"
        passwordError.classList.remove("show")
      }
      isPasswordValid = false
    }
    updateSubmitButton()
  })

  passwordInput.addEventListener("blur", () => {
    markUserInteraction()
    validatePassword()
  })
  if (togglePassword) {
    togglePassword.addEventListener("click", function () {
      const type = passwordInput.getAttribute("type") === "password" ? "text" : "password"
      passwordInput.setAttribute("type", type)

      const icon = this.querySelector("i")
      if (icon) {
        if (type === "password") {
          icon.classList.remove("bi-eye")
          icon.classList.add("bi-eye-slash")
        } else {
          icon.classList.remove("bi-eye-slash")
          icon.classList.add("bi-eye")
        }
      }
    })
  }
  function updateSubmitButton() {
    if (loginBtn) {
      if (isEmailValid && isPasswordValid) {
        loginBtn.disabled = false
        loginBtn.classList.remove("opacity-50")
      } else {
        loginBtn.disabled = true
        loginBtn.classList.add("opacity-50")
      }
    }
  }
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault()
      markUserInteraction()
      const emailIsValid = validateEmail()
      const passwordIsValid = validatePassword()

      if (!emailIsValid || !passwordIsValid) {
        if (window.Swal) {
          window.Swal.fire({
            icon: "error",
            title: "Validation Error",
            text: "Please fix the errors in the form before submitting.",
            confirmButtonColor: "#ef4444",
            customClass: {
              popup: "animated shake",
            },
          })
        }
        return
      }

      showLoadingState()
      const formData = new FormData(this)
      fetch("/login", {
        method: "POST",
        body: formData,
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      })
        .then((response) => {
          if (response.redirected) {
            if (window.Swal) {
              window.Swal.fire({
                icon: "success",
                title: "Login Successful!",
                text: "Welcome back! Redirecting...",
                timer: 1500,
                timerProgressBar: true,
                showConfirmButton: false,
                allowOutsideClick: false,
                customClass: {
                  popup: "animated fadeInUp",
                },
              }).then(() => {
                window.location.href = response.url
              })
            } else {
              window.location.href = response.url
            }
          } else {
            return response.text()
          }
        })
        .then((html) => {
          if (html) {
            const parser = new DOMParser()
            const doc = parser.parseFromString(html, "text/html")
            const errorAlert = doc.querySelector(".alert-danger")

            if (errorAlert) {
              const errorMessage = errorAlert.textContent.trim()
              hideLoadingState()

              if (window.Swal) {
                window.Swal.fire({
                  icon: "error",
                  title: "Login Failed",
                  text: errorMessage,
                  confirmButtonColor: "#ef4444",
                  customClass: {
                    popup: "animated shake",
                  },
                })
              } else {
                alert(errorMessage)
              }
            } else {
              hideLoadingState()
              this.submit()
            }
          }
        })
        .catch((error) => {
          console.error("Login error:", error)
          hideLoadingState()

          if (window.Swal) {
            window.Swal.fire({
              icon: "error",
              title: "Connection Error",
              text: "Unable to connect to the server. Please check your internet connection and try again.",
              confirmButtonColor: "#ef4444",
              customClass: {
                popup: "animated shake",
              },
            })
          } else {
            alert("Connection error. Please try again.")
          }
        })
    })
  }
  function showLoadingState() {
    if (loginBtn && btnText && btnSpinner) {
      loginBtn.disabled = true
      btnText.classList.add("d-none")
      btnSpinner.classList.remove("d-none")
      loginBtn.style.cursor = "not-allowed"
    }
  }
  function hideLoadingState() {
    if (loginBtn && btnText && btnSpinner) {
      loginBtn.disabled = false
      btnText.classList.remove("d-none")
      btnSpinner.classList.add("d-none")
      loginBtn.style.cursor = "pointer"
      updateSubmitButton()
    }
  }
  const style = document.createElement("style")
  style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .animated {
            animation-duration: 0.5s;
            animation-fill-mode: both;
        }
        
        .fadeInUp {
            animation-name: fadeInUp;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translate3d(0, 40px, 0);
            }
            to {
                opacity: 1;
                transform: translate3d(0, 0, 0);
            }
        }
    `
  document.head.appendChild(style)
  updateSubmitButton()

  if (emailInput) {
    emailInput.focus()
  }
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      hideLoadingState()
    }
  })
  window.Swal = window.Swal || window.swal || window.swal2
})
