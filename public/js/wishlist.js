document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            removeFromWishlist(productId);
        });
    });

    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            const size = this.getAttribute('data-size');
            addToCart(productId, size);
        });
    });

    const emptyWishlistBtn = document.getElementById('emptyWishlist');
    if (emptyWishlistBtn) {
        emptyWishlistBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to empty your wishlist?')) {
                fetch('/wishlist/empty', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        window.location.reload();
                    } else {
                        alert(data.message || 'Failed to empty wishlist');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred. Please try again.');
                });
        }})
    }

    const moveAllToCartBtn = document.getElementById('moveAllToCart');
    if (moveAllToCartBtn) {
        moveAllToCartBtn.addEventListener('click', () => {
            const products = Array.from(document.querySelectorAll('.wishlist-item'))
                .map(item => ({
                    id: item.getAttribute('data-product-id'),
                    size: item.querySelector('.add-to-cart-btn').getAttribute('data-size')
                }));
            
            if (products.length === 0) {
                alert('Your wishlist is empty');
                return;
            }
            
            if (confirm('Are you sure you want to move all items to cart?')) {
                Promise.all(products.map(product => addToCart(product.id, product.size, false)))
                    .then(() => {
                        window.location.href = '/cart';
                    });
            }
        });
    }

    function removeFromWishlist(productId, reload = true) {
        return fetch('/wishlist/remove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ productId }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (reload) {
                    window.location.reload();
                }
            } else {
                alert(data.message || 'Failed to remove from wishlist');
            }
            return data;
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        });
    }

    function addToCart(productId, size, redirect = true) {
        return fetch('/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ productId, size, quantity: 1 }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                return removeFromWishlist(productId, false).then(() => {
                    if (redirect) {
                        window.location.href = '/cart';
                    }
                    return data;
                });
            } else {
                alert(data.message || 'Failed to add to cart');
                return data;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        });
    }
});
