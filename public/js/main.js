document.addEventListener('DOMContentLoaded', function() {
  // Flash message auto-dismiss
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    setTimeout(() => {
      const closeButton = alert.querySelector('.btn-close');
      if (closeButton) {
        closeButton.click();
      } else {
        alert.classList.add('fade');
        setTimeout(() => {
          alert.remove();
        }, 500);
      }
    }, 5000);
  });
  
  // OTP Input Handling
  const otpInputs = document.querySelectorAll('.otp-input');
  if (otpInputs.length > 0) {
    otpInputs.forEach((input, index) => {
      // Auto focus next input on input
      input.addEventListener('input', function() {
        if (this.value.length === this.maxLength && index < otpInputs.length - 1) {
          otpInputs[index + 1].focus();
        }
      });
      
      // Handle backspace
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && !this.value && index > 0) {
          otpInputs[index - 1].focus();
        }
      });
      
      // Handle paste
      input.addEventListener('paste', function(e) {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').trim();
        
        if (/^\d+$/.test(pasteData)) {
          // Fill all inputs with pasted data
          for (let i = 0; i < Math.min(pasteData.length, otpInputs.length); i++) {
            otpInputs[i].value = pasteData[i] || '';
          }
          
          // Focus appropriate input
          if (pasteData.length < otpInputs.length) {
            otpInputs[pasteData.length].focus();
          } else {
            otpInputs[otpInputs.length - 1].focus();
          }
        }
      });
    });
  }
  
  // OTP Timer
  const timerElement = document.getElementById('timer');
  const resendButton = document.querySelector('.resend-otp-btn');
  
  if (timerElement && resendButton) {
    let timeLeft = 60;
    
    function updateTimer() {
      if (timeLeft <= 0) {
        timerElement.textContent = '';
        resendButton.disabled = false;
        return;
      }
      
      timerElement.textContent = `(${timeLeft}s)`;
      resendButton.disabled = true;
      timeLeft--;
      setTimeout(updateTimer, 1000);
    }
    
    // Start timer
    updateTimer();
    
    // Reset timer on resend
    resendButton.addEventListener('click', function() {
      timeLeft = 60;
      updateTimer();
    });
  }
  
  // Product image gallery
  const mainImage = document.getElementById('mainImage');
  const thumbnails = document.querySelectorAll('.thumbnail');
  
  if (mainImage && thumbnails.length > 0) {
    thumbnails.forEach(thumbnail => {
      thumbnail.addEventListener('click', function() {
        // Remove active class from all thumbnails
        thumbnails.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked thumbnail
        this.classList.add('active');
        
        // Update main image
        const imgSrc = this.querySelector('img').getAttribute('src');
        mainImage.setAttribute('src', imgSrc);
      });
    });
    
    // Image zoom functionality
    mainImage.addEventListener('click', function() {
      this.classList.toggle('zoomed');
    });
  }
  
  // Quantity increment/decrement
  const quantityInput = document.getElementById('quantity');
  const decrementBtn = document.getElementById('decrementBtn');
  const incrementBtn = document.getElementById('incrementBtn');
  
  if (quantityInput && decrementBtn && incrementBtn) {
    decrementBtn.addEventListener('click', function() {
      if (quantityInput.value > 1) {
        quantityInput.value = parseInt(quantityInput.value) - 1;
      }
    });
    
    incrementBtn.addEventListener('click', function() {
      if (quantityInput.value < parseInt(quantityInput.max)) {
        quantityInput.value = parseInt(quantityInput.value) + 1;
      }
    });
  }
  
  // Star rating functionality
  const ratingInputs = document.querySelectorAll('.rating-input input');
  const ratingLabels = document.querySelectorAll('.rating-input label');
  
  if (ratingInputs.length > 0 && ratingLabels.length > 0) {
    ratingInputs.forEach((input, index) => {
      input.addEventListener('change', function() {
        const rating = this.value;
        
        ratingLabels.forEach((label, i) => {
          const star = label.querySelector('i');
          if (i < 5 - rating) {
            star.className = 'far fa-star';
          } else {
            star.className = 'fas fa-star';
          }
        });
      });
    });
  }
});