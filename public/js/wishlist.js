document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById("toastContainer")) {
        const toastContainer = document.createElement("div")
        toastContainer.id = "toastContainer"
        toastContainer.className = "toast-container position-fixed bottom-0 end-0 p-3"
        document.body.appendChild(toastContainer)
    }
    function showToast(message, type = "success") {
        const toastContainer = document.getElementById("toastContainer")
        const toastId = `toast-${Date.now()}`
        
        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center text-white bg-${type === "success" ? "success" : "danger"}" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `
        
        toastContainer.insertAdjacentHTML("beforeend", toastHTML)
        const toastElement = document.getElementById(toastId)
        const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 })
        toast.show()
        toastElement.addEventListener("hidden.bs.toast", () => {
            toastElement.remove()
        })
    }

    document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            const confirmModal = document.createElement("div")
            confirmModal.innerHTML = `
                <div class="modal fade" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Remove Item</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <p>Are you sure you want to remove this item from your wishlist?</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger confirm-remove">Remove</button>
                            </div>
                        </div>
                    </div>
                </div>
            `
            
            document.body.appendChild(confirmModal)
            const modalElement = confirmModal.querySelector('.modal')
            const modal = new bootstrap.Modal(modalElement)
            modal.show()
            
            confirmModal.querySelector('.confirm-remove').addEventListener('click', function() {
                this.disabled = true
                removeFromWishlist(productId)
                    .then(() => {
                        modal.hide()
                        setTimeout(() => {
                            confirmModal.remove()
                        }, 300)
                    })
            })
            
            modalElement.addEventListener('hidden.bs.modal', function() {
                setTimeout(() => {
                    confirmModal.remove()
                }, 300)
            })
        });
    });

    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            const size = this.getAttribute('data-size');
            
            this.disabled = true
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...'
            
            addToCart(productId, size)
                .then(() => {
                    this.disabled = false
                    this.innerHTML = 'Add To Cart'
                })
                .catch(() => {
                    this.disabled = false
                    this.innerHTML = 'Add To Cart'
                })
        });
    });

    const emptyWishlistBtn = document.getElementById('emptyWishlist');
    if (emptyWishlistBtn) {
        emptyWishlistBtn.addEventListener('click', () => {
            const confirmModal = document.createElement("div")
            confirmModal.innerHTML = `
                <div class="modal fade" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Empty Wishlist</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <p>Are you sure you want to empty your wishlist? This action cannot be undone.</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger confirm-empty">Empty Wishlist</button>
                            </div>
                        </div>
                    </div>
                </div>
            `
            
            document.body.appendChild(confirmModal)
            const modalElement = confirmModal.querySelector('.modal')
            const modal = new bootstrap.Modal(modalElement)
            modal.show()
            
            confirmModal.querySelector('.confirm-empty').addEventListener('click', function() {
                this.disabled = true
                emptyWishlistBtn.disabled = true
                
                fetch('/wishlist/empty', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'same-origin'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showToast('Wishlist emptied successfully', 'success')
                
                        const wishlistItems = document.querySelector('.wishlist-items')
                        wishlistItems.innerHTML = `
                            <div class="col-12 text-center py-5">
                                <div class="empty-wishlist-message">
                                    <i class="fa-regular fa-heart fa-3x mb-3"></i>
                                    <h3>Your wishlist is empty</h3>
                                    <p>Add items you love to your wishlist. Review them anytime and easily move them to the bag.</p>
                                    <a href="/products" class="btn btn-dark mt-3">Continue Shopping</a>
                                </div>
                            </div>
                        `
                        
                        document.querySelector('.wishlist-actions').innerHTML = ''
                        
                        const titleElement = document.querySelector('.wishlist-title')
                        if (titleElement) {
                            titleElement.textContent = 'Wishlist (0)'
                        }
                        
                        modal.hide()
                    } else {
                        emptyWishlistBtn.disabled = false
                        showToast(data.message || 'Failed to empty wishlist', 'danger')
                    }
                })
                .catch(error => {
                    console.error('Error:', error)
                    emptyWishlistBtn.disabled = false
                    showToast('An error occurred. Please try again.', 'danger')
                })
                .finally(() => {
                    setTimeout(() => {
                        confirmModal.remove()
                    }, 300)
                })
            })
            
            modalElement.addEventListener('hidden.bs.modal', function() {
                setTimeout(() => {
                    confirmModal.remove()
                }, 300)
            })
        })
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
                showToast('Your wishlist is empty', 'danger')
                return;
            }
            
            const confirmModal = document.createElement("div")
            confirmModal.innerHTML = `
                <div class="modal fade" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Move All to Cart</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <p>Are you sure you want to move all items to your cart?</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-dark confirm-move">Move All</button>
                            </div>
                        </div>
                    </div>
                </div>
            `
            
            document.body.appendChild(confirmModal)
            const modalElement = confirmModal.querySelector('.modal')
            const modal = new bootstrap.Modal(modalElement)
            modal.show()
            
            confirmModal.querySelector('.confirm-move').addEventListener('click', function() {
                this.disabled = true
                moveAllToCartBtn.disabled = true
                
                showToast('Moving items to cart...', 'success')
                
                const processItems = async () => {
                    for (const product of products) {
                        try {
                            await addToCart(product.id, product.size, false)
                        } catch (error) {
                            console.error('Error adding product to cart:', error)
                        }
                    }
                    
                    window.location.href = '/cart'
                }
                
                processItems()
                modal.hide()
            })
            
            modalElement.addEventListener('hidden.bs.modal', function() {
                setTimeout(() => {
                    confirmModal.remove()
                }, 300)
            })
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
                    const wishlistItem = document.querySelector(`.wishlist-item[data-product-id="${productId}"]`)
                    if (wishlistItem) {
                        const column = wishlistItem.closest('.col-xl-3, .col-lg-4, .col-md-6, .col-sm-6')
                        if (column) {
                            column.remove()
                            const titleElement = document.querySelector('.wishlist-title')
                            const currentCount = parseInt(titleElement.textContent.match(/\d+/)[0])
                            const newCount = currentCount - 1
                            titleElement.textContent = `Wishlist (${newCount})`
                            if (newCount === 0) {
                                const wishlistItems = document.querySelector('.wishlist-items')
                                wishlistItems.innerHTML = `
                                    <div class="col-12 text-center py-5">
                                        <div class="empty-wishlist-message">
                                            <i class="fa-regular fa-heart fa-3x mb-3"></i>
                                            <h3>Your wishlist is empty</h3>
                                            <p>Add items you love to your wishlist. Review them anytime and easily move them to the bag.</p>
                                            <a href="/products" class="btn btn-dark mt-3">Continue Shopping</a>
                                        </div>
                                    </div>
                                `
                                document.querySelector('.wishlist-actions').innerHTML = ''
                            }
                        }
                    }
                    
                    showToast('Item removed from wishlist', 'success')
                }
            } else {
                showToast(data.message || 'Failed to remove from wishlist', 'danger')
            }
            return data;
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('An error occurred. Please try again.', 'danger')
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
                showToast('Product added to cart', 'success')
                return removeFromWishlist(productId, false).then(() => {
                    if (redirect) {
                        window.location.href = '/cart';
                    }
                    return data;
                });
            } else {
                showToast(data.message || 'Failed to add to cart', 'danger')
                return Promise.reject(data);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('An error occurred. Please try again.', 'danger')
            return Promise.reject(error);
        });
    }
});