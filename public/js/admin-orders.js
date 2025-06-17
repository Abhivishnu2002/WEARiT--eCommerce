document.addEventListener("DOMContentLoaded", () => {
  initializeFilters()
  initializeSearch()
  initializePagination()
  initializeOrderActions()
  handleResponsiveTable()
  updateActiveFilters()
})
const Swal = window.Swal || require("sweetalert2")
let filtersCollapsed = false
function initializeFilters() {
  const filterChips = document.querySelectorAll(".filter-chip")
  filterChips.forEach((chip) => {
    chip.addEventListener("click", function () {
      if (!this.classList.contains("btn-primary")) {
        filterChips.forEach((c) => {
          c.classList.remove("btn-primary")
          c.classList.add("btn-outline-secondary")
        })
        this.classList.remove("btn-outline-secondary")
        this.classList.add("btn-primary")
      }
    })
  })
  const filterSelects = document.querySelectorAll(".form-select")
  filterSelects.forEach((select) => {
    select.addEventListener("change", updateActiveFilters)
  })
}
function initializeSearch() {
  const searchInput = document.getElementById("searchOrder")
  if (searchInput) {
    let searchTimeout
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => {
        updateActiveFilters()
      }, 300)
    })
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        performSearch()
      }
    })
  }
}

function initializePagination() {
  
}

function initializeOrderActions() {
  const editBtns = document.querySelectorAll(".edit-btn")
  editBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      const orderId = this.dataset.orderId
      showUpdateStatusModal(orderId)
    })
  })
}

function toggleFilters() {
  const filtersContent = document.getElementById("filtersContent")
  const toggleBtn = document.querySelector(".filters-toggle")
  const toggleIcon = toggleBtn.querySelector("i")

  filtersCollapsed = !filtersCollapsed

  if (filtersCollapsed) {
    filtersContent.classList.add("collapsed")
    toggleIcon.classList.remove("fa-chevron-down")
    toggleIcon.classList.add("fa-chevron-up")
  } else {
    filtersContent.classList.remove("collapsed")
    toggleIcon.classList.remove("fa-chevron-up")
    toggleIcon.classList.add("fa-chevron-down")
  }
}
function updateActiveFilters() {
  const activeFiltersContainer = document.getElementById("activeFilters")
  const activeFiltersList = document.getElementById("activeFiltersList")
  const filters = []
  const searchValue = document.getElementById("searchOrder")?.value.trim()
  if (searchValue) {
    filters.push({ type: "search", value: searchValue, label: `Search: "${searchValue}"` })
  }
  const activeTimeFilter = document.querySelector(".filter-chip.btn-primary")
  if (activeTimeFilter && !activeTimeFilter.onclick.toString().includes("''")) {
    filters.push({
      type: "time",
      value: "active",
      label: activeTimeFilter.textContent.trim(),
    })
  }
  const statusFilter = document.getElementById("statusFilter")
  if (statusFilter?.value) {
    filters.push({
      type: "status",
      value: statusFilter.value,
      label: `Status: ${statusFilter.options[statusFilter.selectedIndex].text}`,
    })
  }
  const paymentFilter = document.getElementById("paymentFilter")
  if (paymentFilter?.value) {
    filters.push({
      type: "payment",
      value: paymentFilter.value,
      label: `Payment: ${paymentFilter.options[paymentFilter.selectedIndex].text}`,
    })
  }
  const returnFilter = document.getElementById("returnFilter")
  if (returnFilter?.value) {
    filters.push({
      type: "return",
      value: returnFilter.value,
      label: `Return: ${returnFilter.options[returnFilter.selectedIndex].text}`,
    })
  }
  if (filters.length > 0) {
    activeFiltersContainer.style.display = "block"
    activeFiltersList.innerHTML = filters
      .map(
        (filter) => `
                <span class="active-filter-tag" data-type="${filter.type}" data-value="${filter.value}">
                    ${filter.label}
                    <i class="fas fa-times ms-1" onclick="removeFilter('${filter.type}', '${filter.value}')" style="cursor: pointer;"></i>
                </span>
            `,
      )
      .join("")
  } else {
    activeFiltersContainer.style.display = "none"
  }
}

function removeFilter(type, value) {
  switch (type) {
    case "search":
      document.getElementById("searchOrder").value = ""
      applySearch("")
      break
    case "time":
      applyTimeFilter("")
      break
    case "status":
      document.getElementById("statusFilter").value = ""
      applyStatusFilter("")
      break
    case "payment":
      document.getElementById("paymentFilter").value = ""
      applyPaymentFilter("")
      break
    case "return":
      document.getElementById("returnFilter").value = ""
      applyReturnFilter("")
      break
  }
}
function applyTimeFilter(timeFilter) {
  const currentUrl = new URL(window.location)
  if (timeFilter) {
    currentUrl.searchParams.set("timeFilter", timeFilter)
  } else {
    currentUrl.searchParams.delete("timeFilter")
  }
  currentUrl.searchParams.delete("page")
  window.location.href = currentUrl.toString()
}

function applyStatusFilter(status) {
  const currentUrl = new URL(window.location)
  if (status) {
    currentUrl.searchParams.set("status", status)
  } else {
    currentUrl.searchParams.delete("status")
  }
  currentUrl.searchParams.delete("page")
  window.location.href = currentUrl.toString()
}

function applyPaymentFilter(paymentMethod) {
  const currentUrl = new URL(window.location)
  if (paymentMethod) {
    currentUrl.searchParams.set("paymentMethod", paymentMethod)
  } else {
    currentUrl.searchParams.delete("paymentMethod")
  }
  currentUrl.searchParams.delete("page")
  window.location.href = currentUrl.toString()
}

function applyReturnFilter(returnStatus) {
  const currentUrl = new URL(window.location)
  if (returnStatus) {
    currentUrl.searchParams.set("returnStatus", returnStatus)
  } else {
    currentUrl.searchParams.delete("returnStatus")
  }
  currentUrl.searchParams.delete("page")
  window.location.href = currentUrl.toString()
}

function performSearch() {
  const searchValue = document.getElementById("searchOrder").value.trim()
  applySearch(searchValue)
}

function applySearch(searchValue) {
  const currentUrl = new URL(window.location)
  if (searchValue) {
    currentUrl.searchParams.set("search", searchValue)
  } else {
    currentUrl.searchParams.delete("search")
  }
  currentUrl.searchParams.delete("page")
  window.location.href = currentUrl.toString()
}

function clearAllFilters() {
  window.location.href = "/admin/orders"
}

function applySorting(sortValue) {
  const [sortBy, sortOrder] = sortValue.split("-")
  const currentUrl = new URL(window.location)
  currentUrl.searchParams.set("sortBy", sortBy)
  currentUrl.searchParams.set("sortOrder", sortOrder)
  currentUrl.searchParams.delete("page")
  window.location.href = currentUrl.toString()
}

function sortTable(column) {
  const currentUrl = new URL(window.location)
  const currentSortBy = currentUrl.searchParams.get("sortBy")
  const currentSortOrder = currentUrl.searchParams.get("sortOrder") || "desc"

  let newSortOrder = "desc"
  if (currentSortBy === column && currentSortOrder === "desc") {
    newSortOrder = "asc"
  }

  currentUrl.searchParams.set("sortBy", column)
  currentUrl.searchParams.set("sortOrder", newSortOrder)
  currentUrl.searchParams.delete("page")

  window.location.href = currentUrl.toString()
}

function goToPage(page) {
  const currentUrl = new URL(window.location)
  currentUrl.searchParams.set("page", page)
  window.location.href = currentUrl.toString()
}

function showUpdateStatusModal(orderId) {
  const orderRow = document.querySelector(`[data-order-id="${orderId}"]`)
  const currentStatus = orderRow ? orderRow.getAttribute('data-current-status') : 'pending'
  const ORDER_STATUS = {
    PENDING: 'pending',
    SHIPPED: 'shipped',
    OUT_FOR_DELIVERY: 'out for delivery',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    RETURNED: 'returned',
    RETURN_PENDING: 'return pending'
  }
  const statusHierarchy = {
    [ORDER_STATUS.PENDING]: 0,
    [ORDER_STATUS.SHIPPED]: 1,
    [ORDER_STATUS.OUT_FOR_DELIVERY]: 2,
    [ORDER_STATUS.DELIVERED]: 3,
    [ORDER_STATUS.CANCELLED]: 4,
    [ORDER_STATUS.RETURNED]: 5,
    [ORDER_STATUS.RETURN_PENDING]: 6
  }
  if (currentStatus === ORDER_STATUS.DELIVERED || currentStatus === ORDER_STATUS.CANCELLED || currentStatus === ORDER_STATUS.RETURNED) {
    Swal.fire({
      icon: 'info',
      title: 'Status Cannot Be Changed',
      text: `Orders with status "${currentStatus}" cannot be changed to other statuses.`,
      confirmButtonColor: '#667eea'
    })
    return
  }

  const currentLevel = statusHierarchy[currentStatus] || 0
  const allStatuses = [
    { value: ORDER_STATUS.PENDING, label: 'Pending', icon: '📋' },
    { value: ORDER_STATUS.SHIPPED, label: 'Shipped', icon: '🚚' },
    { value: ORDER_STATUS.OUT_FOR_DELIVERY, label: 'Out for Delivery', icon: '🚛' },
    { value: ORDER_STATUS.DELIVERED, label: 'Delivered', icon: '✅' },
    { value: ORDER_STATUS.CANCELLED, label: 'Cancelled', icon: '❌' },
    { value: ORDER_STATUS.RETURNED, label: 'Returned', icon: '↩️' },
    { value: ORDER_STATUS.RETURN_PENDING, label: 'Return Pending', icon: '⏳' }
  ]

  const statusOptions = allStatuses.map(status => {
    const statusLevel = statusHierarchy[status.value]
    let disabled = false
    let disabledReason = ''
    if (status.value === currentStatus) {
      return `<option value="${status.value}" selected>${status.icon} ${status.label} (Current)</option>`
    }
    if (status.value === ORDER_STATUS.CANCELLED && currentStatus !== ORDER_STATUS.DELIVERED) {
      disabled = false
    } else if (statusLevel <= currentLevel && status.value !== ORDER_STATUS.CANCELLED) {
      disabled = true
      disabledReason = ' (Cannot go backwards)'
    }

    return `<option value="${status.value}" ${disabled ? 'disabled' : ''}>${status.icon} ${status.label}${disabledReason}</option>`
  }).join('')

  Swal.fire({
    title: "Update Order Status",
    html: `
            <div class="text-start">
                <div class="mb-3">
                    <p class="text-muted mb-2">Current Status: <strong>${currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}</strong></p>
                    <label for="orderStatus" class="form-label fw-semibold">Select New Status:</label>
                    <select id="orderStatus" class="form-select">
                        ${statusOptions}
                    </select>
                    <small class="text-muted mt-1">Note: You can only move forward in the order process or cancel the order.</small>
                </div>
                <div class="mb-3">
                    <label for="statusNote" class="form-label fw-semibold">Note (Optional):</label>
                    <textarea id="statusNote" class="form-control" placeholder="Add a note about this status change..." rows="3"></textarea>
                </div>
            </div>
        `,
    showCancelButton: true,
    confirmButtonText: "Update Status",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#667eea",
    cancelButtonColor: "#6c757d",
    width: "500px",
    preConfirm: () => {
      const status = document.getElementById("orderStatus").value
      const note = document.getElementById("statusNote").value.trim()

      if (!status) {
        Swal.showValidationMessage("Please select a status")
        return false
      }

      return { status, note }
    },
  }).then((result) => {
    if (result.isConfirmed) {
      updateOrderStatus(orderId, result.value.status, result.value.note)
    }
  })
}

function updateOrderStatus(orderId, status, note) {
  Swal.fire({
    title: "Updating Order Status",
    text: "Please wait while we update the order status...",
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading()
    },
  })

  fetch(`/admin/orders/update-status/${orderId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({ status, note }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: data.message || "Order status updated successfully",
          confirmButtonText: "OK",
          confirmButtonColor: "#28a745",
        }).then(() => {
          window.location.reload()
        })
      } else {
        throw new Error(data.message || "Failed to update order status")
      }
    })
    .catch((error) => {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "An error occurred while updating the order status. Please try again.",
        confirmButtonText: "OK",
        confirmButtonColor: "#dc3545",
      })
    })
}

function exportOrders() {
  Swal.fire({
    title: "Export Orders",
    text: "Choose export format:",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "CSV",
    cancelButtonText: "Excel",
    confirmButtonColor: "#28a745",
    cancelButtonColor: "#17a2b8",
  }).then((result) => {
    if (result.isConfirmed) {
      exportToFormat("csv")
    } else if (result.dismiss === Swal.DismissReason.cancel) {
      exportToFormat("excel")
    }
  })
}

function exportToFormat(format) {
  Swal.fire({
    icon: "info",
    title: "Export Feature",
    text: `${format.toUpperCase()} export functionality will be implemented soon.`,
    confirmButtonColor: "#667eea",
  })
}

function handleResponsiveTable() {
  const table = document.querySelector(".table")
  const container = document.querySelector(".table-responsive")

  if (table && container) {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        container.style.overflowX = "auto"
      } else {
        container.style.overflowX = "visible"
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
  }
}

window.addEventListener("resize", handleResponsiveTable)
window.addEventListener("load", handleResponsiveTable)
window.applyTimeFilter = applyTimeFilter
window.applyStatusFilter = applyStatusFilter
window.applyPaymentFilter = applyPaymentFilter
window.applyReturnFilter = applyReturnFilter
window.clearAllFilters = clearAllFilters
window.sortTable = sortTable
window.goToPage = goToPage
window.toggleFilters = toggleFilters
window.performSearch = performSearch
window.exportOrders = exportOrders
window.removeFilter = removeFilter
window.applySorting = applySorting
