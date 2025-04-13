document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl)
    })
    
    // Product card hover effect
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
      card.addEventListener('mouseenter', function() {
        this.querySelector('.card-img-top').style.transform = 'scale(1.05)';
      });
      
      card.addEventListener('mouseleave', function() {
        this.querySelector('.card-img-top').style.transform = 'scale(1)';
      });
    });
    
    // Add to cart animation
    const cartButtons = document.querySelectorAll('.btn-outline-dark');
    cartButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Add animation class
        this.classList.add('btn-dark');
        this.classList.remove('btn-outline-dark');
        
        // Change icon to check
        const icon = this.querySelector('i');
        icon.classList.remove('fa-shopping-cart');
        icon.classList.add('fa-check');
        
        // Reset after animation
        setTimeout(() => {
          this.classList.remove('btn-dark');
          this.classList.add('btn-outline-dark');
          icon.classList.remove('fa-check');
          icon.classList.add('fa-shopping-cart');
        }, 1500);
      });
    });
  });