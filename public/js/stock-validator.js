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
      if (data.hasUnavailableProducts && data.unavailableProducts.length > 0) {
        let unavailableMessage = '<div class="unavailable-products">'
        unavailableMessage += '<p><strong>The following products are no longer available:</strong></p>'
        unavailableMessage += '<ul style="text-align: left; margin: 10px 0;">'

        data.unavailableProducts.forEach(item => {
          unavailableMessage += `<li><strong>${item.productName}</strong> (Size: ${item.size}) - ${item.reason}</li>`
        })

        unavailableMessage += '</ul>'
        unavailableMessage += '<p>Please remove these items from your cart to continue.</p>'
        unavailableMessage += '</div>'

        const Swal = window.Swal
        const result = await Swal.fire({
          title: 'Products Unavailable',
          html: unavailableMessage,
          icon: 'error',
          showCancelButton: true,
          confirmButtonText: 'Go to Cart',
          cancelButtonText: 'Stay Here',
          confirmButtonColor: '#1a1a1a',
          cancelButtonColor: '#6c757d'
        })

        if (result.isConfirmed) {
          window.location.href = '/cart'
        }

        return false
      }

      if (data.hasStockIssues && data.stockIssues.length > 0) {
        let stockIssueMessage = '<div class="stock-issues">'
        stockIssueMessage += "<p><strong>Stock issues detected:</strong></p>"
        stockIssueMessage += '<ul style="text-align: left; margin: 10px 0;">'

        data.stockIssues.forEach((issue) => {
          if (issue.availableStock === 0) {
            stockIssueMessage += `<li><strong>${issue.productName}</strong> (Size: ${issue.size}) is <span style="color: #dc3545;">out of stock</span></li>`
          } else if (issue.isPartialStock) {
            stockIssueMessage += `<li><strong>${issue.productName}</strong> (Size: ${issue.size}) - Only ${issue.availableStock} available (you requested ${issue.requestedQuantity})</li>`
          }
        })

        stockIssueMessage += "</ul>"
        stockIssueMessage += "<p>Please update quantities or remove out-of-stock items to continue.</p>"
        stockIssueMessage += "</div>"

        const Swal = window.Swal
        const result = await Swal.fire({
          title: "Stock Issues Detected",
          html: stockIssueMessage,
          icon: "error",
          showCancelButton: true,
          confirmButtonText: "Go to Cart",
          cancelButtonText: "Stay Here",
          confirmButtonColor: "#1a1a1a",
          cancelButtonColor: "#6c757d",
        })

        if (result.isConfirmed) {
          window.location.href = '/cart'
        }

        return false
      }

      return true
    } catch (error) {
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
