document.addEventListener("DOMContentLoaded", () => {
  const returnOrderBtn = document.querySelector('.return-order-btn');
  if (returnOrderBtn) {
    returnOrderBtn.addEventListener('click', function() {
      const orderId = this.getAttribute('data-order-id');
      
      Swal.fire({
        title: 'Return Order',
        text: 'Please provide a reason for returning this order',
        input: 'textarea',
        inputPlaceholder: 'Enter your reason here...',
        inputAttributes: {
          required: 'true'
        },
        showCancelButton: true,
        confirmButtonText: 'Submit Return Request',
        cancelButtonText: 'Cancel',
        showLoaderOnConfirm: true,
        preConfirm: (reason) => {
          if (!reason) {
            Swal.showValidationMessage('Please enter a reason for return');
            return false;
          }
          
          return fetch(`/orders/return/${orderId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
          })
          .then(response => response.json())
          .then(data => {
            if (!data.success) {
              throw new Error(data.message || 'Failed to process return request');
            }
            return data;
          })
          .catch(error => {
            Swal.showValidationMessage(`Request failed: ${error.message}`);
          });
        },
        allowOutsideClick: () => !Swal.isLoading()
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: 'Success!',
            text: 'Your return request has been submitted successfully',
            icon: 'success'
          }).then(() => {
            window.location.reload();
          });
        }
      });
    });
  }
  const cancelOrderBtn = document.querySelector(".cancel-order-btn")
  if (cancelOrderBtn) {
    cancelOrderBtn.addEventListener("click", function () {
      const orderId = this.getAttribute("data-order-id")

      Swal.fire({
        title: "Cancel Order",
        text: "Are you sure you want to cancel this order?",
        icon: "warning",
        input: "textarea",
        inputLabel: "Reason for cancellation (optional)",
        inputPlaceholder: "Please provide a reason for cancellation",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, cancel it!",
        cancelButtonText: "No, keep it",
      }).then((result) => {
        if (result.isConfirmed) {
          const reason = result.value || ""

          fetch(`/orders/cancel/${orderId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reason }),
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.success) {
                Swal.fire("Cancelled!", "Your order has been cancelled.", "success").then(() => {
                  window.location.reload()
                })
              } else {
                Swal.fire("Error!", data.message || "Failed to cancel order.", "error")
              }
            })
            .catch((error) => {
              console.error("Error:", error)
              Swal.fire("Error!", "Something went wrong. Please try again.", "error")
            })
        }
      })
    })
  }

  const timelineItems = document.querySelectorAll(".timeline-item")
  if (timelineItems.length > 0) {
    timelineItems.forEach((item) => {
      item.style.opacity = "0"
      item.style.transform = "translateY(20px)"
      item.style.transition = "opacity 0.5s ease, transform 0.5s ease"
    })

    setTimeout(() => {
      timelineItems.forEach((item, index) => {
        setTimeout(() => {
          item.style.opacity = "1"
          item.style.transform = "translateY(0)"
        }, index * 150)
      })
    }, 300)
  }
})
