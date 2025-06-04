const moment = require("moment")

/**
 * Format currency amount to Indian Rupee format
 * @param {number} amount - The amount to format
 * @param {boolean} forPDF - Whether formatting is for PDF (simpler format)
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, forPDF = false) => {
  if (forPDF) {
    // Simpler format for PDF to avoid rendering issues
    return `₹${(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount || 0)
}

/**
 * Get date range based on filter type
 * @param {string} filter - The time filter (daily, weekly, monthly, yearly)
 * @returns {object} Object with startDate and endDate
 */
const getDateRange = (filter) => {
  const endDate = new Date()
  endDate.setHours(23, 59, 59, 999)

  const startDate = new Date()

  switch (filter) {
    case "daily":
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
      break
    case "weekly":
      startDate.setDate(startDate.getDate() - 84) // 12 weeks
      startDate.setHours(0, 0, 0, 0)
      break
    case "monthly":
      startDate.setMonth(startDate.getMonth() - 12)
      startDate.setHours(0, 0, 0, 0)
      break
    case "yearly":
      startDate.setFullYear(startDate.getFullYear() - 5)
      startDate.setHours(0, 0, 0, 0)
      break
    default:
      // Default to last 30 days
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
  }

  return { startDate, endDate }
}

/**
 * Group data by time period (daily, weekly, monthly, yearly)
 * @param {Array} data - Array of order/transaction data
 * @param {string} period - Time period to group by
 * @returns {Array} Grouped data array
 */
const groupDataByTimePeriod = (data, period) => {
  const groupedData = {}

  data.forEach((item) => {
    let key
    const date = new Date(item.orderDate || item.createdAt)

    switch (period) {
      case "daily":
        key = moment(date).format("YYYY-MM-DD")
        break
      case "weekly":
        // Get the start of the week (Monday)
        const weekStart = moment(date).startOf("isoWeek")
        key = `Week of ${weekStart.format("MMM DD, YYYY")}`
        break
      case "monthly":
        key = moment(date).format("MMM YYYY")
        break
      case "yearly":
        key = moment(date).format("YYYY")
        break
      default:
        key = moment(date).format("YYYY-MM-DD")
    }

    if (!groupedData[key]) {
      groupedData[key] = {
        count: 0,
        revenue: 0,
        discount: 0,
        couponDiscount: 0,
        date: date,
      }
    }

    groupedData[key].count += 1
    groupedData[key].revenue += item.finalAmount || 0
    groupedData[key].discount += item.discount || 0

    // Handle coupon discounts
    if (item.coupon && item.coupon.discountAmount) {
      groupedData[key].couponDiscount += item.coupon.discountAmount
    }
  })

  // Convert to array and sort by date
  return Object.entries(groupedData)
    .map(([key, value]) => ({
      period: key,
      ...value,
    }))
    .sort((a, b) => a.date - b.date)
}

/**
 * Calculate percentage with safe division
 * @param {number} part - The part value
 * @param {number} total - The total value
 * @returns {number} Percentage value
 */
const calculatePercentage = (part, total) => {
  if (!total || total === 0) return 0
  return (part / total) * 100
}

/**
 * Generate date range array between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Array of dates
 */
const generateDateRange = (startDate, endDate) => {
  const dates = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dates
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @param {string} format - Format string
 * @returns {string} Formatted date string
 */
const formatDate = (date, format = "MMM DD, YYYY") => {
  return moment(date).format(format)
}

/**
 * Calculate growth percentage between two values
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} Growth percentage
 */
const calculateGrowth = (current, previous) => {
  if (!previous || previous === 0) {
    return current > 0 ? 100 : 0
  }
  return ((current - previous) / previous) * 100
}

/**
 * Round number to specified decimal places
 * @param {number} num - Number to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} Rounded number
 */
const roundToDecimals = (num, decimals = 2) => {
  return Math.round((num + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

/**
 * Get time period label
 * @param {string} period - Time period
 * @returns {string} Formatted period label
 */
const getPeriodLabel = (period) => {
  const labels = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
    custom: "Custom Range",
  }
  return labels[period] || "Unknown"
}

/**
 * Validate date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {boolean} True if valid range
 */
const isValidDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false
  return startDate <= endDate
}

module.exports = {
  formatCurrency,
  getDateRange,
  groupDataByTimePeriod,
  calculatePercentage,
  generateDateRange,
  formatDate,
  calculateGrowth,
  roundToDecimals,
  getPeriodLabel,
  isValidDateRange,
}
