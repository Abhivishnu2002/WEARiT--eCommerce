document.addEventListener("DOMContentLoaded", function () {
    const updateStockBtns = document.querySelectorAll('.update-stock-btn');
    updateStockBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.dataset.productId;
            const size = this.dataset.size;
            const productName = this.dataset.productName;
            const currentStock = parseInt(this.dataset.currentStock);
            
            Swal.fire({
                title: 'Update Stock',
                html: `
                    <p>Product: <strong>${productName}</strong></p>
                    ${size ? `<p>Size: <strong>${size}</strong></p>` : ''}
                    <p>Current Stock: <strong>${currentStock}</strong></p>
                    <div class="mb-3">
                        <label for="newStock" class="form-label">New Stock Quantity</label>
                        <input type="number" id="newStock" class="swal2-input" value="${currentStock}" min="0">
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Update',
                cancelButtonText: 'Cancel',
                preConfirm: () => {
                    const quantity = document.getElementById('newStock').value;
                    if (!quantity || isNaN(quantity) || quantity < 0) {
                        Swal.showValidationMessage('Please enter a valid quantity');
                        return false;
                    }
                    return { quantity };
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    const { quantity } = result.value;

                    Swal.fire({
                        title: 'Updating...',
                        text: 'Please wait while we update the stock',
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    fetch('/admin/inventory/update-stock', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                            productId, 
                            size, 
                            quantity 
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Success',
                                text: 'Stock updated successfully',
                                confirmButtonText: 'OK'
                            }).then(() => {
                                window.location.reload();
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: data.message || 'Failed to update stock',
                                confirmButtonText: 'OK'
                            });
                        }
                    })
                    .catch(error => {
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

    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const numberBtns = document.querySelectorAll('.number-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (!this.disabled) {
                const currentPage = parseInt(document.querySelector('.number-btn.active').textContent);
                const threshold = document.querySelector('input[name="threshold"]').value;
                window.location.href = `/admin/inventory?page=${currentPage - 1}&threshold=${threshold}`;
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            if (!this.disabled) {
                const currentPage = parseInt(document.querySelector('.number-btn.active').textContent);
                const threshold = document.querySelector('input[name="threshold"]').value;
                window.location.href = `/admin/inventory?page=${currentPage + 1}&threshold=${threshold}`;
            }
        });
    }
    
    numberBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const page = this.textContent;
            const threshold = document.querySelector('input[name="threshold"]').value;
            window.location.href = `/admin/inventory?page=${page}&threshold=${threshold}`;
        });
    });
});