const activeToasts = new Map()

function createToastContainer() {
  if (!document.querySelector(".toast-container")) {
    const container = document.createElement("div")
    container.className = "toast-container"
    document.body.appendChild(container)
    return container
  }
  return document.querySelector(".toast-container")
}

function generateToastId() {
  return `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function showToast(message, type = "info", title = "", duration = 5000, priority = 1) {
  const messageKey = `${type}-${message}`

  if (activeToasts.has(messageKey)) {
    return activeToasts.get(messageKey)
  }

  if (type === "success") {
    clearToastsByType("error")
  } else if (type === "error") {
    clearToastsByType("success")
  }

  const container = createToastContainer()
  const toastId = generateToastId()

  if (!title) {
    switch (type) {
      case "success":
        title = "Success"
        break
      case "error":
        title = "Error"
        break
      case "warning":
        title = "Warning"
        break
      default:
        title = "Information"
    }
  }

  let icon
  switch (type) {
    case "success":
      icon = '<i class="fas fa-check-circle"></i>'
      break
    case "error":
      icon = '<i class="fas fa-times-circle"></i>'
      break
    case "warning":
      icon = '<i class="fas fa-exclamation-triangle"></i>'
      break
    default:
      icon = '<i class="fas fa-info-circle"></i>'
  }

  const toast = document.createElement("div")
  toast.className = `toast ${type}`
  toast.id = toastId
  toast.innerHTML = `
    <div class="toast-header">
      <div class="toast-icon">${icon}</div>
      <div class="toast-title">${title}</div>
      <button class="toast-close" onclick="closeToast('${toastId}', '${messageKey}')">&times;</button>
    </div>
    <div class="toast-body">${message}</div>
  `

  container.appendChild(toast)

  activeToasts.set(messageKey, {
    id: toastId,
    type,
    priority,
  })

  setTimeout(() => {
    toast.classList.add("show")
  }, 10)

  if (duration > 0) {
    setTimeout(() => {
      closeToast(toastId, messageKey)
    }, duration)
  }

  return toastId
}

function closeToast(toastId, messageKey) {
  const toast = document.getElementById(toastId)
  if (toast) {
    toast.classList.add("fade-out")
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }

      if (messageKey && activeToasts.has(messageKey)) {
        activeToasts.delete(messageKey)
      }

      const container = document.querySelector(".toast-container")
      if (container && container.children.length === 0) {
        container.parentNode.removeChild(container)
      }
    }, 300)
  }
}

function clearToastsByType(type) {
  for (const [key, value] of activeToasts.entries()) {
    if (value.type === type) {
      closeToast(value.id, key)
    }
  }
}

function clearAllToasts() {
  const toasts = document.querySelectorAll(".toast")
  toasts.forEach((toast) => {
    const toastId = toast.id
    let messageKey = null
    for (const [key, value] of activeToasts.entries()) {
      if (value.id === toastId) {
        messageKey = key
        break
      }
    }
    closeToast(toastId, messageKey)
  })
}

function showSuccessToast(message, title = "Success", duration = 5000) {
  return showToast(message, "success", title, duration, 2)
}

function showErrorToast(message, title = "Error", duration = 5000) {
  return showToast(message, "error", title, duration, 3)
}

function showWarningToast(message, title = "Warning", duration = 5000) {
  return showToast(message, "warning", title, duration, 2)
}

function showInfoToast(message, title = "Information", duration = 5000) {
  return showToast(message, "info", title, duration, 1)
}

window.showToast = showToast
window.closeToast = closeToast
window.clearToastsByType = clearToastsByType
window.clearAllToasts = clearAllToasts
window.showSuccessToast = showSuccessToast
window.showErrorToast = showErrorToast
window.showWarningToast = showWarningToast
window.showInfoToast = showInfoToast

document.addEventListener("DOMContentLoaded", () => {
  clearAllToasts()
  const errorMessages = document.querySelectorAll(".alert-danger")
  if (errorMessages.length > 0) {
    const firstError = errorMessages[0]
    const message = firstError.innerHTML.replace(/<button.*?<\/button>/g, "").trim()
    showErrorToast(message)
    errorMessages.forEach((alert) => {
      alert.style.display = "none"
    })
    const successMessages = document.querySelectorAll(".alert-success")
    successMessages.forEach((alert) => {
      alert.style.display = "none"
    })
  } else {
    const successMessages = document.querySelectorAll(".alert-success")
    if (successMessages.length > 0) {
      const firstSuccess = successMessages[0]
      const message = firstSuccess.innerHTML.replace(/<button.*?<\/button>/g, "").trim()
      showSuccessToast(message)
      successMessages.forEach((alert) => {
        alert.style.display = "none"
      })
    }
  }

  const warningMessages = document.querySelectorAll(".alert-warning")
  warningMessages.forEach((alert) => {
    const message = alert.innerHTML.replace(/<button.*?<\/button>/g, "").trim()
    showWarningToast(message)
    alert.style.display = "none"
  })
  const infoMessages = document.querySelectorAll(".alert-info")
  infoMessages.forEach((alert) => {
    const message = alert.innerHTML.replace(/<button.*?<\/button>/g, "").trim()
    showInfoToast(message)
    alert.style.display = "none"
  })
})
