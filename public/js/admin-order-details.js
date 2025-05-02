document.addEventListener("DOMContentLoaded", function () {
    const statusDropdownBtn = document.querySelector('.status-dropdown-btn');
    if (statusDropdownBtn) {
        statusDropdownBtn.addEventListener('click', function() {
            const orderId = document.querySelector('.cancel-order-btn').dataset.orderId;
            
            Swal.fire({
                title: 'Update Order Status',
                html: `
                    <select id="orderStatus" class="swal2-input">
                        <option value="Processing">Processing</option>
                        <option value="Packed">Packed</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                `,
                showCancelButton: true,
                confirmButtonText: 'Update',
                cancelButtonText: 'Cancel',
                preConfirm: () => {
                    const status = document.getElementById('orderStatus').value;
                    return { status };
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    const { status } = result.value;
                    
                    Swal.fire({
                        title: 'Updating...',
                        text: 'Please wait while we update the order status',
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });
                    
                    fetch(`/admin/orders/update-status/${orderId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ status })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Success',
                                text: 'Order status updated successfully',
                                confirmButtonText: 'OK'
                            }).then(() => {
                                window.location.reload();
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: data.message || 'Failed to update order status',
                                confirmButtonText: 'OK'
                            });
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'An error occurred. Please try again.',
                            confirmButtonText: 'OK'
                        });
                    });
                }
            });
        });
    }

const invoiceBtn = document.querySelector('.invoice-btn');
    if (invoiceBtn) {
        invoiceBtn.addEventListener('click', function() {
            const orderId = document.querySelector('.cancel-order-btn').dataset.orderId;
            window.location.href = `/admin/orders/${orderId}/invoice`;
        });
    }

    const processReturnBtns = document.querySelectorAll('.process-return-btn');
    if (processReturnBtns.length > 0) {
      processReturnBtns.forEach(btn => {
        btn.addEventListener('click', function() {
          const orderId = this.dataset.orderId;
          const productId = this.dataset.productId;
          const productName = this.dataset.productName;
          
          Swal.fire({
            title: 'Process Return Request',
            html: `
              <p>Return request for: <strong>${productName}</strong></p>
              <div class="mb-3">
                <label for="returnAction" class="form-label">Action</label>
                <select id="returnAction" class="swal2-input">
                  <option value="approve">Approve Return</option>
                  <option value="reject">Reject Return</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="returnReason" class="form-label">Reason/Note (optional)</label>
                <textarea id="returnReason" class="swal2-textarea" placeholder="Add a note about this decision"></textarea>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Process',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
              const action = document.getElementById('returnAction').value;
              const reason = document.getElementById('returnReason').value;
              return { action, reason };
            }
          }).then((result) => {
            if (result.isConfirmed) {
              const { action, reason } = result.value;
              
              Swal.fire({
                title: 'Processing...',
                text: 'Please wait while we process the return request',
                allowOutsideClick: false,
                didOpen: () => {
                  Swal.showLoading();
                }
              });
              
              fetch('/admin/orders/process-return', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                  orderId, 
                  productId, 
                  action, 
                  reason 
                })
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: data.message,
                    confirmButtonText: 'OK'
                  }).then(() => {
                    window.location.reload();
                  });
                } else {
                  Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'Failed to process return request',
                    confirmButtonText: 'OK'
                  });
                }
              })
              .catch(error => {
                console.error('Error:', error);
                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'An error occurred. Please try again.',
                  confirmButtonText: 'OK'
                });
              });
            }
          });
        });
      });
    }
    const updateStatusBtns = document.querySelectorAll('.update-status-btn');
    if (updateStatusBtns.length > 0) {
      updateStatusBtns.forEach(btn => {
        btn.addEventListener('click', function() {
          const orderId = this.dataset.orderId;
          const productId = this.dataset.productId || '';
          const currentStatus = this.dataset.currentStatus;
          
          Swal.fire({
            title: 'Update Order Status',
            html: `
              <div class="mb-3">
                <label for="statusSelect" class="form-label">New Status</label>
                <select id="statusSelect" class="swal2-input">
                  <option value="pending" ${currentStatus === 'pending' ? 'selected' : ''}>Pending</option>
                  <option value="shipped" ${currentStatus === 'shipped' ? 'selected' : ''}>Shipped</option>
                  <option value="out for delivery" ${currentStatus === 'out for delivery' ? 'selected' : ''}>Out for Delivery</option>
                  <option value="delivered" ${currentStatus === 'delivered' ? 'selected' : ''}>Delivered</option>
                  <option value="cancelled" ${currentStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="trackingNumber" class="form-label">Tracking Number (optional)</label>
                <input type="text" id="trackingNumber" class="swal2-input" placeholder="Enter tracking number">
              </div>
              <div class="mb-3">
                <label for="courier" class="form-label">Courier (optional)</label>
                <input type="text" id="courier" class="swal2-input" placeholder="Enter courier name">
              </div>
              <div class="mb-3">
                <label for="statusNote" class="form-label">Note (optional)</label>
                <textarea id="statusNote" class="swal2-textarea" placeholder="Add a note about this status change"></textarea>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Update',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
              const status = document.getElementById('statusSelect').value;
              const note = document.getElementById('statusNote').value;
              const trackingNumber = document.getElementById('trackingNumber').value;
              const courier = document.getElementById('courier').value;
              return { status, note, trackingNumber, courier };
            }
          }).then((result) => {
            if (result.isConfirmed) {
              const { status, note, trackingNumber, courier } = result.value;
              Swal.fire({
                title: 'Updating...',
                text: 'Please wait while we update the order status',
                allowOutsideClick: false,
                didOpen: () => {
                  Swal.showLoading();
                }
              });
              fetch(`/admin/orders/update-status/${orderId}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                  status, 
                  note,
                  productId,
                  trackingNumber,
                  courier
                })
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: data.message,
                    confirmButtonText: 'OK'
                  }).then(() => {
                    window.location.reload();
                  });
                } else {
                  Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'Failed to update order status',
                    confirmButtonText: 'OK'
                  });
                }
              })
              .catch(error => {
                console.error('Error:', error);
                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'An error occurred. Please try again.',
                  confirmButtonText: 'OK'
                });
              });
            }
          });
        });
      });
    }

    const cancelOrderBtn = document.querySelector('.cancel-order-btn');
    if (cancelOrderBtn) {
      cancelOrderBtn.addEventListener('click', function() {
        const orderId = this.dataset.orderId;
        
        Swal.fire({
          title: 'Cancel Order',
          text: 'Are you sure you want to cancel this order?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, cancel it',
          cancelButtonText: 'No, keep it'
        }).then((result) => {
          if (result.isConfirmed) {
            Swal.fire({
              title: 'Cancelling...',
              text: 'Please wait while we cancel the order',
              allowOutsideClick: false,
              didOpen: () => {
                Swal.showLoading();
              }
            });
            fetch(`/admin/orders/update-status/${orderId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                status: 'cancelled',
                note: 'Cancelled by admin'
              })
            })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                Swal.fire({
                  icon: 'success',
                  title: 'Success',
                  text: 'Order cancelled successfully',
                  confirmButtonText: 'OK'
                }).then(() => {
                  window.location.reload();
                });
              } else {
                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: data.message || 'Failed to cancel order',
                  confirmButtonText: 'OK'
                });
              }
            })
            .catch(error => {
              console.error('Error:', error);
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An error occurred. Please try again.',
                confirmButtonText: 'OK'
              });
            });
          }
        });
      });
    }
});