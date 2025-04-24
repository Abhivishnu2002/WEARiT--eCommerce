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
    const activityCtx = document
        .getElementById("activityChart")
        .getContext("2d");
    const activityChart = new Chart(activityCtx, {
        type: "bar",
        data: {
            labels: [
                "JAN",
                "FEB",
                "MAR",
                "APR",
                "MAY",
                "JUN",
                "JUL",
                "AUG",
                "SEP",
                "OCT",
                "NOV",
                "DEC",
            ],
            datasets: [
                {
                    label: "Sales",
                    data: [
                        80, 120, 110, 220, 250, 190, 220, 90, 230,
                        210, 280, 330,
                    ],
                    backgroundColor: "#0d6efd",
                    borderRadius: 5,
                    barThickness: 15,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false,
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 400,
                    grid: {
                        display: false,
                    },
                    ticks: {
                        stepSize: 100,
                        callback: function (value) {
                            if (value === 0) return "0";
                            if (value === 100) return "100";
                            if (value === 200) return "200";
                            if (value === 300) return "300";
                            if (value === 400) return "400";
                            return "";
                        },
                    },
                },
                x: {
                    grid: {
                        display: false,
                    },
                },
            },
        },
    });
    const progressCtx = document
        .getElementById("progressChart")
        .getContext("2d");
    const progressChart = new Chart(progressCtx, {
        type: "doughnut",
        data: {
            datasets: [
                {
                    data: [75.55, 24.45],
                    backgroundColor: ["#0d6efd", "#f1f3fa"],
                    borderWidth: 0,
                    cutout: "80%",
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    enabled: false,
                },
            },
        },
    });
    window.addEventListener("resize", function () {
        activityChart.resize();
        progressChart.resize();
    });
});