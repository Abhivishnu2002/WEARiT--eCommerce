document.addEventListener("DOMContentLoaded", function () {
    try {
        if (
            typeof locals !== "undefined" &&
            locals.success_msg &&
            success_msg.length > 0
        ) {
            Swal.fire({
                icon: "success",
                title: "Success",
                text: success_msg,
                confirmButtonColor: "#0d6efd",
            });
        }

        if (
            typeof locals !== "undefined" &&
            locals.error_msg &&
            error_msg.length > 0
        ) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: error_msg,
                confirmButtonColor: "#0d6efd",
            });
        }
    } catch (e) {
        console.log("Flash message check error:", e);
    }
    const addVariantBtn = document.getElementById("addVariantBtn");
    const variantsContainer =
        document.getElementById("variantsContainer");
    let variantCount = 1;

    if (addVariantBtn && variantsContainer) {
        addVariantBtn.addEventListener("click", function () {
            variantCount++;
            const newVariant = document.createElement("div");
            newVariant.className = "variant-section";
            newVariant.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4 class="variant-title mb-0">Variant ${variantCount}</h4>
                    <span class="remove-variant" data-variant="${variantCount}">
                        <i class="fas fa-times me-1"></i> Remove
                    </span>
                </div>
                <div class="row mb-3">
                    <div class="col-md-3 mb-3 mb-md-0">
                        <label class="form-label">Size</label>
                        <input type="text" class="form-control" name="size" required placeholder="S, M, L, XL, etc.">
                    </div>
                    <div class="col-md-3 mb-3 mb-md-0">
                        <label class="form-label">Regular Price (₹)</label>
                        <input type="number" class="form-control" name="varientPrice" min="0" step="0.01" required>
                    </div>
                    <div class="col-md-3 mb-3 mb-md-0">
                        <label class="form-label">Sale Price (₹)</label>
                        <input type="number" class="form-control" name="salePrice" min="0" step="0.01" required>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Quantity</label>
                        <input type="number" class="form-control" name="varientquatity" min="0" required>
                    </div>
                </div>
            `;
            variantsContainer.appendChild(newVariant);
            const removeBtn = newVariant.querySelector(".remove-variant");
            removeBtn.addEventListener("click", function () {
                variantsContainer.removeChild(newVariant);
            });
        });
    }
    function setupImageUpload(
        containerId,
        inputId,
        buttonId,
        removeButtonId
    ) {
        const container = document.getElementById(containerId);
        const fileInput = document.getElementById(inputId);
        const uploadButton = document.getElementById(buttonId);
        const removeButton =
            document.getElementById(removeButtonId);

        if (
            !container ||
            !fileInput ||
            !uploadButton ||
            !removeButton
        ) {
            console.error(
                `Missing elements for ${containerId}, ${inputId}, ${buttonId}, or ${removeButtonId}`
            );
            return;
        }
        uploadButton.addEventListener("click", function (e) {
            e.stopPropagation();
            fileInput.click();
        });
        container.addEventListener("click", function (e) {
            if (
                e.target !== uploadButton &&
                !uploadButton.contains(e.target) &&
                e.target !== removeButton &&
                !removeButton.contains(e.target)
            ) {
                fileInput.click();
            }
        });

        fileInput.addEventListener("change", function () {
            if (fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();

                reader.onload = function (e) {
                    container.innerHTML = "";

                    const img = document.createElement("img");
                    img.src = e.target.result;
                    img.className = "image-preview";
                    container.appendChild(img);

                    removeButton.classList.remove("d-none");
                };

                reader.readAsDataURL(fileInput.files[0]);
            }
        });

        removeButton.addEventListener("click", function (e) {
            e.stopPropagation();

            fileInput.value = "";

            container.innerHTML = `
                <i class="fas fa-image upload-icon"></i>
                <p class="upload-text">Drag and drop image here, or click to add image</p>
                <button type="button" class="btn-upload" id="${buttonId}">Add Image</button>
            `;

            const newButton = document.getElementById(buttonId);
            if (newButton) {
                newButton.addEventListener("click", function (e) {
                    e.stopPropagation();
                    fileInput.click();
                });
            }

            removeButton.classList.add("d-none");
        });

        container.addEventListener("dragover", function (e) {
            e.preventDefault();
            container.style.borderColor = "#0d6efd";
        });

        container.addEventListener("dragleave", function (e) {
            e.preventDefault();
            container.style.borderColor = "#dee2e6";
        });

        container.addEventListener("drop", function (e) {
            e.preventDefault();
            container.style.borderColor = "#dee2e6";

            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                fileInput.files = e.dataTransfer.files;

                const reader = new FileReader();
                reader.onload = function (e) {
                    container.innerHTML = "";
                    const img = document.createElement("img");
                    img.src = e.target.result;
                    img.className = "image-preview";
                    container.appendChild(img);
                    removeButton.classList.remove("d-none");
                };

                reader.readAsDataURL(e.dataTransfer.files[0]);
            }
        });
    }
    setupImageUpload(
        "mainPhotoUpload",
        "mainImage",
        "mainImageBtn",
        "removeMainImage"
    );
    setupImageUpload(
        "additionalPhoto1Container",
        "additionalImage1",
        "additionalImage1Btn",
        "removeAdditionalPhoto1"
    );
    setupImageUpload(
        "additionalPhoto2Container",
        "additionalImage2",
        "additionalImage2Btn",
        "removeAdditionalPhoto2"
    );
    setupImageUpload(
        "additionalPhoto3Container",
        "additionalImage3",
        "additionalImage3Btn",
        "removeAdditionalPhoto3"
    );
    const form = document.getElementById("addProductForm");
    if (form) {
        form.addEventListener("submit", function (e) {
            const productName = document
                .getElementById("productName")
                .value.trim();
            const description = document
                .getElementById("description")
                .value.trim();
            const category =
                document.getElementById("category").value;
            const mainImage =
                document.getElementById("mainImage").files.length;

            let isValid = true;
            let errorMessage = "";

            if (!productName) {
                isValid = false;
                errorMessage = "Product name is required";
            } else if (!description) {
                isValid = false;
                errorMessage = "Product description is required";
            } else if (!category) {
                isValid = false;
                errorMessage = "Category selection is required";
            } else if (!mainImage) {
                isValid = false;
                errorMessage = "Main product image is required";
            }

            if (!isValid) {
                e.preventDefault();
                Swal.fire({
                    icon: "error",
                    title: "Validation Error",
                    text: errorMessage,
                    confirmButtonColor: "#0d6efd",
                });
            }
        });
    }
});