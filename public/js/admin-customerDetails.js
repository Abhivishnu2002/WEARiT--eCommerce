document.addEventListener("DOMContentLoaded", function () {
    const toggleForm = document.querySelector(".toggle-form");
    if (toggleForm) {
        toggleForm.addEventListener("submit", function (e) {
            e.preventDefault();

            Swal.fire({
                title: "Are you sure?",
                text: "This will update the user block status.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Yes, confirm"
            }).then((result) => {
                if (result.isConfirmed) {
                    const formData = new FormData(this);
                    const action = this.action;
                    const method = this.method;

                    fetch(action, {
                        method: method,
                        body: formData
                    })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error("Network response was not ok");
                            }
                            return response.text();
                        })
                        .then(() => {
                            Swal.fire({
                                icon: "success",
                                title: "Updated!",
                                text: "User status changed successfully",
                                confirmButtonColor: "#000"
                            }).then(() => {
                                location.reload();
                            });
                        })
                        .catch((error) => {
                            console.error("Block user error:", error);
                            Swal.fire({
                                icon: "error",
                                title: "Error",
                                text: "An error occurred. Please try again later.",
                                confirmButtonColor: "#000"
                            });
                        });
                }
            });
        });
    }
});
