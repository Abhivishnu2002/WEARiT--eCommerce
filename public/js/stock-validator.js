window.stockValidator = {
  async validateStock() {
    try {
      const response = await fetch("/cart/check-stock", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || "Failed to validate stock")
      }

      if (data.hasStockIssues && data.stockIssues.length > 0) {
        let stockIssueMessage = '<div class="stock-issues">'
        stockIssueMessage += "<p>The following items in your cart have stock issues:</p>"
        stockIssueMessage += "<ul>"

        data.stockIssues.forEach((issue) => {
          if (issue.availableStock === 0) {
            stockIssueMessage += `<li><strong>${issue.productName}</strong> (Size: ${issue.size}) is out of stock</li>`
          } else if (issue.isPartialStock) {
            stockIssueMessage += `<li><strong>${issue.productName}</strong> (Size: ${issue.size}) - Only ${issue.availableStock} available (you requested ${issue.requestedQuantity})</li>`
          }
        })

        stockIssueMessage += "</ul>"
        stockIssueMessage += "<p>Please update your cart before proceeding.</p>"
        stockIssueMessage += "</div>"

        const Swal = window.Swal
        await Swal.fire({
          title: "Stock Issues Detected",
          html: stockIssueMessage,
          icon: "error",
          confirmButtonText: "Update Cart",
          confirmButtonColor: "#3085d6",
        })

        return false
      }

      return true
    } catch (error) {
      console.error("Stock validation error:", error)
      const Swal = window.Swal
      await Swal.fire({
        title: "Error",
        text: error.message || "Failed to validate stock",
        icon: "error",
        confirmButtonText: "OK",
      })
      return false
    }
  },

  async validateBeforeCheckout() {
    return this.validateStock()
  },

  async validateBeforePayment() {
    return this.validateStock()
  },

  async validateBeforePlaceOrder() {
    return this.validateStock()
  },
}
