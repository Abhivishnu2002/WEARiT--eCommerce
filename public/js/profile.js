document.addEventListener("DOMContentLoaded", () => {
    // Edit profile button functionality
    const editProfileBtn = document.getElementById("editProfileBtn")
    const formInputs = document.querySelectorAll(".profile-form .form-control")
  
    if (editProfileBtn) {
      editProfileBtn.addEventListener("click", function () {
        if (this.textContent === "EDIT") {
          // Enable editing
          formInputs.forEach((input) => {
            input.removeAttribute("readonly")
            input.classList.add("editable")
          })
          this.textContent = "SAVE"
        } else {
          // Save changes
          formInputs.forEach((input) => {
            input.setAttribute("readonly", true)
            input.classList.remove("editable")
          })
          this.textContent = "EDIT"
  
          // Here you would typically send the updated data to the server
          // For demonstration, we'll just show an alert
          showNotification("Profile updated successfully!")
        }
      })
    }
  
    // Simple notification function
    function showNotification(message) {
      const notification = document.createElement("div")
      notification.className = "notification"
      notification.textContent = message
  
      document.body.appendChild(notification)
  
      setTimeout(() => {
        notification.classList.add("show")
      }, 10)
  
      setTimeout(() => {
        notification.classList.remove("show")
        setTimeout(() => {
          document.body.removeChild(notification)
        }, 300)
      }, 3000)
    }
  
    // Add this CSS for the notification
    const style = document.createElement("style")
    style.textContent = `
          .notification {
              position: fixed;
              bottom: 20px;
              right: 20px;
              background-color: #000;
              color: #fff;
              padding: 15px 20px;
              border-radius: 5px;
              box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
              transform: translateY(100px);
              opacity: 0;
              transition: all 0.3s ease;
              z-index: 1000;
          }
          
          .notification.show {
              transform: translateY(0);
              opacity: 1;
          }
          
          .form-control.editable {
              background-color: #fff;
              border-color: #000;
          }
      `
    document.head.appendChild(style)
  })
  