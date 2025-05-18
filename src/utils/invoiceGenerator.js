const PDFDocument = require("pdfkit")

const generateInvoice = async (options) => {
  const { order, user, res, isAdmin = false } = options
  const doc = new PDFDocument({
    margin: 40,
    size: "A4",
    bufferPages: true,
  })
  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", `attachment; filename=invoice-${order.orderID}.pdf`)
  doc.pipe(res)
  const colors = {
    primary: "#000000",
    secondary: "#555555",
    accent: "#0066cc",
    light: "#f2f2f2",
    border: "#cccccc",
    highlight: "#f9f9f9",
  }

  const taxRate = 0.18 
  let subtotal = 0
  let totalTax = 0
  let totalAmount = 0

  order.products.forEach((item) => {
    const itemPrice = item.variant.salePrice
    const itemTotal = itemPrice * item.quantity
    const preTaxPrice = itemPrice / (1 + taxRate)
    const preTaxTotal = preTaxPrice * item.quantity
    const itemTax = itemTotal - preTaxTotal

    subtotal += preTaxTotal
    totalTax += itemTax
    totalAmount += itemTotal
  })

  const shippingCost = subtotal > 2000 ? 0 : 50
  const discount = order.discount || 0
  const finalAmount = order.finalAmount || totalAmount + shippingCost - discount
  doc.fontSize(20).font("Helvetica-Bold").fillColor(colors.primary).text("INVOICE", { align: "center" })
  doc.moveDown(0.25)
  doc
    .moveTo(40, doc.y)
    .lineTo(doc.page.width - 40, doc.y)
    .strokeColor(colors.accent)
    .stroke()
  doc.moveDown(0.5)
  const startY = doc.y
  doc.font("Helvetica-Bold").fontSize(12).fillColor(colors.primary).text("WEARiT", 40, startY)
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(colors.secondary)
    .text("123 Fashion Street", 40, doc.y + 2)
    .text("Fashion City, FC 12345", 40, doc.y + 2)
    .text("Phone: +91 9876543210", 40, doc.y + 2)
    .text("Email: support@wearit.com", 40, doc.y + 2)
    .text("GSTIN: 29AABCW1234R1Z5", 40, doc.y + 2)
  const rightColumnX = doc.page.width / 2 + 20
  doc.font("Helvetica-Bold").fontSize(10).fillColor(colors.primary).text("Invoice No:", rightColumnX, startY)
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(colors.secondary)
    .text(order.orderID, rightColumnX + 80, startY)

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(colors.primary)
    .text("Invoice Date:", rightColumnX, startY + 15)
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(colors.secondary)
    .text(
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      rightColumnX + 80,
      startY + 15,
    )

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(colors.primary)
    .text("Order Date:", rightColumnX, startY + 30)
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(colors.secondary)
    .text(
      new Date(order.orderDate || order.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      rightColumnX + 80,
      startY + 30,
    )

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(colors.primary)
    .text("Payment Method:", rightColumnX, startY + 45)
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(colors.secondary)
    .text(order.paymentMethod || order.paymentMentod || "N/A", rightColumnX + 80, startY + 45)
  doc.y = Math.max(doc.y, startY + 70)
  doc
    .moveTo(40, doc.y)
    .lineTo(doc.page.width - 40, doc.y)
    .strokeColor(colors.border)
    .stroke()
  doc.moveDown(0.5)
  doc.font("Helvetica-Bold").fontSize(12).fillColor(colors.primary).text("Bill To", 40, doc.y)
  doc.moveDown(0.25)

  const customerUser = isAdmin ? order.user : user
  const address = order.address

  if (address) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(colors.secondary)
      .text(`${customerUser.name}`, 40, doc.y)
      .text(`${address.address || address.addressLine1 || ""}`, 40, doc.y + 2)

    if (address.addressLine2) {
      doc.text(`${address.addressLine2}`, 40, doc.y + 2)
    }

    doc
      .text(`${address.city}, ${address.state} - ${address.pincode || address.zipCode || ""}`, 40, doc.y + 2)
      .text(`Phone: ${address.mobile || address.phone || customerUser.mobile || "N/A"}`, 40, doc.y + 2)
      .text(`Email: ${customerUser.email}`, 40, doc.y + 2)
  } else {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(colors.secondary)
      .text(`${customerUser.name}`, 40, doc.y)
      .text(`Email: ${customerUser.email}`, 40, doc.y + 2)
  }

  doc.moveDown(1)
  const tableTop = doc.y
  const tableHeaders = ["Sl.", "Description", "Size", "Qty", "Rate (₹)", "Amount (₹)"]
  const tableWidth = doc.page.width - 80 // 40px margin on each side
  const columnWidths = [30, tableWidth - 270, 50, 40, 70, 80]
  doc.rect(40, tableTop, tableWidth, 18).fill(colors.light)
  doc.font("Helvetica-Bold").fontSize(9).fillColor(colors.primary)
  let xPosition = 40
  tableHeaders.forEach((header, i) => {
    const textOptions = { width: columnWidths[i], align: i > 2 ? "right" : "left" }
    doc.text(header, xPosition + 5, tableTop + 5, textOptions)
    xPosition += columnWidths[i]
  })
  let y = tableTop + 18
  const maxProductsToShow = Math.min(order.products.length, 10)
  const productsToShow = order.products.slice(0, maxProductsToShow)

  doc.font("Helvetica").fontSize(8).fillColor(colors.secondary)
  productsToShow.forEach((item, index) => {
    const product = item.product
    const variant = item.variant
    const itemPrice = variant.salePrice
    const itemTotal = itemPrice * item.quantity
    const preTaxPrice = (itemPrice / (1 + taxRate)).toFixed(2)
    if (index % 2 === 1) {
      doc.rect(40, y, tableWidth, 16).fill(colors.highlight)
    }
    xPosition = 40
    doc.text((index + 1).toString(), xPosition + 5, y + 4)

    xPosition += columnWidths[0]
    doc.text(product.name, xPosition + 5, y + 4, { width: columnWidths[1] - 10, ellipsis: true })

    xPosition += columnWidths[1]
    doc.text(variant.size, xPosition + 5, y + 4)

    xPosition += columnWidths[2]
    doc.text(item.quantity.toString(), xPosition + 5, y + 4, { align: "right", width: columnWidths[3] - 10 })

    xPosition += columnWidths[3]
    doc.text(preTaxPrice, xPosition + 5, y + 4, { align: "right", width: columnWidths[4] - 10 })

    xPosition += columnWidths[4]
    doc.text((preTaxPrice * item.quantity).toFixed(2), xPosition + 5, y + 4, {
      align: "right",
      width: columnWidths[5] - 10,
    })

    y += 16
  })
  if (order.products.length > maxProductsToShow) {
    doc.rect(40, y, tableWidth, 16).fill(colors.highlight)
    doc.text(`... and ${order.products.length - maxProductsToShow} more item(s)`, 45, y + 4)
    y += 16
  }
  doc
    .moveTo(40, y)
    .lineTo(40 + tableWidth, y)
    .strokeColor(colors.border)
    .stroke()
  y += 15
  const summaryX = doc.page.width - 200
  const valueX = doc.page.width - 60

  doc.font("Helvetica").fontSize(9).fillColor(colors.secondary)
  doc.text("Subtotal:", summaryX, y, { align: "right" })
  doc.text(`₹${subtotal.toFixed(2)}`, valueX, y, { align: "right" })

  y += 15
  doc.text("GST (18%):", summaryX, y, { align: "right" })
  doc.text(`₹${totalTax.toFixed(2)}`, valueX, y, { align: "right" })

  y += 15
  doc.text("Shipping:", summaryX, y, { align: "right" })
  doc.text(`₹${shippingCost.toFixed(2)}`, valueX, y, { align: "right" })

  if (discount > 0) {
    y += 15
    doc.text("Discount:", summaryX, y, { align: "right" })
    doc.text(`-₹${discount.toFixed(2)}`, valueX, y, { align: "right" })
  }
  y += 20
  doc
    .moveTo(summaryX - 50, y - 5)
    .lineTo(valueX + 20, y - 5)
    .strokeColor(colors.border)
    .stroke()
  doc.font("Helvetica-Bold").fontSize(10).fillColor(colors.primary)
  doc.text("Total Amount:", summaryX, y, { align: "right" })
  doc.text(`₹${finalAmount.toFixed(2)}`, valueX, y, { align: "right" })
  y += 30
  const leftColX = 40
  const rightColX = doc.page.width / 2 + 20
  doc.font("Helvetica-Bold").fontSize(10).fillColor(colors.primary).text("Payment Information", leftColX, y)
  doc.moveDown(0.25)
  doc.font("Helvetica").fontSize(8).fillColor(colors.secondary)

  if (order.paymentMethod === "COD" || order.paymentMentod === "COD") {
    doc.text("Payment Method: Cash on Delivery", leftColX, doc.y)
    doc.text("Status: Payment pending", leftColX, doc.y + 2)
  } else {
    doc.text("Payment Method: Online Payment", leftColX, doc.y)
    doc.text("Status: Paid", leftColX, doc.y + 2)
  }
  doc.font("Helvetica-Bold").fontSize(10).fillColor(colors.primary).text("Terms & Conditions", rightColX, y)
  doc.moveDown(0.25)
  doc.font("Helvetica").fontSize(8).fillColor(colors.secondary)
  doc.text("1. Returns accepted within 7 days of delivery.", rightColX, doc.y)
  doc.text("2. Damaged items must be reported within 48 hours.", rightColX, doc.y + 2)
  doc.text("3. For queries, contact our customer support.", rightColX, doc.y + 2)
  const pageHeight = doc.page.height - doc.page.margins.bottom
  doc
    .moveTo(40, pageHeight - 40)
    .lineTo(doc.page.width - 40, pageHeight - 40)
    .strokeColor(colors.border)
    .stroke()
  doc.font("Helvetica").fontSize(8).fillColor(colors.secondary)
  doc.text("Thank you for shopping with WEARiT!", 40, pageHeight - 30, { align: "center" })
  doc.text("This is a computer-generated invoice and does not require a physical signature.", 40, pageHeight - 20, {
    align: "center",
  })
  doc.end()
}

module.exports = { generateInvoice }
