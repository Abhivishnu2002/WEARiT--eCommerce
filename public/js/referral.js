document.addEventListener("DOMContentLoaded", () => {
  const copyButton = document.getElementById("copyButton")
  if (copyButton) {
    copyButton.addEventListener("click", function () {
      const referralCode = document.getElementById("referralCode")
      referralCode.select()
      document.execCommand("copy")

      const originalText = this.innerHTML
      this.innerHTML = '<i class="fas fa-check"></i> Copied!'

      setTimeout(() => {
        this.innerHTML = originalText
      }, 2000)
    })
  }
  const shareButtons = document.querySelectorAll(".referral-share a")
  shareButtons.forEach((button) => {
    button.addEventListener("click", function () {

    })
  })
})
