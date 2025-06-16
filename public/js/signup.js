document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm")
  const nameInput = document.getElementById("name")
  const emailInput = document.getElementById("email")
  const mobileInput = document.getElementById("mobile")
  const passwordInput = document.getElementById("password")
  const confirmPasswordInput = document.getElementById("confirmPassword")
  const referralCodeInput = document.getElementById("referralCode")
  const termsCheck = document.getElementById("termsCheck")
  const signupBtn = document.getElementById("signupBtn")
  const btnText = signupBtn.querySelector(".btn-text")
  const btnSpinner = signupBtn.querySelector(".btn-spinner")
  const togglePassword = document.getElementById("togglePassword")
  const toggleConfirmPassword = document.getElementById("toggleConfirmPassword")
  const nameValid = document.getElementById("nameValid")
  const nameInvalid = document.getElementById("nameInvalid")
  const emailValid = document.getElementById("emailValid")
  const emailInvalid = document.getElementById("emailInvalid")
  const mobileValid = document.getElementById("mobileValid")
  const mobileInvalid = document.getElementById("mobileInvalid")
  const referralValid = document.getElementById("referralValid")
  const referralInvalid = document.getElementById("referralInvalid")
  const nameError = document.getElementById("nameError")
  const emailError = document.getElementById("emailError")
  const mobileError = document.getElementById("mobileError")
  const passwordError = document.getElementById("passwordError")
  const confirmPasswordError = document.getElementById("confirmPasswordError")
  const referralCodeError = document.getElementById("referralCodeError")
  const termsCheckError = document.getElementById("termsCheckError")
  const passwordStrength = document.getElementById("passwordStrength")
  const passwordStrengthBar = document.getElementById("passwordStrengthBar")
  const passwordStrengthText = document.getElementById("passwordStrengthText")
  const namePattern = /^[a-zA-Z\s]+$/
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  const mobilePattern = /^[6-9]\d{9}$/
  const passwordMinLength = 6

  let isNameValid = false
  let isEmailValid = false
  let isMobileValid = false
  let isPasswordValid = false
  let isConfirmPasswordValid = false
  let isTermsChecked = false
  let isReferralValid = true 

  function initializeValidation() {
    if (nameInput.value.trim()) validateName()
    if (emailInput.value.trim()) validateEmail()
    if (mobileInput.value.trim()) validateMobile()
    if (passwordInput.value) validatePassword()
    if (confirmPasswordInput.value) validateConfirmPassword()
    if (referralCodeInput.value.trim()) validateReferralCode()
    if (termsCheck.checked) validateTerms()
    updateSubmitButton()
  }

  function validateName() {
    const name = nameInput.value.trim()

    if (!name) {
      showFieldError(nameInput, nameError, "Full name is required")
      updateValidationIcon("name", false)
      isNameValid = false
      return false
    }

    if (name.length < 2) {
      showFieldError(nameInput, nameError, "Name must be at least 2 characters long")
      updateValidationIcon("name", false)
      isNameValid = false
      return false
    }

    if (!namePattern.test(name)) {
      showFieldError(nameInput, nameError, "Name can only contain letters and spaces")
      updateValidationIcon("name", false)
      isNameValid = false
      return false
    }

    hideFieldError(nameInput, nameError)
    updateValidationIcon("name", true)
    isNameValid = true
    return true
  }

  function validateEmail() {
    const email = emailInput.value.trim()

    if (!email) {
      showFieldError(emailInput, emailError, "Email address is required")
      updateValidationIcon("email", false)
      isEmailValid = false
      return false
    }

    if (!emailPattern.test(email)) {
      showFieldError(emailInput, emailError, "Please enter a valid email address")
      updateValidationIcon("email", false)
      isEmailValid = false
      return false
    }

    hideFieldError(emailInput, emailError)
    updateValidationIcon("email", true)
    isEmailValid = true
    return true
  }

  function validateMobile() {
    const mobile = mobileInput.value.trim()

    if (!mobile) {
      showFieldError(mobileInput, mobileError, "Mobile number is required")
      updateValidationIcon("mobile", false)
      isMobileValid = false
      return false
    }

    if (!mobilePattern.test(mobile)) {
      showFieldError(mobileInput, mobileError, "Please enter a valid 10-digit mobile number")
      updateValidationIcon("mobile", false)
      isMobileValid = false
      return false
    }

    hideFieldError(mobileInput, mobileError)
    updateValidationIcon("mobile", true)
    isMobileValid = true
    return true
  }
  function validatePassword() {
    const password = passwordInput.value

    if (!password) {
      showFieldError(passwordInput, passwordError, "Password is required")
      passwordStrength.classList.add("d-none")
      isPasswordValid = false
      return false
    }

    if (password.length < passwordMinLength) {
      showFieldError(passwordInput, passwordError, `Password must be at least ${passwordMinLength} characters long`)
      isPasswordValid = false
      return false
    }
    const strength = checkPasswordStrength(password)
    updatePasswordStrengthIndicator(strength)

    if (strength.score < 2) {
      showFieldError(passwordInput, passwordError, "Password is too weak. " + strength.message)
      isPasswordValid = false
      return false
    }

    hideFieldError(passwordInput, passwordError)
    isPasswordValid = true
    return true
  }

  function validateConfirmPassword() {
    const password = passwordInput.value
    const confirmPassword = confirmPasswordInput.value

    if (!confirmPassword) {
      showFieldError(confirmPasswordInput, confirmPasswordError, "Please confirm your password")
      isConfirmPasswordValid = false
      return false
    }

    if (password !== confirmPassword) {
      showFieldError(confirmPasswordInput, confirmPasswordError, "Passwords do not match")
      isConfirmPasswordValid = false
      return false
    }

    hideFieldError(confirmPasswordInput, confirmPasswordError)
    isConfirmPasswordValid = true
    return true
  }
  function validateReferralCode() {
    const referralCode = referralCodeInput.value.trim()

    if (!referralCode) {
      hideFieldError(referralCodeInput, referralCodeError)
      updateValidationIcon("referral", null) 
      isReferralValid = true
      return true
    }

    if (referralCode.length < 5) {
      showFieldError(referralCodeInput, referralCodeError, "Referral code is too short")
      updateValidationIcon("referral", false)
      isReferralValid = false
      return false
    }

    hideFieldError(referralCodeInput, referralCodeError)
    updateValidationIcon("referral", true)
    isReferralValid = true
    return true
  }

  function validateTerms() {
    if (!termsCheck.checked) {
      termsCheckError.style.display = "block"
      isTermsChecked = false
      return false
    }

    termsCheckError.style.display = "none"
    isTermsChecked = true
    return true
  }

  function showFieldError(input, errorContainer, message) {
    input.classList.add("is-invalid")
    input.classList.remove("is-valid")
    errorContainer.textContent = message
    errorContainer.style.display = "block"

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
  }

  function updateValidationIcon(field, isValid) {
    if (field === "name") {
      if (isValid === true) {
        nameValid.classList.remove("d-none")
        nameInvalid.classList.add("d-none")
      } else if (isValid === false) {
        nameValid.classList.add("d-none")
        nameInvalid.classList.remove("d-none")
      } else {
        nameValid.classList.add("d-none")
        nameInvalid.classList.add("d-none")
      }
    } else if (field === "email") {
      if (isValid === true) {
        emailValid.classList.remove("d-none")
        emailInvalid.classList.add("d-none")
      } else if (isValid === false) {
        emailValid.classList.add("d-none")
        emailInvalid.classList.remove("d-none")
      } else {
        emailValid.classList.add("d-none")
        emailInvalid.classList.add("d-none")
      }
    } else if (field === "mobile") {
      if (isValid === true) {
        mobileValid.classList.remove("d-none")
        mobileInvalid.classList.add("d-none")
      } else if (isValid === false) {
        mobileValid.classList.add("d-none")
        mobileInvalid.classList.remove("d-none")
      } else {
        mobileValid.classList.add("d-none")
        mobileInvalid.classList.add("d-none")
      }
    } else if (field === "referral") {
      if (isValid === true) {
        referralValid.classList.remove("d-none")
        referralInvalid.classList.add("d-none")
      } else if (isValid === false) {
        referralValid.classList.add("d-none")
        referralInvalid.classList.remove("d-none")
      } else {
        referralValid.classList.add("d-none")
        referralInvalid.classList.add("d-none")
      }
    }
  }
  function checkPasswordStrength(password) {
    let score = 0
    let message = ""

    if (password.length >= 8) {
      score += 1
    }

    if (/[A-Z]/.test(password)) score += 1
    if (/[a-z]/.test(password)) score += 1 
    if (/[0-9]/.test(password)) score += 1 
    if (/[^A-Za-z0-9]/.test(password)) score += 1 
    if (score < 2) {
      message = "Very weak - Use a longer password with mixed characters"
    } else if (score < 3) {
      message = "Weak - Add numbers or special characters"
    } else if (score < 4) {
      message = "Medium - Add more variety of characters"
    } else if (score < 5) {
      message = "Strong - Good password"
    } else {
      message = "Very strong - Excellent password"
    }

    return { score, message }
  }
  function updatePasswordStrengthIndicator(strength) {
    passwordStrength.classList.remove("d-none")
    const percentage = (strength.score / 5) * 100
    passwordStrengthBar.style.width = `${percentage}%`
    if (strength.score < 2) {
      passwordStrengthBar.className = "progress-bar bg-danger"
    } else if (strength.score < 3) {
      passwordStrengthBar.className = "progress-bar bg-warning"
    } else if (strength.score < 4) {
      passwordStrengthBar.className = "progress-bar bg-info"
    } else {
      passwordStrengthBar.className = "progress-bar bg-success"
    }
    passwordStrengthText.textContent = strength.message
  }
  nameInput.addEventListener("input", function () {
    if (this.value.trim()) {
      validateName()
    } else {
      this.classList.remove("is-valid", "is-invalid")
      nameError.style.display = "none"
      updateValidationIcon("name", null)
      isNameValid = false
    }
    updateSubmitButton()
  })

  nameInput.addEventListener("blur", validateName)

  emailInput.addEventListener("input", function () {
    if (this.value.trim()) {
      validateEmail()
    } else {
      this.classList.remove("is-valid", "is-invalid")
      emailError.style.display = "none"
      updateValidationIcon("email", null)
      isEmailValid = false
    }
    updateSubmitButton()
  })

  emailInput.addEventListener("blur", validateEmail)

  mobileInput.addEventListener("input", function () {
    if (this.value.trim()) {
      validateMobile()
    } else {
      this.classList.remove("is-valid", "is-invalid")
      mobileError.style.display = "none"
      updateValidationIcon("mobile", null)
      isMobileValid = false
    }
    updateSubmitButton()
  })

  mobileInput.addEventListener("blur", validateMobile)

  passwordInput.addEventListener("input", function () {
    if (this.value) {
      validatePassword()
      if (confirmPasswordInput.value) {
        validateConfirmPassword()
      }
    } else {
      this.classList.remove("is-valid", "is-invalid")
      passwordError.style.display = "none"
      passwordStrength.classList.add("d-none")
      isPasswordValid = false
    }
    updateSubmitButton()
  })

  passwordInput.addEventListener("blur", validatePassword)

  confirmPasswordInput.addEventListener("input", function () {
    if (this.value) {
      validateConfirmPassword()
    } else {
      this.classList.remove("is-valid", "is-invalid")
      confirmPasswordError.style.display = "none"
      isConfirmPasswordValid = false
    }
    updateSubmitButton()
  })

  confirmPasswordInput.addEventListener("blur", validateConfirmPassword)

  referralCodeInput.addEventListener("input", () => {
    validateReferralCode()
    updateSubmitButton()
  })

  referralCodeInput.addEventListener("blur", validateReferralCode)

  termsCheck.addEventListener("change", () => {
    validateTerms()
    updateSubmitButton()
  })
  togglePassword.addEventListener("click", function () {
    const type = passwordInput.getAttribute("type") === "password" ? "text" : "password"
    passwordInput.setAttribute("type", type)

    const icon = this.querySelector("i")
    if (type === "password") {
      icon.classList.remove("bi-eye")
      icon.classList.add("bi-eye-slash")
    } else {
      icon.classList.remove("bi-eye-slash")
      icon.classList.add("bi-eye")
    }
  })

  toggleConfirmPassword.addEventListener("click", function () {
    const type = confirmPasswordInput.getAttribute("type") === "password" ? "text" : "password"
    confirmPasswordInput.setAttribute("type", type)

    const icon = this.querySelector("i")
    if (type === "password") {
      icon.classList.remove("bi-eye")
      icon.classList.add("bi-eye-slash")
    } else {
      icon.classList.remove("bi-eye-slash")
      icon.classList.add("bi-eye")
    }
  })
  function updateSubmitButton() {
    if (
      isNameValid &&
      isEmailValid &&
      isMobileValid &&
      isPasswordValid &&
      isConfirmPasswordValid &&
      isTermsChecked &&
      isReferralValid
    ) {
      signupBtn.disabled = false
      signupBtn.classList.remove("opacity-50")
    } else {
      signupBtn.disabled = true
      signupBtn.classList.add("opacity-50")
    }
  }
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault()
    const validations = [
      validateName(),
      validateEmail(),
      validateMobile(),
      validatePassword(),
      validateConfirmPassword(),
      validateTerms(),
      validateReferralCode(),
    ]

    const allValid = validations.every(Boolean)

    if (!allValid) {
      const firstInvalidField = signupForm.querySelector(".is-invalid")
      if (firstInvalidField) {
        firstInvalidField.focus()
        firstInvalidField.scrollIntoView({ behavior: "smooth", block: "center" })
      }

      const Swal = window.swal ||
        window.Swal || {
          fire: (options) => {
            alert(options.text || options.title || "Alert")
          },
        }

      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Please fix all errors before submitting the form.",
        confirmButtonColor: "#ef4444",
        customClass: {
          popup: "animated shake",
        },
      })
      return
    }
    showLoadingState()
    const formDataObject = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim().toLowerCase(),
      mobile: mobileInput.value.replace(/\D/g, ""),
      password: passwordInput.value,
      confirmPassword: confirmPasswordInput.value,
    }
    if (referralCodeInput.value.trim()) {
      formDataObject.referralCode = referralCodeInput.value.trim().toUpperCase()
    }
    Object.entries(formDataObject).forEach(([key, value]) => {
      })
    fetch("/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(formDataObject),
    })
      .then(async (response) => {
        if (response.redirected) {

          const Swal = window.swal ||
            window.Swal || {
              fire: (options) => {
                alert(options.text || options.title || "Alert")
              },
            }

          await Swal.fire({
            icon: "success",
            title: "Registration Successful!",
            text: "Please verify your email with the OTP sent to your inbox.",
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: false,
            allowOutsideClick: false,
            customClass: {
              popup: "animated fadeInUp",
            },
          })
          window.location.href = response.url
          return { success: true, redirected: true }
        }
        const contentType = response.headers.get("content-type")

        if (contentType && contentType.includes("application/json")) {
          const data = await response.json()
          return data
        } else {
          const textData = await response.text()
          return textData
        }
      })
      .then((data) => {

        if (data && !data.redirected) {
          hideLoadingState()

          if (typeof data === "string") {
            const parser = new DOMParser()
            const doc = parser.parseFromString(data, "text/html")
            const errorAlert = doc.querySelector(".alert-danger")

            if (errorAlert) {
              const errorMessage = errorAlert.textContent.trim()

              const Swal = window.swal ||
                window.Swal || {
                  fire: (options) => {
                    alert(options.text || options.title || "Alert")
                  },
                }

              Swal.fire({
                icon: "error",
                title: "Registration Failed",
                text: errorMessage,
                confirmButtonColor: "#ef4444",
              })
            } else {
              const errorElements = doc.querySelectorAll(".error, .alert, .message")
              if (errorElements.length > 0) {
              }
              const Swal = window.swal ||
                window.Swal || {
                  fire: (options) => {
                    alert(options.text || options.title || "Alert")
                  },
                }

              Swal.fire({
                icon: "error",
                title: "Registration Failed",
                text: "An unexpected error occurred. Please try again.",
                confirmButtonColor: "#ef4444",
              })
            }
          } else if (data.success === false) {

            if (data.errors) {
              Object.entries(data.errors).forEach(([field, message]) => {
                const input = document.getElementById(field)
                const errorElement = document.getElementById(field + "Error")
                if (input && errorElement) {
                  showFieldError(input, errorElement, message)
                  updateValidationIcon(field, false)

                  // Update validation state
                  if (field === "name") isNameValid = false
                  if (field === "email") isEmailValid = false
                  if (field === "mobile") isMobileValid = false
                  if (field === "password") isPasswordValid = false
                  if (field === "confirmPassword") isConfirmPasswordValid = false
                  if (field === "referralCode") isReferralValid = false
                }
              })
              updateSubmitButton()
            }

            const Swal = window.swal ||
              window.Swal || {
                fire: (options) => {
                  alert(options.text || options.title || "Alert")
                },
              }

            Swal.fire({
              icon: "error",
              title: "Registration Failed",
              text: data.message || "Please check the form for errors.",
              confirmButtonColor: "#ef4444",
            })
          } else if (data.success === true && data.redirectUrl) {

            const Swal = window.swal ||
              window.Swal || {
                fire: (options) => {
                  alert(options.text || options.title || "Alert")
                },
              }

            Swal.fire({
              icon: "success",
              title: "Success!",
              text: data.message || "Registration successful!",
              timer: 2000,
              timerProgressBar: true,
              showConfirmButton: false,
              allowOutsideClick: false,
            }).then(() => {
              window.location.href = data.redirectUrl
            })
          } else {

            const Swal = window.swal ||
              window.Swal || {
                fire: (options) => {
                  alert(options.text || options.title || "Alert")
                },
              }

            Swal.fire({
              icon: "error",
              title: "Unexpected Response",
              text: "The server returned an unexpected response. Please try again.",
              confirmButtonColor: "#ef4444",
            })
          }
        }
      })
      .catch((error) => {
        hideLoadingState()

        const Swal = window.swal ||
          window.Swal || {
            fire: (options) => {
              alert(options.text || options.title || "Alert")
            },
          }

        Swal.fire({
          icon: "error",
          title: "Connection Error",
          text: "Unable to connect to the server. Please check your internet connection and try again.",
          confirmButtonColor: "#ef4444",
        })
      })
  })

  function showLoadingState() {
    signupBtn.disabled = true
    btnText.classList.add("d-none")
    btnSpinner.classList.remove("d-none")
    signupBtn.style.cursor = "not-allowed"
  }

  function hideLoadingState() {
    signupBtn.disabled = false
    btnText.classList.remove("d-none")
    btnSpinner.classList.add("d-none")
    signupBtn.style.cursor = "pointer"
    updateSubmitButton()
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

    .opacity-50 {
        opacity: 0.5;
    }
  `
  document.head.appendChild(style)

  initializeValidation()

  if (!nameInput.value.trim()) {
    nameInput.focus()
  }
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      hideLoadingState()
      initializeValidation()
    }
  })

  window.Swal = window.swal || window.Swal
})
