document.addEventListener("DOMContentLoaded", function () {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const filter = this.dataset.filter;
        });
    });
    const searchInput = document.getElementById('searchOrder');
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                const searchValue = this.value.trim();
                if (searchValue) {
                    window.location.href = `/admin/orders?search=${encodeURIComponent(searchValue)}`;
                }
            }
        });
    }

    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const numberBtns = document.querySelectorAll('.number-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (!this.disabled) {
                const currentPage = parseInt(document.querySelector('.number-btn.active').textContent);
                window.location.href = `/admin/orders?page=${currentPage - 1}`;
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            if (!this.disabled) {
                const currentPage = parseInt(document.querySelector('.number-btn.active').textContent);
                window.location.href = `/admin/orders?page=${currentPage + 1}`;
            }
        });
    }
    
    numberBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const page = this.textContent;
            window.location.href = `/admin/orders?page=${page}`;
        });
    });

    const editBtns = document.querySelectorAll('.edit-btn');
    editBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const orderId = this.dataset.orderId;
            
            Swal.fire({
                title: 'Update Order Status',
                html: `
                    <select id="orderStatus" class="swal2-input">
                        <option value="Processing">Processing</option>
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
    });
});