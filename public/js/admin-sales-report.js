class SalesReportManager {
  constructor() {
    this.$ = window.$ || null
    this.flatpickr = window.flatpickr || null
    this.init()
  }

  init() {
    this.initFilterHandlers()
    this.initSearchFunctionality()
    this.initDataTables()
    this.initExportButtons()
  }

  initFilterHandlers() {
    const timeFilterInputs = document.querySelectorAll('input[name="timeFilter"]')
    const customDateRange = document.querySelector(".custom-date-range")

    if (!timeFilterInputs.length || !customDateRange) {
      console.warn("Filter elements not found")
      return
    }

    timeFilterInputs.forEach((input) => {
      input.addEventListener("change", function () {
        if (this.value === "custom") {
          customDateRange.classList.remove("d-none")
        } else {
          customDateRange.classList.add("d-none")
        }
      })
    })
    if (typeof this.flatpickr !== "undefined") {
      this.flatpickr("#startDate", {
        dateFormat: "Y-m-d",
        maxDate: "today",
        onChange: (selectedDates, dateStr, instance) => {
          const endDatePicker = document.querySelector("#endDate")._flatpickr
          if (endDatePicker && selectedDates[0]) {
            endDatePicker.set("minDate", selectedDates[0])
          }
        },
      })

      this.flatpickr("#endDate", {
        dateFormat: "Y-m-d",
        maxDate: "today",
        onChange: (selectedDates, dateStr, instance) => {
          const startDatePicker = document.querySelector("#startDate")._flatpickr
          if (startDatePicker && selectedDates[0]) {
            startDatePicker.set("maxDate", selectedDates[0])
          }
        },
      })
    } else {
      console.warn("flatpickr not available")
    }
  }

  initSearchFunctionality() {
    const orderSearchInput = document.getElementById("orderSearchInput")
    if (orderSearchInput) {
      orderSearchInput.addEventListener(
        "keyup",
        this.debounce((e) => {
          this.searchTable("orderDetailsTable", e.target.value)
        }, 300),
      )
    }
    const transactionSearchInput = document.getElementById("transactionSearchInput")
    if (transactionSearchInput) {
      transactionSearchInput.addEventListener(
        "keyup",
        this.debounce((e) => {
          this.searchTable("transactionDetailsTable", e.target.value)
        }, 300),
      )
    }
  }

  searchTable(tableId, searchTerm) {
    const table = document.getElementById(tableId)
    if (!table) return

    const rows = table.querySelectorAll("tbody tr")
    const term = searchTerm.toLowerCase().trim()

    rows.forEach((row) => {
      const text = row.textContent.toLowerCase()
      if (term === "" || text.includes(term)) {
        row.style.display = ""
        row.classList.remove("d-none")
      } else {
        row.style.display = "none"
        row.classList.add("d-none")
      }
    })
    const visibleRows = Array.from(rows).filter((row) => row.style.display !== "none")
    this.updateSearchResultCount(tableId, visibleRows.length, rows.length)
  }

  updateSearchResultCount(tableId, visibleCount, totalCount) {
    const table = document.getElementById(tableId)
    if (!table) return

    let countElement = table.querySelector(".search-result-count")
    if (!countElement) {
      countElement = document.createElement("div")
      countElement.className = "search-result-count text-muted small mt-2"
      table.parentNode.appendChild(countElement)
    }

    if (visibleCount === totalCount) {
      countElement.textContent = ""
    } else {
      countElement.textContent = `Showing ${visibleCount} of ${totalCount} results`
    }
  }

  initDataTables() {
    if (typeof this.$ === "undefined" || !this.$.fn || !this.$.fn.DataTable) {
      console.warn("jQuery or DataTables not available, using basic functionality")
      return
    }

    try {
      if (!this.$.fn.DataTable.isDataTable("#dailySalesTable")) {
        this.$("#dailySalesTable").DataTable({
          paging: false,
          searching: false,
          info: false,
          responsive: true,
          order: [[0, "desc"]],
          columnDefs: [{ targets: [1, 2, 3, 4, 5, 6], className: "text-end" }],
        })
      }
    } catch (error) {
      console.error("Error initializing DataTables:", error)
    }
  }

  initExportButtons() {
    const pdfButtons = document.querySelectorAll('[href*="download-pdf"]')
    pdfButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Generating PDF...'
        button.classList.add("disabled")
        setTimeout(() => {
          button.innerHTML = '<i class="fas fa-file-pdf me-2 text-danger"></i> Download PDF'
          button.classList.remove("disabled")
        }, 5000)
      })
    })
    const excelButtons = document.querySelectorAll('[href*="download-excel"]')
    excelButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Generating Excel...'
        button.classList.add("disabled")
        setTimeout(() => {
          button.innerHTML = '<i class="fas fa-file-excel me-2 text-success"></i> Download Excel'
          button.classList.remove("disabled")
        }, 5000)
      })
    })
  }
  debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }
  exportToPDF() {
    const currentUrl = new URL(window.location.href)
    const params = new URLSearchParams(currentUrl.search)

    const exportUrl = `/admin/sales-report/download-pdf?${params.toString()}`
    window.open(exportUrl, "_blank")
  }

  exportToExcel() {
    const currentUrl = new URL(window.location.href)
    const params = new URLSearchParams(currentUrl.search)

    const exportUrl = `/admin/sales-report/download-excel?${params.toString()}`
    window.location.href = exportUrl
  }
  updatePaginationInfo() {
    const paginationInfos = document.querySelectorAll(".pagination-info")
    paginationInfos.forEach((info) => {
      console.log("Pagination info updated")
    })
  }
  validateDateRange() {
    const startDate = document.getElementById("startDate")
    const endDate = document.getElementById("endDate")
    const customRadio = document.getElementById("timeCustom")

    if (customRadio && customRadio.checked) {
      if (!startDate.value || !endDate.value) {
        alert("Please select both start and end dates for custom range")
        return false
      }

      if (new Date(startDate.value) > new Date(endDate.value)) {
        alert("Start date cannot be later than end date")
        return false
      }
    }

    return true
  }
  handleFormSubmission() {
    const form = document.getElementById("reportFilterForm")
    if (form) {
      form.addEventListener("submit", (e) => {
        if (!this.validateDateRange()) {
          e.preventDefault()
          return false
        }
        const submitBtn = form.querySelector('button[type="submit"]')
        if (submitBtn) {
          const originalText = submitBtn.innerHTML
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Generating Report...'
          submitBtn.disabled = true
          setTimeout(() => {
            submitBtn.innerHTML = originalText
            submitBtn.disabled = false
          }, 10000)
        }
      })
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const salesReportManager = new SalesReportManager()
  window.salesReportManager = salesReportManager
  salesReportManager.handleFormSubmission()
  window.addEventListener("resize", () => {
    salesReportManager.updatePaginationInfo()
  })
})
