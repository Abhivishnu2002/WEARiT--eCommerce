document.addEventListener("DOMContentLoaded", function() {
    const addMoneyForm = document.getElementById('addMoneyForm');
    if (addMoneyForm) {
        addMoneyForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const amount = document.getElementById('amount').value;
            if (!amount || amount <= 0) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Amount',
                    text: 'Please enter a valid amount greater than 0',
                });
                return;
            }
            Swal.fire({
                title: 'Processing...',
                text: 'Please wait while we process your payment',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            setTimeout(() => {
                fetch('/wallet/add-money', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        amount: parseFloat(amount),
                        paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value
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
                            text: data.message || 'Failed to add money to wallet',
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
            }, 2000);
        });
    }
});