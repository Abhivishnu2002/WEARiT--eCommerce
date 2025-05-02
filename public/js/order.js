$(document).ready(() => {
  $(".cancel-btn").on("click", function () {
    const orderId = $(this).data("order-id")
    Swal.fire({
      title: 'Cancel Order',
      text: 'Are you sure you want to cancel this order?',
      icon: 'warning',
      input: 'textarea',
      inputPlaceholder: 'Please provide a reason for cancellation (optional)',
      inputAttributes: {
        'aria-label': 'Cancellation reason'
      },
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, cancel it!',
      cancelButtonText: 'No, keep it'
    }).then((result) => {
      if (result.isConfirmed) {
        const reason = result.value || '';
        
        $.ajax({
          url: `/orders/cancel/${orderId}`,
          type: "POST",
          data: { reason },
          success: (response) => {
            if (response.success) {
              Swal.fire({
                title: 'Cancelled!',
                text: 'Your order has been cancelled successfully.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
              }).then(() => {
                location.reload()
              })
            } else {
              Swal.fire({
                title: 'Error!',
                text: response.message || "Failed to cancel order",
                icon: 'error'
              })
            }
          },
          error: (xhr) => {
            const errorMsg = xhr.responseJSON ? xhr.responseJSON.message : "An error occurred"
            Swal.fire({
              title: 'Error!',
              text: errorMsg,
              icon: 'error'
            })
          }
        })
      }
    })
  })

  $(".return-btn").on("click", function () {
    const orderId = $(this).data("order-id")
    Swal.fire({
      title: 'Return Order',
      text: 'Please provide a reason for returning this order',
      icon: 'info',
      input: 'textarea',
      inputPlaceholder: 'Reason for return',
      inputAttributes: {
        'aria-label': 'Return reason',
        'required': 'true'
      },
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'You need to provide a reason for return!'
        }
      },
      showCancelButton: true,
      confirmButtonColor: '#007bff',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Submit Return'
    }).then((result) => {
      if (result.isConfirmed) {
        const reason = result.value;
        
        $.ajax({
          url: `/orders/return/${orderId}`,
          type: "POST",
          data: { reason },
          success: (response) => {
            if (response.success) {
              Swal.fire({
                title: 'Return Requested!',
                text: 'Your return request has been submitted successfully.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
              }).then(() => {
                location.reload()
              })
            } else {
              Swal.fire({
                title: 'Error!',
                text: response.message || "Failed to submit return request",
                icon: 'error'
              })
            }
          },
          error: (xhr) => {
            const errorMsg = xhr.responseJSON ? xhr.responseJSON.message : "An error occurred"
            Swal.fire({
              title: 'Error!',
              text: errorMsg,
              icon: 'error'
            })
          }
        })
      }
    })
  })

  $(".reorder-btn").on("click", function () {
    const orderId = $(this).data("order-id")
    Swal.fire({
      title: 'Reorder Items',
      text: 'Do you want to add these items to your cart?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, add to cart!'
    }).then((result) => {
      if (result.isConfirmed) {
        $.ajax({
          url: `/orders/reorder/${orderId}`,
          type: "POST",
          success: (response) => {
            if (response.success) {
              Swal.fire({
                title: 'Added to Cart!',
                text: 'Items added to cart successfully.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
              }).then(() => {
                window.location.href = "/cart"
              })
            } else {
              Swal.fire({
                title: 'Error!',
                text: response.message || "Failed to add items to cart",
                icon: 'error'
              })
            }
          },
          error: (xhr) => {
            const errorMsg = xhr.responseJSON ? xhr.responseJSON.message : "An error occurred"
            Swal.fire({
              title: 'Error!',
              text: errorMsg,
              icon: 'error'
            })
          }
        })
      }
    })
  })
})