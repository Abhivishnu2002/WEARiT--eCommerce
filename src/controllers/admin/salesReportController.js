const Order = require("../../models/orderModel")
const Transaction = require("../../models/transactionModel")
const User = require("../../models/userModel")
const Product = require("../../models/productModel")
const PDFDocument = require("pdfkit")
const ExcelJS = require("exceljs")
const fs = require("fs")
const path = require("path")
const moment = require("moment")

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount)
}

const getDateRange = (filter) => {
  const endDate = new Date()
  endDate.setHours(23, 59, 59, 999)

  const startDate = new Date()

  switch (filter) {
    case "daily":
      startDate.setHours(0, 0, 0, 0)
      break
    case "weekly":
      startDate.setDate(startDate.getDate() - 7)
      startDate.setHours(0, 0, 0, 0)
      break
    case "monthly":
      startDate.setMonth(startDate.getMonth() - 1)
      startDate.setHours(0, 0, 0, 0)
      break
    case "yearly":
      startDate.setFullYear(startDate.getFullYear() - 1)
      startDate.setHours(0, 0, 0, 0)
      break
    default:
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
  }

  return { startDate, endDate }
}
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
        key = `Week ${moment(date).week()}, ${moment(date).year()}`
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

    if (item.coupon && item.coupon.discountAmount) {
      groupedData[key].couponDiscount += item.coupon.discountAmount
    }
  })
  return Object.entries(groupedData)
    .map(([key, value]) => ({
      period: key,
      ...value,
    }))
    .sort((a, b) => a.date - b.date)
}

const salesReportController = {
  getSalesReport: async (req, res) => {
    try {
      const timeFilter = req.query.timeFilter || "monthly"
      const customStartDate = req.query.startDate ? new Date(req.query.startDate) : null
      const customEndDate = req.query.endDate ? new Date(req.query.endDate) : null
      const paymentMethod = req.query.paymentMethod || ""
      const sortBy = req.query.sortBy || "orderDate"
      const sortOrder = req.query.sortOrder || "desc"
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 10
      const search = req.query.search || ""
      let dateRange
      if (customStartDate && customEndDate) {
        customEndDate.setHours(23, 59, 59, 999)
        dateRange = { startDate: customStartDate, endDate: customEndDate }
      } else {
        dateRange = getDateRange(timeFilter)
      }
      const query = {
        orderDate: { $gte: dateRange.startDate, $lte: dateRange.endDate },
      }
      if (paymentMethod) {
        query.paymentMethod = paymentMethod
      }
      if (search) {
        query.$or = [
          { orderID: { $regex: search, $options: "i" } },
          { "paymentDetails.transactionId": { $regex: search, $options: "i" } },
        ]
      }
      const totalOrders = await Order.countDocuments(query)
      const totalPages = Math.ceil(totalOrders / limit)
      const orders = await Order.find(query)
        .populate("user", "name email mobile")
        .populate({
          path: "products.product",
          select: "name images categoryId",
          populate: {
            path: "categoryId",
            select: "name",
          },
        })
        .populate("address")
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
      const allOrders = await Order.find(query).populate("user", "name email mobile").lean()
      const transactions = await Transaction.find({
        createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate },
      })
        .populate("user", "name email")
        .populate("order", "orderID")
        .sort({ createdAt: sortOrder === "asc" ? 1 : -1 })
        .lean()
      const totalRevenue = allOrders.reduce((sum, order) => sum + order.finalAmount, 0)
      const totalDiscount = allOrders.reduce((sum, order) => sum + (order.discount || 0), 0)
      const totalCouponDiscount = allOrders.reduce((sum, order) => {
        return sum + (order.coupon && order.coupon.discountAmount ? order.coupon.discountAmount : 0)
      }, 0)
      const averageOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.length : 0
      const dailySales = groupDataByTimePeriod(allOrders, "daily")
      const salesByPeriod = groupDataByTimePeriod(allOrders, timeFilter)
      const paymentMethods = {}
      allOrders.forEach((order) => {
        const method = order.paymentMethod
        if (!paymentMethods[method]) {
          paymentMethods[method] = {
            count: 0,
            amount: 0,
          }
        }
        paymentMethods[method].count += 1
        paymentMethods[method].amount += order.finalAmount
      })
      const customerSales = {}
      allOrders.forEach((order) => {
        const userId = order.user ? order.user._id.toString() : "Unknown"
        const userName = order.user ? order.user.name : "Unknown User"
        const userEmail = order.user ? order.user.email : "Unknown"

        if (!customerSales[userId]) {
          customerSales[userId] = {
            name: userName,
            email: userEmail,
            orderCount: 0,
            totalSpent: 0,
          }
        }

        customerSales[userId].orderCount += 1
        customerSales[userId].totalSpent += order.finalAmount
      })

      const topCustomers = Object.values(customerSales)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5)
      const chartLabels = salesByPeriod.map((item) => item.period)
      const revenueData = salesByPeriod.map((item) => {
        const value = Number.parseFloat(item.revenue.toFixed(2))
        return isNaN(value) ? 0 : value
      })
      const orderCountData = salesByPeriod.map((item) => item.count)
      const discountData = salesByPeriod.map((item) => {
        const totalDiscount = (item.discount || 0) + (item.couponDiscount || 0)
        const value = Number.parseFloat(totalDiscount.toFixed(2))
        return isNaN(value) ? 0 : value
      })
      const availablePaymentMethods = await Order.distinct("paymentMethod")
      const reportData = {
        timeFilter,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        totalOrders: allOrders.length,
        totalRevenue,
        totalDiscount,
        totalCouponDiscount,
        averageOrderValue,
        paymentMethods,
        topCustomers,
        dailySales,
        orders,
        transactions,
        chartData: {
          labels: chartLabels,
          revenue: revenueData,
          orderCount: orderCountData,
          discount: discountData,
        },
        pagination: {
          page,
          limit,
          totalPages,
          totalItems: totalOrders,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters: {
          timeFilter,
          paymentMethod,
          sortBy,
          sortOrder,
          search,
          availablePaymentMethods,
        },
      }
      res.render("admin/pages/salesReport", {
        admin: req.session.admin,
        reportData,
        moment,
        formatCurrency,
      })
    } catch (error) {
      console.error("Error generating sales report:", error)
      res.render("admin/pages/salesReport", {
        admin: req.session.admin,
        error_msg: "Failed to generate sales report: " + error.message,
        reportData: null,
      })
    }
  },
  downloadPDF: async (req, res) => {
    try {
      const timeFilter = req.query.timeFilter || "monthly"
      const customStartDate = req.query.startDate ? new Date(req.query.startDate) : null
      const customEndDate = req.query.endDate ? new Date(req.query.endDate) : null
      const paymentMethod = req.query.paymentMethod || ""
      let dateRange
      if (customStartDate && customEndDate) {
        customEndDate.setHours(23, 59, 59, 999)
        dateRange = { startDate: customStartDate, endDate: customEndDate }
      } else {
        dateRange = getDateRange(timeFilter)
      }
      const query = {
        orderDate: { $gte: dateRange.startDate, $lte: dateRange.endDate },
      }
      if (paymentMethod) {
        query.paymentMethod = paymentMethod
      }
      const orders = await Order.find(query)
        .populate("user", "name email mobile")
        .populate({
          path: "products.product",
          select: "name images categoryId",
          populate: {
            path: "categoryId",
            select: "name",
          },
        })
        .populate("address")
        .sort({ orderDate: -1 })
        .lean()
      const totalOrders = orders.length
      const totalRevenue = orders.reduce((sum, order) => sum + order.finalAmount, 0)
      const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0)
      const totalCouponDiscount = orders.reduce((sum, order) => {
        return sum + (order.coupon && order.coupon.discountAmount ? order.coupon.discountAmount : 0)
      }, 0)
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
      const dailySales = groupDataByTimePeriod(orders, "daily")
      const doc = new PDFDocument({ margin: 50, size: "A4", layout: "landscape" })
      res.setHeader("Content-Type", "application/pdf")
      res.setHeader("Content-Disposition", `attachment; filename=sales-report-${moment().format("YYYY-MM-DD")}.pdf`)
      doc.pipe(res)
      doc.fontSize(20).text("WEARiT Sales Report", { align: "center" })
      doc.moveDown()
      doc
        .fontSize(12)
        .text(
          `Report Period: ${moment(dateRange.startDate).format("MMM DD, YYYY")} - ${moment(dateRange.endDate).format(
            "MMM DD, YYYY",
          )}`,
          { align: "center" },
        )
      doc.moveDown(2)
      doc.fontSize(16).text("Summary", { underline: true })
      doc.moveDown()
      doc.fontSize(12).text(`Total Orders: ${totalOrders}`)
      doc.fontSize(12).text(`Total Revenue: ${formatCurrency(totalRevenue)}`)
      doc.fontSize(12).text(`Total Discount: ${formatCurrency(totalDiscount)}`)
      doc.fontSize(12).text(`Total Coupon Discount: ${formatCurrency(totalCouponDiscount)}`)
      doc.fontSize(12).text(`Net Revenue: ${formatCurrency(totalRevenue - totalDiscount - totalCouponDiscount)}`)
      doc.fontSize(12).text(`Average Order Value: ${formatCurrency(averageOrderValue)}`)
      doc.moveDown(2)
      doc.fontSize(16).text("Daily Sales", { underline: true })
      doc.moveDown()
      let tableTop = doc.y
      const dailyTableHeaders = ["Date", "Orders", "Revenue", "Discount", "Net Revenue"]
      const dailyColumnWidths = [120, 80, 120, 120, 120]
      let xPos = 50
      dailyTableHeaders.forEach((header, i) => {
        doc.fontSize(10).text(header, xPos, tableTop, { width: dailyColumnWidths[i], align: "left" })
        xPos += dailyColumnWidths[i]
      })
      doc
        .moveTo(50, tableTop + 20)
        .lineTo(710, tableTop + 20)
        .stroke()
      let yPos = tableTop + 30
      dailySales.forEach((day) => {
        if (yPos > 500) {
          doc.addPage()
          yPos = 50
          doc.fontSize(16).text("Daily Sales (Continued)", { underline: true })
          doc.moveDown()
          tableTop = doc.y
          xPos = 50
          dailyTableHeaders.forEach((header, i) => {
            doc.fontSize(10).text(header, xPos, tableTop, { width: dailyColumnWidths[i], align: "left" })
            xPos += dailyColumnWidths[i]
          })
          doc
            .moveTo(50, tableTop + 20)
            .lineTo(710, tableTop + 20)
            .stroke()
          yPos = tableTop + 30
        }

        xPos = 50
        doc.fontSize(9).text(moment(day.date).format("MMM DD, YYYY"), xPos, yPos, {
          width: dailyColumnWidths[0],
          align: "left",
        })
        xPos += dailyColumnWidths[0]

        doc.fontSize(9).text(day.count.toString(), xPos, yPos, {
          width: dailyColumnWidths[1],
          align: "left",
        })
        xPos += dailyColumnWidths[1]

        doc.fontSize(9).text(formatCurrency(day.revenue), xPos, yPos, {
          width: dailyColumnWidths[2],
          align: "left",
        })
        xPos += dailyColumnWidths[2]

        const totalDayDiscount = day.discount + day.couponDiscount
        doc.fontSize(9).text(formatCurrency(totalDayDiscount), xPos, yPos, {
          width: dailyColumnWidths[3],
          align: "left",
        })
        xPos += dailyColumnWidths[3]

        doc.fontSize(9).text(formatCurrency(day.revenue - totalDayDiscount), xPos, yPos, {
          width: dailyColumnWidths[4],
          align: "left",
        })

        yPos += 20
      })

      doc.moveDown(2)
      doc.addPage()
      doc.fontSize(16).text("Order Details", { underline: true })
      doc.moveDown()
      tableTop = doc.y
      const orderTableHeaders = ["Order ID", "Date", "Customer", "Items", "Payment", "Discount", "Total"]
      const orderColumnWidths = [80, 80, 100, 150, 80, 80, 80]
      xPos = 50
      orderTableHeaders.forEach((header, i) => {
        doc.fontSize(10).text(header, xPos, tableTop, { width: orderColumnWidths[i], align: "left" })
        xPos += orderColumnWidths[i]
      })
      doc
        .moveTo(50, tableTop + 20)
        .lineTo(710, tableTop + 20)
        .stroke()
      yPos = tableTop + 30
      orders.slice(0, 15).forEach((order) => {
        if (yPos > 500) {
          doc.addPage()
          yPos = 50
          doc.fontSize(16).text("Order Details (Continued)", { underline: true })
          doc.moveDown()
          tableTop = doc.y
          xPos = 50
          orderTableHeaders.forEach((header, i) => {
            doc.fontSize(10).text(header, xPos, tableTop, { width: orderColumnWidths[i], align: "left" })
            xPos += orderColumnWidths[i]
          })
          doc
            .moveTo(50, tableTop + 20)
            .lineTo(710, tableTop + 20)
            .stroke()
          yPos = tableTop + 30
        }

        xPos = 50
        doc.fontSize(8).text(order.orderID, xPos, yPos, {
          width: orderColumnWidths[0],
          align: "left",
        })
        xPos += orderColumnWidths[0]

        doc.fontSize(8).text(moment(order.orderDate).format("MM/DD/YYYY"), xPos, yPos, {
          width: orderColumnWidths[1],
          align: "left",
        })
        xPos += orderColumnWidths[1]

        const customerName = order.user ? order.user.name : "Unknown"
        doc.fontSize(8).text(customerName, xPos, yPos, {
          width: orderColumnWidths[2],
          align: "left",
        })
        xPos += orderColumnWidths[2]
        const itemsList = order.products
          .map((item) => {
            const productName = item.product ? item.product.name : "Unknown Product"
            return `${productName} (${item.quantity})`
          })
          .join(", ")
        doc.fontSize(8).text(itemsList, xPos, yPos, {
          width: orderColumnWidths[3],
          align: "left",
        })
        xPos += orderColumnWidths[3]

        doc.fontSize(8).text(order.paymentMethod, xPos, yPos, {
          width: orderColumnWidths[4],
          align: "left",
        })
        xPos += orderColumnWidths[4]

        const totalDiscount =
          (order.discount || 0) + (order.coupon && order.coupon.discountAmount ? order.coupon.discountAmount : 0)
        doc.fontSize(8).text(formatCurrency(totalDiscount), xPos, yPos, {
          width: orderColumnWidths[5],
          align: "left",
        })
        xPos += orderColumnWidths[5]

        doc.fontSize(8).text(formatCurrency(order.finalAmount), xPos, yPos, {
          width: orderColumnWidths[6],
          align: "left",
        })

        yPos += 20
      })

      if (orders.length > 15) {
        doc.moveDown()
        doc.fontSize(10).text(`... and ${orders.length - 15} more orders`, { align: "center", italics: true })
      }
      if (orders.length > 0) {
        doc.addPage()
        doc.fontSize(16).text("Payment Method Breakdown", { underline: true })
        doc.moveDown()
        tableTop = doc.y
        const paymentTableHeaders = ["Payment Method", "Orders", "Amount", "Percentage"]
        const paymentColumnWidths = [150, 100, 150, 150]
        xPos = 50
        paymentTableHeaders.forEach((header, i) => {
          doc.fontSize(10).text(header, xPos, tableTop, { width: paymentColumnWidths[i], align: "left" })
          xPos += paymentColumnWidths[i]
        })
        doc
          .moveTo(50, tableTop + 20)
          .lineTo(650, tableTop + 20)
          .stroke()
        const paymentMethodsBreakdown = {}
        orders.forEach((order) => {
          const method = order.paymentMethod
          if (!paymentMethodsBreakdown[method]) {
            paymentMethodsBreakdown[method] = {
              count: 0,
              amount: 0,
            }
          }
          paymentMethodsBreakdown[method].count += 1
          paymentMethodsBreakdown[method].amount += order.finalAmount
        })
        yPos = tableTop + 30
        Object.entries(paymentMethodsBreakdown).forEach(([method, data]) => {
          xPos = 50
          doc.fontSize(9).text(method, xPos, yPos, {
            width: paymentColumnWidths[0],
            align: "left",
          })
          xPos += paymentColumnWidths[0]

          doc.fontSize(9).text(data.count.toString(), xPos, yPos, {
            width: paymentColumnWidths[1],
            align: "left",
          })
          xPos += paymentColumnWidths[1]

          doc.fontSize(9).text(formatCurrency(data.amount), xPos, yPos, {
            width: paymentColumnWidths[2],
            align: "left",
          })
          xPos += paymentColumnWidths[2]

          const percentage = ((data.amount / totalRevenue) * 100).toFixed(2)
          doc.fontSize(9).text(`${percentage}%`, xPos, yPos, {
            width: paymentColumnWidths[3],
            align: "left",
          })

          yPos += 20
        })
      }
      doc.end()
    } catch (error) {
      console.error("Error generating PDF report:", error)
      res.status(500).send("Failed to generate PDF report: " + error.message)
    }
  },
  downloadExcel: async (req, res) => {
    try {
      const timeFilter = req.query.timeFilter || "monthly"
      const customStartDate = req.query.startDate ? new Date(req.query.startDate) : null
      const customEndDate = req.query.endDate ? new Date(req.query.endDate) : null
      const paymentMethod = req.query.paymentMethod || ""
      let dateRange
      if (customStartDate && customEndDate) {
        customEndDate.setHours(23, 59, 59, 999)
        dateRange = { startDate: customStartDate, endDate: customEndDate }
      } else {
        dateRange = getDateRange(timeFilter)
      }
      const query = {
        orderDate: { $gte: dateRange.startDate, $lte: dateRange.endDate },
      }
      if (paymentMethod) {
        query.paymentMethod = paymentMethod
      }
      const orders = await Order.find(query)
        .populate("user", "name email mobile")
        .populate({
          path: "products.product",
          select: "name images categoryId",
          populate: {
            path: "categoryId",
            select: "name",
          },
        })
        .populate("address")
        .sort({ orderDate: -1 })
        .lean()
      const transactions = await Transaction.find({
        createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate },
      })
        .populate("user", "name email")
        .populate("order", "orderID")
        .sort({ createdAt: -1 })
        .lean()
      const totalOrders = orders.length
      const totalRevenue = orders.reduce((sum, order) => sum + order.finalAmount, 0)
      const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0)
      const totalCouponDiscount = orders.reduce((sum, order) => {
        return sum + (order.coupon && order.coupon.discountAmount ? order.coupon.discountAmount : 0)
      }, 0)
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
      const dailySales = groupDataByTimePeriod(orders, "daily")
      const workbook = new ExcelJS.Workbook()
      workbook.creator = "WEARiT Admin"
      workbook.created = new Date()
      const summarySheet = workbook.addWorksheet("Summary")
      summarySheet.mergeCells("A1:E1")
      summarySheet.getCell("A1").value = "WEARiT Sales Report"
      summarySheet.getCell("A1").font = { size: 16, bold: true }
      summarySheet.getCell("A1").alignment = { horizontal: "center" }
      summarySheet.mergeCells("A2:E2")
      summarySheet.getCell("A2").value = `Report Period: ${moment(dateRange.startDate).format(
        "MMM DD, YYYY",
      )} - ${moment(dateRange.endDate).format("MMM DD, YYYY")}`
      summarySheet.getCell("A2").alignment = { horizontal: "center" }
      summarySheet.getCell("A4").value = "Total Orders:"
      summarySheet.getCell("B4").value = totalOrders
      summarySheet.getCell("A5").value = "Total Revenue:"
      summarySheet.getCell("B5").value = totalRevenue
      summarySheet.getCell("B5").numFmt = "₹#,##0.00"
      summarySheet.getCell("A6").value = "Total Discount:"
      summarySheet.getCell("B6").value = totalDiscount
      summarySheet.getCell("B6").numFmt = "₹#,##0.00"
      summarySheet.getCell("A7").value = "Total Coupon Discount:"
      summarySheet.getCell("B7").value = totalCouponDiscount
      summarySheet.getCell("B7").numFmt = "₹#,##0.00"
      summarySheet.getCell("A8").value = "Net Revenue:"
      summarySheet.getCell("B8").value = totalRevenue - totalDiscount - totalCouponDiscount
      summarySheet.getCell("B8").numFmt = "₹#,##0.00"
      summarySheet.getCell("A9").value = "Average Order Value:"
      summarySheet.getCell("B9").value = averageOrderValue
      summarySheet.getCell("B9").numFmt = "₹#,##0.00"
      for (let i = 4; i <= 9; i++) {
        summarySheet.getCell(`A${i}`).font = { bold: true }
      }
      const dailySheet = workbook.addWorksheet("Daily Sales")
      dailySheet.columns = [
        { header: "Date", key: "date", width: 15 },
        { header: "Orders", key: "orders", width: 10 },
        { header: "Revenue", key: "revenue", width: 15 },
        { header: "Product Discount", key: "discount", width: 15 },
        { header: "Coupon Discount", key: "couponDiscount", width: 15 },
        { header: "Total Discount", key: "totalDiscount", width: 15 },
        { header: "Net Revenue", key: "netRevenue", width: 15 },
      ]
      dailySheet.getRow(1).font = { bold: true }
      dailySheet.getRow(1).alignment = { horizontal: "center" }
      dailySales.forEach((day) => {
        const totalDayDiscount = day.discount + day.couponDiscount
        dailySheet.addRow({
          date: moment(day.date).format("MMM DD, YYYY"),
          orders: day.count,
          revenue: day.revenue,
          discount: day.discount,
          couponDiscount: day.couponDiscount,
          totalDiscount: totalDayDiscount,
          netRevenue: day.revenue - totalDayDiscount,
        })
      })
      dailySheet.getColumn("revenue").numFmt = "₹#,##0.00"
      dailySheet.getColumn("discount").numFmt = "₹#,##0.00"
      dailySheet.getColumn("couponDiscount").numFmt = "₹#,##0.00"
      dailySheet.getColumn("totalDiscount").numFmt = "₹#,##0.00"
      dailySheet.getColumn("netRevenue").numFmt = "₹#,##0.00"
      const ordersSheet = workbook.addWorksheet("Orders")
      ordersSheet.columns = [
        { header: "Order ID", key: "orderId", width: 15 },
        { header: "Date", key: "date", width: 15 },
        { header: "Customer Name", key: "customerName", width: 20 },
        { header: "Customer Email", key: "customerEmail", width: 25 },
        { header: "Customer Mobile", key: "customerMobile", width: 15 },
        { header: "Payment Method", key: "paymentMethod", width: 15 },
        { header: "Items", key: "items", width: 30 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Original Amount", key: "originalAmount", width: 15 },
        { header: "Discount", key: "discount", width: 15 },
        { header: "Coupon Code", key: "couponCode", width: 15 },
        { header: "Coupon Discount", key: "couponDiscount", width: 15 },
        { header: "Final Amount", key: "finalAmount", width: 15 },
        { header: "Order Status", key: "orderStatus", width: 15 },
      ]
      ordersSheet.getRow(1).font = { bold: true }
      ordersSheet.getRow(1).alignment = { horizontal: "center" }
      orders.forEach((order) => {
        const totalQuantity = order.products.reduce((sum, item) => sum + item.quantity, 0)
        const itemsList = order.products
          .map((item) => {
            const productName = item.product ? item.product.name : "Unknown Product"
            return `${productName} (${item.quantity})`
          })
          .join(", ")
        ordersSheet.addRow({
          orderId: order.orderID,
          date: moment(order.orderDate).format("MMM DD, YYYY"),
          customerName: order.user ? order.user.name : "Unknown",
          customerEmail: order.user ? order.user.email : "Unknown",
          customerMobile: order.user ? order.user.mobile : "Unknown",
          paymentMethod: order.paymentMethod,
          items: itemsList,
          quantity: totalQuantity,
          originalAmount: order.totalAmount,
          discount: order.discount || 0,
          couponCode: order.coupon ? order.coupon.code : "N/A",
          couponDiscount: order.coupon ? order.coupon.discountAmount : 0,
          finalAmount: order.finalAmount,
          orderStatus: order.orderStatus,
        })
      })
      ordersSheet.getColumn("originalAmount").numFmt = "₹#,##0.00"
      ordersSheet.getColumn("discount").numFmt = "₹#,##0.00"
      ordersSheet.getColumn("couponDiscount").numFmt = "₹#,##0.00"
      ordersSheet.getColumn("finalAmount").numFmt = "₹#,##0.00"
      const orderItemsSheet = workbook.addWorksheet("Order Items")
      orderItemsSheet.columns = [
        { header: "Order ID", key: "orderId", width: 15 },
        { header: "Date", key: "date", width: 15 },
        { header: "Customer", key: "customer", width: 20 },
        { header: "Product", key: "product", width: 25 },
        { header: "Category", key: "category", width: 15 },
        { header: "Size", key: "size", width: 10 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Price", key: "price", width: 15 },
        { header: "Sale Price", key: "salePrice", width: 15 },
        { header: "Total", key: "total", width: 15 },
        { header: "Status", key: "status", width: 15 },
      ]

      orderItemsSheet.getRow(1).font = { bold: true }
      orderItemsSheet.getRow(1).alignment = { horizontal: "center" }
      orders.forEach((order) => {
        order.products.forEach((item) => {
          orderItemsSheet.addRow({
            orderId: order.orderID,
            date: moment(order.orderDate).format("MMM DD, YYYY"),
            customer: order.user ? order.user.name : "Unknown",
            product: item.product ? item.product.name : "Unknown Product",
            category: item.product && item.product.categoryId ? item.product.categoryId.name : "Unknown",
            size: item.variant ? item.variant.size : "N/A",
            quantity: item.quantity,
            price: item.variant ? item.variant.varientPrice : 0,
            salePrice: item.variant ? item.variant.salePrice : 0,
            total: (item.variant ? item.variant.salePrice : 0) * item.quantity,
            status: item.status,
          })
        })
      })
      orderItemsSheet.getColumn("price").numFmt = "₹#,##0.00"
      orderItemsSheet.getColumn("salePrice").numFmt = "₹#,##0.00"
      orderItemsSheet.getColumn("total").numFmt = "₹#,##0.00"
      const transactionsSheet = workbook.addWorksheet("Transactions")
      transactionsSheet.columns = [
        { header: "Transaction ID", key: "transactionId", width: 20 },
        { header: "Order ID", key: "orderId", width: 15 },
        { header: "Date", key: "date", width: 15 },
        { header: "Customer", key: "customer", width: 20 },
        { header: "Payment Method", key: "paymentMethod", width: 15 },
        { header: "Amount", key: "amount", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Payment ID", key: "paymentId", width: 25 },
      ]
      transactionsSheet.getRow(1).font = { bold: true }
      transactionsSheet.getRow(1).alignment = { horizontal: "center" }
      transactions.forEach((transaction) => {
        transactionsSheet.addRow({
          transactionId: transaction.transactionId,
          orderId: transaction.order ? transaction.order.orderID : "Unknown",
          date: moment(transaction.createdAt).format("MMM DD, YYYY HH:mm:ss"),
          customer: transaction.user ? transaction.user.name : "Unknown",
          paymentMethod: transaction.paymentMethod,
          amount: transaction.amount,
          status: transaction.status,
          paymentId: transaction.paymentDetails ? transaction.paymentDetails.paymentId : "N/A",
        })
      })
      transactionsSheet.getColumn("amount").numFmt = "₹#,##0.00"
      const paymentMethodsSheet = workbook.addWorksheet("Payment Methods")
      paymentMethodsSheet.columns = [
        { header: "Payment Method", key: "method", width: 20 },
        { header: "Order Count", key: "count", width: 15 },
        { header: "Total Amount", key: "amount", width: 15 },
        { header: "Percentage", key: "percentage", width: 15 },
      ]
      paymentMethodsSheet.getRow(1).font = { bold: true }
      paymentMethodsSheet.getRow(1).alignment = { horizontal: "center" }
      const paymentMethodsBreakdown = {}
      orders.forEach((order) => {
        const method = order.paymentMethod
        if (!paymentMethodsBreakdown[method]) {
          paymentMethodsBreakdown[method] = {
            count: 0,
            amount: 0,
          }
        }
        paymentMethodsBreakdown[method].count += 1
        paymentMethodsBreakdown[method].amount += order.finalAmount
      })
      Object.entries(paymentMethodsBreakdown).forEach(([method, data]) => {
        const percentage = totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0
        paymentMethodsSheet.addRow({
          method,
          count: data.count,
          amount: data.amount,
          percentage: `${percentage.toFixed(2)}%`,
        })
      })
      paymentMethodsSheet.getColumn("amount").numFmt = "₹#,##0.00"
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      res.setHeader("Content-Disposition", `attachment; filename=sales-report-${moment().format("YYYY-MM-DD")}.xlsx`)
      await workbook.xlsx.write(res)
      res.end()
    } catch (error) {
      console.error("Error generating Excel report:", error)
      res.status(500).send("Failed to generate Excel report: " + error.message)
    }
  },
}

module.exports = salesReportController
