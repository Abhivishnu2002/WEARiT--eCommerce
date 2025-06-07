const PDFDocument = require("pdfkit")
const PriceCalculator = require("./priceCalculator")

const generateInvoice = async (options) => {
  const { order, user, res, isAdmin = false } = options
  const doc = new PDFDocument({
    margin: 40,
    size: "A4",
    bufferPages: true,
    info: {
      Title: `Invoice ${order.orderID}`,
      Author: "WEARiT",
      Subject: "Order Invoice",
      Creator: "WEARiT Invoice System",
    },
  })
  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", `attachment; filename=invoice-${order.orderID}.pdf`)
  doc.pipe(res)
  const colors = {
    primary: "#1a1a1a",
    secondary: "#4a4a4a",
    accent: "#2563eb",
    success: "#059669",
    warning: "#d97706",
    light: "#f8fafc",
    border: "#e2e8f0",
    highlight: "#f1f5f9",
    text: "#374151",
  }
  const validProducts = order.products.filter((item) => item.status !== "cancelled" && item.status !== "returned")
  const invoiceTotals = PriceCalculator.calculateInvoiceTotals(order, validProducts)
  drawHeader(doc, colors, order)
  drawCompanyInfo(doc, colors)
  drawInvoiceDetails(doc, colors, order)
  drawCustomerInfo(doc, colors, order, user, isAdmin)
  drawProductsTable(doc, colors, validProducts, invoiceTotals)
  drawTotalsSection(doc, colors, invoiceTotals, order)
  drawPaymentInfo(doc, colors, order)
  drawTermsAndConditions(doc, colors)
  drawFooter(doc, colors)

  doc.end()
}
function drawHeader(doc, colors, order) {
  doc.fontSize(24).font("Helvetica-Bold").fillColor(colors.primary).text("INVOICE", { align: "center" })

  doc.moveDown(0.3)
  doc
    .moveTo(40, doc.y)
    .lineTo(doc.page.width - 40, doc.y)
    .strokeColor(colors.accent)
    .lineWidth(2)
    .stroke()

  doc.moveDown(0.8)
}

function drawCompanyInfo(doc, colors) {
  const startY = doc.y
  doc.font("Helvetica-Bold").fontSize(14).fillColor(colors.primary).text("WEARiT", 40, startY)

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(colors.secondary)
    .text("Premium Fashion Store", 40, doc.y + 5)
    .text("123 Fashion Street, Style District", 40, doc.y + 3)
    .text("Fashion City, FC 12345", 40, doc.y + 3)
    .text("Phone: +91 9876543210", 40, doc.y + 3)
    .text("Email: support@wearit.com", 40, doc.y + 3)
    .text("GSTIN: 29AABCW1234R1Z5", 40, doc.y + 3)
}

function drawInvoiceDetails(doc, colors, order) {
  const rightColumnX = doc.page.width - 200
  const labelWidth = 80
  const startY = doc.y - 120
  const details = [
    { label: "Invoice No:", value: order.orderID },
    {
      label: "Invoice Date:",
      value: new Date().toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    },
    {
      label: "Order Date:",
      value: new Date(order.orderDate || order.createdAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    },
    { label: "Payment Method:", value: (order.paymentMethod || order.paymentMentod || "COD").toUpperCase() },
    { label: "Order Status:", value: order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1) },
  ]

  details.forEach((detail, index) => {
    const y = startY + index * 18

    doc.font("Helvetica-Bold").fontSize(10).fillColor(colors.primary).text(detail.label, rightColumnX, y)

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(colors.text)
      .text(detail.value, rightColumnX + labelWidth, y)
  })

  doc.y = Math.max(doc.y, startY + details.length * 18 + 20)
}

function drawCustomerInfo(doc, colors, order, user, isAdmin) {
  doc
    .moveTo(40, doc.y)
    .lineTo(doc.page.width - 40, doc.y)
    .strokeColor(colors.border)
    .lineWidth(1)
    .stroke()

  doc.moveDown(0.8)
  doc.font("Helvetica-Bold").fontSize(12).fillColor(colors.primary).text("BILL TO", 40, doc.y)

  doc.moveDown(0.4)

  const customerUser = isAdmin ? order.user : user
  const address = order.address

  if (address) {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(colors.text)
      .text(customerUser?.name ?? "Unknown user", 40, doc.y)
      .text(address.address || address.addressLine1 || "", 40, doc.y + 3)

    if (address.addressLine2) {
      doc.text(address.addressLine2, 40, doc.y + 3)
    }

    doc
      .text(`${address.city}, ${address.state} - ${address.pincode || address.zipCode || ""}`, 40, doc.y + 3)
      .text(`Phone: ${address.mobile || address.phone || customerUser.mobile || "N/A"}`, 40, doc.y + 3)
      .text(`Email: ${customerUser?.email ?? "N/A"}`, 40, doc.y + 3)
  } else {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(colors.text)
      .text(customerUser.name, 40, doc.y)
      .text(`Email: ${customerUser?.email ?? "N/A"}`, 40, doc.y + 3)
      .text(`Phone: ${customerUser.mobile || "N/A"}`, 40, doc.y + 3)
  }

  doc.moveDown(1.2)
}

function drawProductsTable(doc, colors, validProducts, totals) {
  const tableTop = doc.y
  const tableWidth = doc.page.width - 80
  const tableHeaders = ["#", "Product Details", "Size", "Qty", "Unit Price", "Total"]
  const columnWidths = [30, tableWidth - 280, 50, 40, 80, 80]
  doc.rect(40, tableTop, tableWidth, 25).fill(colors.accent)
  doc.font("Helvetica-Bold").fontSize(10).fillColor("white")
  let xPosition = 40
  tableHeaders.forEach((header, i) => {
    const textOptions = {
      width: columnWidths[i] - 10,
      align: i > 2 ? "center" : "left",
    }
    doc.text(header, xPosition + 5, tableTop + 8, textOptions)
    xPosition += columnWidths[i]
  })
  let y = tableTop + 25
  doc.font("Helvetica").fontSize(9).fillColor(colors.text)
  validProducts.forEach((item, index) => {
    const product = item.product
    const variant = item.variant
    const unitPrice = variant.salePrice
    const totalPrice = unitPrice * item.quantity
    if (index % 2 === 1) {
      doc.rect(40, y, tableWidth, 20).fill(colors.highlight)
    }
    xPosition = 40
    doc.fillColor(colors.text).text((index + 1).toString(), xPosition + 5, y + 6, {
      width: columnWidths[0] - 10,
      align: "center",
    })
    xPosition += columnWidths[0]
    let productName = product.name
    if (item.status && item.status !== "pending") {
      productName += ` [${item.status.toUpperCase()}]`
    }

    doc.text(productName, xPosition + 5, y + 6, {
      width: columnWidths[1] - 10,
      ellipsis: true,
    })
    xPosition += columnWidths[1]
    doc.text(variant.size, xPosition + 5, y + 6, {
      width: columnWidths[2] - 10,
      align: "center",
    })
    xPosition += columnWidths[2]
    doc.text(item.quantity.toString(), xPosition + 5, y + 6, {
      width: columnWidths[3] - 10,
      align: "center",
    })
    xPosition += columnWidths[3]
    doc.text(`₹${unitPrice.toFixed(2)}`, xPosition + 5, y + 6, {
      width: columnWidths[4] - 10,
      align: "right",
    })
    xPosition += columnWidths[4]
    doc.text(`₹${totalPrice.toFixed(2)}`, xPosition + 5, y + 6, {
      width: columnWidths[5] - 10,
      align: "right",
    })

    y += 20
  })
  doc
    .moveTo(40, y)
    .lineTo(40 + tableWidth, y)
    .strokeColor(colors.border)
    .lineWidth(1)
    .stroke()

  doc.y = y + 20
}

function drawTotalsSection(doc, colors, totals, order) {
  const summaryX = doc.page.width - 220
  const labelX = summaryX + 20
  const valueX = doc.page.width - 80
  doc
    .rect(summaryX, doc.y - 10, 200, 120)
    .fill(colors.light)
    .stroke()

  let y = doc.y
  const totalsData = [
    { label: "Subtotal:", value: `₹${totals.subtotal.toFixed(2)}`, bold: false },
    { label: "Product Discount:", value: `-₹${totals.productDiscount.toFixed(2)}`, bold: false },
    { label: "Shipping Charge:", value: `₹${totals.shippingCharge.toFixed(2)}`, bold: false },
  ]
  if (totals.couponDiscount > 0) {
    totalsData.push({
      label: "Coupon Discount:",
      value: `-₹${totals.couponDiscount.toFixed(2)}`,
      bold: false,
    })
  }
  totalsData.forEach((item, index) => {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(colors.secondary)
      .text(item.label, labelX, y, { align: "left" })
      .text(item.value, valueX - 60, y, { align: "right", width: 60 })
    y += 18
  })

  doc
    .moveTo(labelX, y - 5)
    .lineTo(valueX, y - 5)
    .strokeColor(colors.border)
    .lineWidth(1)
    .stroke()

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(colors.primary)
    .text("TOTAL AMOUNT:", labelX, y + 5, { align: "left" })
    .text(`₹${totals.finalAmount.toFixed(2)}`, valueX - 60, y + 5, {
      align: "right",
      width: 100,
    })

  doc.y = y + 40
}

function drawPaymentInfo(doc, colors, order) {
  const leftColX = 40
  const rightColX = doc.page.width / 2 + 20
  const startY = doc.y + 20

  doc.font("Helvetica-Bold").fontSize(11).fillColor(colors.primary).text("PAYMENT INFORMATION", leftColX, startY)

  doc.moveDown(0.4)
  doc.font("Helvetica").fontSize(9).fillColor(colors.text)

  const paymentMethod = order.paymentMethod || order.paymentMentod || "COD"
  const paymentStatus = order.paymentStatus || "pending"

  if (paymentMethod.toUpperCase() === "COD") {
    doc
      .text("• Payment Method: Cash on Delivery", leftColX, doc.y)
      .text("• Status: Payment due on delivery", leftColX, doc.y + 3)
      .text("• Please keep exact change ready", leftColX, doc.y + 3)
  } else {
    doc
      .text(`• Payment Method: ${paymentMethod.toUpperCase()}`, leftColX, doc.y)
      .text(`• Status: ${paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}`, leftColX, doc.y + 3)

    if (order.paymentDetails?.transactionId) {
      doc.text(`• Transaction ID: ${order.paymentDetails.transactionId}`, leftColX, doc.y + 3)
    }
  }
}

function drawTermsAndConditions(doc, colors) {
  const rightColX = doc.page.width / 2 + 20
  const startY = doc.y - 60

  doc.font("Helvetica-Bold").fontSize(11).fillColor(colors.primary).text("TERMS & CONDITIONS", rightColX, startY)

  doc.moveDown(0.4)
  doc.font("Helvetica").fontSize(9).fillColor(colors.text)

  const terms = [
    "• Returns accepted within 7 days of delivery",
    "• Items must be in original condition with tags",
    "• Damaged items must be reported within 48 hours",
    "• Refunds processed within 5-7 business days",
    "• For support: support@wearit.com",
  ]

  let y = startY + 15
  terms.forEach((term) => {
    doc.text(term, rightColX, y)
    y += 12
  })

  doc.y = Math.max(doc.y, y + 20)
}

function drawFooter(doc, colors) {
  const pageHeight = doc.page.height - doc.page.margins.bottom
  doc
    .moveTo(40, pageHeight - 50)
    .lineTo(doc.page.width - 40, pageHeight - 50)
    .strokeColor(colors.border)
    .lineWidth(1)
    .stroke()
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(colors.accent)
    .text("Thank you for shopping with WEARiT!", 40, pageHeight - 35, {
      align: "center",
    })
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(colors.secondary)
    .text("This is a computer-generated invoice and does not require a physical signature.", 40, pageHeight - 20, {
      align: "center",
    })
}

module.exports = { generateInvoice }
