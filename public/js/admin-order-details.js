document.addEventListener("DOMContentLoaded", () => {
  const updateStatusBtns = document.querySelectorAll(".update-status-btn")
  if (updateStatusBtns.length > 0) {
    updateStatusBtns.forEach((btn) => {
      btn.addEventListener("click", function () {
        const orderId = this.dataset.orderId
        const productId = this.dataset.productId || ""
        const currentStatus = this.dataset.currentStatus

        Swal.fire({
          title: "Update Status",
          html: `
                        <div class="mb-3">
                            <select id="statusSelect" class="form-select">
                                <option value="pending" ${currentStatus === "pending" ? "selected" : ""}>Pending</option>
                                <option value="shipped" ${currentStatus === "shipped" ? "selected" : ""}>Shipped</option>
                                <option value="out for delivery" ${currentStatus === "out for delivery" ? "selected" : ""}>Out for Delivery</option>
                                <option value="delivered" ${currentStatus === "delivered" ? "selected" : ""}>Delivered</option>
                                <option value="cancelled" ${currentStatus === "cancelled" ? "selected" : ""}>Cancelled</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <textarea id="statusNote" class="form-control" placeholder="Add a note (optional)" rows="3"></textarea>
                        </div>
                    `,
          showCancelButton: true,
          confirmButtonText: "Update",
          cancelButtonText: "Cancel",
          confirmButtonColor: "#0d6efd",
          cancelButtonColor: "#6c757d",
          preConfirm: () => {
            const status = document.getElementById("statusSelect").value
            const note = document.getElementById("statusNote").value
            return { status, note }
          },
        }).then((result) => {
          if (result.isConfirmed) {
            const { status, note } = result.value

            Swal.fire({
              title: "Updating...",
              text: "Please wait while we update the status",
              allowOutsideClick: false,
              didOpen: () => {
                Swal.showLoading()
              },
            })

            fetch(`/admin/orders/update-status/${orderId}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                status,
                note,
                productId,
              }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.success) {
                  Swal.fire({
                    icon: "success",
                    title: "Success",
                    text: data.message || "Status updated successfully",
                    confirmButtonColor: "#0d6efd",
                  }).then(() => {
                    window.location.reload()
                  })
                } else {
                  Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: data.message || "Failed to update status",
                    confirmButtonColor: "#0d6efd",
                  })
                }
              })
              .catch((error) => {
                console.error("Error:", error)
                Swal.fire({
                  icon: "error",
                  title: "Error",
                  text: "An error occurred. Please try again.",
                  confirmButtonColor: "#0d6efd",
                })
              })
          }
        })
      })
    })
  }
  const processReturnBtns = document.querySelectorAll(".process-return-btn")
  if (processReturnBtns.length > 0) {
    processReturnBtns.forEach((btn) => {
      btn.addEventListener("click", function () {
        const orderId = this.dataset.orderId
        const productId = this.dataset.productId
        const productName = this.dataset.productName

        Swal.fire({
          title: "Process Return Request",
          html: `
                        <p class="mb-3">Product: <strong>${productName}</strong></p>
                        <div class="mb-3">
                            <select id="returnAction" class="form-select">
                                <option value="approve">Approve Return</option>
                                <option value="reject">Reject Return</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <textarea id="returnReason" class="form-control" placeholder="Add a note (optional)" rows="3"></textarea>
                        </div>
                    `,
          showCancelButton: true,
          confirmButtonText: "Process",
          cancelButtonText: "Cancel",
          confirmButtonColor: "#0d6efd",
          cancelButtonColor: "#6c757d",
          preConfirm: () => {
            const action = document.getElementById("returnAction").value
            const reason = document.getElementById("returnReason").value
            return { action, reason }
          },
        }).then((result) => {
          if (result.isConfirmed) {
            const { action, reason } = result.value

            Swal.fire({
              title: "Processing...",
              text: "Please wait while we process the return request",
              allowOutsideClick: false,
              didOpen: () => {
                Swal.showLoading()
              },
            })

            fetch("/admin/orders/process-return", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                orderId,
                productId,
                action,
                reason,
              }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.success) {
                  Swal.fire({
                    icon: "success",
                    title: "Success",
                    text: data.message,
                    confirmButtonColor: "#0d6efd",
                  }).then(() => {
                    window.location.reload()
                  })
                } else {
                  Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: data.message || "Failed to process return request",
                    confirmButtonColor: "#0d6efd",
                  })
                }
              })
              .catch((error) => {
                console.error("Error:", error)
                Swal.fire({
                  icon: "error",
                  title: "Error",
                  text: "An error occurred. Please try again.",
                  confirmButtonColor: "#0d6efd",
                })
              })
          }
        })
      })
    })
  }
  const cancelOrderBtn = document.querySelector(".cancel-order-btn")
  if (cancelOrderBtn) {
    cancelOrderBtn.addEventListener("click", function () {
      const orderId = this.dataset.orderId

      Swal.fire({
        title: "Cancel Order",
        text: "Are you sure you want to cancel this order?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, cancel it",
        cancelButtonText: "No, keep it",
        confirmButtonColor: "#dc3545",
        cancelButtonColor: "#6c757d",
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: "Cancelling...",
            text: "Please wait while we cancel the order",
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading()
            },
          })

          fetch(`/admin/orders/update-status/${orderId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "cancelled",
              note: "Cancelled by admin",
            }),
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.success) {
                Swal.fire({
                  icon: "success",
                  title: "Success",
                  text: "Order cancelled successfully",
                  confirmButtonColor: "#0d6efd",
                }).then(() => {
                  window.location.reload()
                })
              } else {
                Swal.fire({
                  icon: "error",
                  title: "Error",
                  text: data.message || "Failed to cancel order",
                  confirmButtonColor: "#0d6efd",
                })
              }
            })
            .catch((error) => {
              console.error("Error:", error)
              Swal.fire({
                icon: "error",
                title: "Error",
                text: "An error occurred. Please try again.",
                confirmButtonColor: "#0d6efd",
              })
            })
        }
      })
    })
  }
})
