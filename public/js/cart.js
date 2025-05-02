document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".quantity-btn").forEach((button) => {
      button.addEventListener("click", function () {
        const cartItem = this.closest(".cart-item")
        const productId = cartItem.dataset.productId
        const size = cartItem.dataset.size
        const action = this.dataset.action
        const quantityInput = cartItem.querySelector(".quantity-input")

        fetch("/cart/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: productId,
            size: size,
            action: action,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              quantityInput.value = data.quantity
              window.location.reload()
            } else {
              alert(data.message)
            }
          })
          .catch((error) => {
            console.error("Error updating quantity:", error)
            alert("Failed to update quantity")
          })
      })
    })
    document.querySelectorAll(".remove-btn").forEach((button) => {
      button.addEventListener("click", function () {
        const cartItem = this.closest(".cart-item")
        const productId = cartItem.dataset.productId
        const size = cartItem.dataset.size
  
        if (confirm("Are you sure you want to remove this item from your cart?")) {
          fetch("/cart/remove", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              productId: productId,
              size: size,
            }),
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.success) {
                window.location.reload()
              } else {
                alert(data.message)
              }
            })
            .catch((error) => {
              console.error("Error removing item:", error)
              alert("Failed to remove item")
            })
        }
      })
    })
    const emptyCartBtn = document.getElementById("emptyCartBtn")
    if (emptyCartBtn) {
      emptyCartBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to empty your cart?")) {
          fetch("/cart/empty", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.success) {
                window.location.reload()
              } else {
                alert(data.message)
              }
            })
            .catch((error) => {
              console.error("Error emptying cart:", error)
              alert("Failed to empty cart")
            })
        }
      })
    }
  })
  