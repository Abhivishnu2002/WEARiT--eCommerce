class SalesReportCharts {
  constructor() {
    this.salesTrendChart = null
    this.paymentMethodChart = null
    this.chartColors = {
      revenue: {
        border: "#0d6efd",
        background: "rgba(13, 110, 253, 0.1)",
      },
      discount: {
        border: "#ffc107",
        background: "rgba(255, 193, 7, 0.1)",
      },
      count: {
        border: "#198754",
        background: "rgba(25, 135, 84, 0.1)",
      },
      paymentMethods: ["#0d6efd", "#198754", "#dc3545", "#ffc107", "#6f42c1"],
    }
    this.$ = window.$ || null 
    this.flatpickr = window.flatpickr || null 
  }
  initCharts(reportData) {
    if (!reportData) {
      console.warn("No report data provided")
      return
    }

    this.initSalesTrendChart(reportData)
    this.initPaymentMethodChart(reportData)
    this.initDataTables()
  }
  initSalesTrendChart(reportData) {
    const salesTrendCtx = document.getElementById("salesTrendChart")
    if (!salesTrendCtx) {
      console.error("Sales trend chart canvas not found")
      return
    }
    const labels = reportData.chartData.labels || []
    const revenueData = reportData.chartData.revenue || []
    const discountData = reportData.chartData.discount || []
    const orderCountData = reportData.chartData.orderCount || []

    console.log("Chart Data:", { labels, revenueData, discountData, orderCountData })
    if (labels.length === 0 || revenueData.length === 0) {
      console.warn("No data available for sales trend chart")
      this.displayNoDataMessage(salesTrendCtx, "No sales data available for the selected period")
      return
    }
    const allValues = [...revenueData, ...discountData].filter(
      (val) => val !== null && val !== undefined && !isNaN(val),
    )

    if (allValues.length === 0) {
      console.warn("No valid data points for sales trend chart")
      this.displayNoDataMessage(salesTrendCtx, "No valid sales data available")
      return
    }

    const maxValue = Math.max(...allValues, 0)
    const minValue = Math.min(...allValues, 0)
    const yAxisMax = this.calculateNiceScale(maxValue, 1.1)
    const yAxisMin = minValue < 0 ? this.calculateNiceScale(minValue, 1.1) : 0
    if (this.salesTrendChart) {
      this.salesTrendChart.destroy()
    }
    try {
      const Chart = window.Chart || (typeof require !== "undefined" ? require("chart.js/auto") : null)

      if (!Chart) {
        console.error("Chart.js not available")
        this.displayNoDataMessage(salesTrendCtx, "Chart.js library not loaded")
        return
      }

      this.salesTrendChart = new Chart(salesTrendCtx, {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Revenue",
              data: revenueData,
              borderColor: this.chartColors.revenue.border,
              backgroundColor: this.chartColors.revenue.background,
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              yAxisID: "y",
            },
            {
              label: "Discount",
              data: discountData,
              borderColor: this.chartColors.discount.border,
              backgroundColor: this.chartColors.discount.background,
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              yAxisID: "y",
            },
            {
              label: "Order Count",
              data: orderCountData,
              borderColor: this.chartColors.count.border,
              backgroundColor: this.chartColors.count.background,
              borderWidth: 2,
              fill: false,
              tension: 0.4,
              yAxisID: "y1",
              type: "bar",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: {
                font: {
                  family: "'Inter', sans-serif",
                },
                usePointStyle: true,
                padding: 20,
              },
            },
            tooltip: {
              mode: "index",
              intersect: false,
              callbacks: {
                label: (context) => {
                  let label = context.dataset.label || ""
                  if (label) {
                    label += ": "
                  }
                  if (context.parsed.y !== null) {
                    if (label.includes("Count")) {
                      label += context.parsed.y.toLocaleString()
                    } else {
                      label += new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                      }).format(context.parsed.y)
                    }
                  }
                  return label
                },
              },
            },
          },
          scales: {
            x: {
              grid: {
                color: "rgba(0, 0, 0, 0.05)",
              },
              ticks: {
                font: {
                  family: "'Inter', sans-serif",
                },
                maxRotation: 45,
                minRotation: 45,
              },
            },
            y: {
              type: "linear",
              display: true,
              position: "left",
              beginAtZero: yAxisMin >= 0,
              min: yAxisMin,
              max: yAxisMax,
              grid: {
                color: "rgba(0, 0, 0, 0.05)",
              },
              ticks: {
                callback: (value) => "₹" + value.toLocaleString("en-IN"),
                maxTicksLimit: 8,
                font: {
                  family: "'Inter', sans-serif",
                },
              },
              suggestedMin: yAxisMin,
              suggestedMax: yAxisMax,
            },
            y1: {
              type: "linear",
              display: true,
              position: "right",
              beginAtZero: true,
              grid: {
                drawOnChartArea: false,
              },
              ticks: {
                callback: (value) => value.toLocaleString(),
                maxTicksLimit: 6,
                font: {
                  family: "'Inter', sans-serif",
                },
              },
            },
          },
          interaction: {
            mode: "index",
            intersect: false,
          },
          elements: {
            point: {
              radius: 3,
              hoverRadius: 5,
            },
            line: {
              borderWidth: 2,
            },
          },
          animation: {
            duration: 1000,
            easing: "easeOutQuart",
          },
        },
      })

      console.log("Sales trend chart initialized successfully")
    } catch (error) {
      console.error("Error initializing sales trend chart:", error)
      this.displayNoDataMessage(salesTrendCtx, "Error initializing chart: " + error.message)
    }
  }
  displayNoDataMessage(canvas, message) {
    try {
      const ctx = canvas.getContext("2d")
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.font = "14px Inter, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillStyle = "#6c757d"
      ctx.fillText(message, canvas.width / 2, canvas.height / 2)
    } catch (error) {
      console.error("Error displaying no data message:", error)
    }
  }
  initPaymentMethodChart(reportData) {
    const paymentMethodCtx = document.getElementById("paymentMethodChart")
    if (!paymentMethodCtx) {
      console.error("Payment method chart canvas not found")
      return
    }
    const paymentMethods = Object.keys(reportData.paymentMethods || {})

    if (paymentMethods.length === 0) {
      console.warn("No payment methods data available")
      this.displayNoDataMessage(paymentMethodCtx, "No payment methods data available")
      return
    }

    const paymentAmounts = paymentMethods.map((method) => reportData.paymentMethods[method].amount)
    const paymentCounts = paymentMethods.map((method) => reportData.paymentMethods[method].count)
    const backgroundColors = paymentMethods.map(
      (_, index) => this.chartColors.paymentMethods[index % this.chartColors.paymentMethods.length],
    )
    const formattedLabels = paymentMethods.map((method) => {
      return method.charAt(0).toUpperCase() + method.slice(1)
    })

    if (this.paymentMethodChart) {
      this.paymentMethodChart.destroy()
    }

    try {
      const Chart = window.Chart || (typeof require !== "undefined" ? require("chart.js/auto") : null)

      if (!Chart) {
        console.error("Chart.js not available")
        this.displayNoDataMessage(paymentMethodCtx, "Chart.js library not loaded")
        return
      }

      this.paymentMethodChart = new Chart(paymentMethodCtx, {
        type: "doughnut",
        data: {
          labels: formattedLabels,
          datasets: [
            {
              data: paymentAmounts,
              backgroundColor: backgroundColors,
              borderWidth: 1,
              hoverOffset: 15,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                padding: 20,
                boxWidth: 12,
                font: {
                  family: "'Inter', sans-serif",
                },
                usePointStyle: true,
              },
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || ""
                  const value = context.raw
                  const count = paymentCounts[context.dataIndex]
                  const total = context.dataset.data.reduce((a, b) => a + b, 0)
                  const percentage = Math.round((value / total) * 100)

                  return [
                    `${label}: ${new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                    }).format(value)}`,
                    `Orders: ${count} (${percentage}%)`,
                  ]
                },
              },
            },
          },
          cutout: "70%",
          animation: {
            animateRotate: true,
            animateScale: true,
            duration: 1000,
            easing: "easeOutQuart",
          },
        },
      })

      console.log("Payment method chart initialized successfully")
    } catch (error) {
      console.error("Error initializing payment method chart:", error)
      this.displayNoDataMessage(paymentMethodCtx, "Error initializing chart: " + error.message)
    }
  }
  initDataTables() {
    if (typeof this.$ === "undefined" || !this.$.fn || !this.$.fn.DataTable) {
      console.error("jQuery or DataTables not available")
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
        })
      }

      if (!this.$.fn.DataTable.isDataTable("#orderDetailsTable")) {
        this.$("#orderDetailsTable").DataTable({
          paging: false,
          searching: true,
          info: false,
          responsive: true,
          order: [[1, "desc"]],
        })
      }

      if (!this.$.fn.DataTable.isDataTable("#transactionDetailsTable")) {
        this.$("#transactionDetailsTable").DataTable({
          paging: false,
          searching: true,
          info: false,
          responsive: true,
          order: [[2, "desc"]],
        })
      }
      this.$("#orderSearchInput")
        .off("keyup")
        .on("keyup", function () {
          this.$.fn.DataTable("#orderDetailsTable").search(this.value).draw()
        })

      this.$("#transactionSearchInput")
        .off("keyup")
        .on("keyup", function () {
          this.$.fn.DataTable("#transactionDetailsTable").search(this.value).draw()
        })

      console.log("DataTables initialized successfully")
    } catch (error) {
      console.error("Error initializing DataTables:", error)
    }
  }

  calculateNiceScale(value, factor = 1) {
    if (value === 0) return 10
    value = Math.abs(value) * factor * (value < 0 ? -1 : 1)
    const magnitude = Math.floor(Math.log10(Math.abs(value)))
    const powerOf10 = Math.pow(10, magnitude)
    const normalizedValue = value / powerOf10
    let niceValue
    if (normalizedValue < 1.5) niceValue = 1
    else if (normalizedValue < 3) niceValue = 2
    else if (normalizedValue < 7) niceValue = 5
    else niceValue = 10
    return niceValue * powerOf10
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
      })

      this.flatpickr("#endDate", {
        dateFormat: "Y-m-d",
        maxDate: "today",
      })
    } else {
      console.warn("flatpickr not available")
    }

    console.log("Filter handlers initialized")
  }
  handleResize() {
    if (this.salesTrendChart) {
      this.salesTrendChart.resize()
    }
    if (this.paymentMethodChart) {
      this.paymentMethodChart.resize()
    }
  }
}
document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing Sales Report Charts")
  const salesReportCharts = new SalesReportCharts()
  salesReportCharts.initFilterHandlers()
  if (typeof window.reportData !== "undefined" && window.reportData) {
    console.log("Report data found, initializing charts")
    salesReportCharts.initCharts(window.reportData)
    window.addEventListener("resize", () => {
      salesReportCharts.handleResize()
    })
  } else {
    console.warn("No report data available")
  }
})
