document.addEventListener("DOMContentLoaded", () => {
    const services = {
        Braiding: { price: 25000, deposit: 10000 },
        "Nail Design": { price: 15000, deposit: 7500 },
        Makeup: { price: 20000, deposit: 10000 },
        "Hair Styling": { price: 18000, deposit: 9000 }
    };

    const getBookings = () => JSON.parse(localStorage.getItem("salonBookings") || "[]");
    const saveBookings = (value) => localStorage.setItem("salonBookings", JSON.stringify(value));
    const money = (value) => `MWK ${Number(value).toLocaleString("en-US")}`;
    const get = (id) => document.getElementById(id);

    const serviceSelect = get("service");
    const appointmentDate = get("appointmentDate");
    const dateStatus = get("dateStatus");
    const paymentModal = get("paymentModal");
    const feedbackModal = get("feedbackModal");
    let selectedTime = "";

    function formatDate(value) {
        return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric"
        });
    }

    function formatTime(value) {
        const [hours, minutes] = value.split(":");
        const date = new Date(2000, 0, 1, hours, minutes);
        return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }

    function updateSummary() {
        const selectedService = services[serviceSelect.value];
        get("summaryService").textContent = serviceSelect.value || "Not selected";
        get("summaryDate").textContent = appointmentDate.value ? formatDate(appointmentDate.value) : "Not selected";
        get("summaryTime").textContent = selectedTime ? formatTime(selectedTime) : "Not selected";
        get("summaryPrice").textContent = selectedService ? money(selectedService.price) : "MWK 0";
        get("summaryDeposit").textContent = selectedService ? money(selectedService.deposit) : "MWK 0";
    }

    function refreshAvailability() {
        const bookings = getBookings();
        let available = 0;
        document.querySelectorAll(".time-slots button").forEach((slot) => {
            const booked = bookings.some((booking) => booking.date === appointmentDate.value && booking.time === slot.dataset.time);
            slot.disabled = booked;
            slot.classList.toggle("booked", booked);
            slot.classList.toggle("selected", slot.dataset.time === selectedTime);
            if (!booked) available += 1;
        });
        dateStatus.textContent = appointmentDate.value
            ? `${available} time slot${available === 1 ? "" : "s"} available.`
            : "Select a date to see availability.";
    }

    function renderBookings() {
        const bookings = getBookings();
        const appointmentList = get("appointmentList");
        const ownerBookings = get("ownerBookings");

        appointmentList.innerHTML = bookings.length ? bookings.map((booking) => `
            <article class="appointment-card">
                <div class="appointment-main">
                    <h3>${booking.service}</h3>
                    <div class="appointment-details"><span>${formatDate(booking.date)}</span><span>${formatTime(booking.time)}</span><span>${booking.name}</span></div>
                    ${booking.feedback ? `<button class="view-feedback" data-feedback="${booking.id}">View salon feedback</button>` : ""}
                </div>
                <span class="status ${booking.status.toLowerCase()}">${booking.status}</span>
            </article>`).join("") : `<div class="empty-appointments"><div>📅</div><h3>No appointments yet</h3><p>Your bookings will appear here.</p></div>`;

        ownerBookings.innerHTML = bookings.length ? bookings.map((booking) => `
            <article class="owner-booking">
                <div class="owner-booking-top"><div><h4>${booking.name} - ${booking.service}</h4><small>${formatDate(booking.date)} at ${formatTime(booking.time)}</small></div><span class="status ${booking.status.toLowerCase()}">${booking.status}</span></div>
                <p>${booking.phone} | ${booking.email}</p>
                ${booking.note ? `<p>${booking.note}</p>` : ""}
                <button class="btn btn-primary" data-status="Confirmed" data-booking="${booking.id}">Confirm</button>
                <button class="btn btn-secondary" data-status="Rejected" data-booking="${booking.id}">Reject</button>
            </article>`).join("") : `<div class="empty-appointments"><div>📋</div><h3>No booking requests</h3><p>New customer requests will appear here.</p></div>`;

        const confirmed = bookings.filter((booking) => booking.status === "Confirmed");
        get("totalBookings").textContent = bookings.length;
        get("pendingBookings").textContent = bookings.filter((booking) => booking.status === "Pending").length;
        get("confirmedBookings").textContent = confirmed.length;
        get("revenue").textContent = money(confirmed.reduce((total, booking) => total + booking.price, 0));
    }

    serviceSelect.addEventListener("change", updateSummary);
    appointmentDate.addEventListener("change", () => {
        selectedTime = "";
        refreshAvailability();
        updateSummary();
    });

    document.querySelectorAll(".time-slots button").forEach((slot) => {
        slot.addEventListener("click", () => {
            if (slot.disabled) return;
            selectedTime = slot.dataset.time;
            refreshAvailability();
            updateSummary();
        });
    });

    document.querySelectorAll(".service-select").forEach((button) => {
        button.addEventListener("click", () => {
            serviceSelect.value = button.dataset.service;
            serviceSelect.dispatchEvent(new Event("change"));
            get("booking").scrollIntoView({ behavior: "smooth" });
        });
    });

    get("designUpload").addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file || !file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            const preview = get("imagePreview");
            preview.innerHTML = `<img src="${reader.result}" alt="Customer design">`;
            preview.style.display = "block";
        });
        reader.readAsDataURL(file);
    });

    get("submitBooking").addEventListener("click", () => {
        if (!serviceSelect.value || !appointmentDate.value || !selectedTime) {
            alert("Please select a service, date and available time first.");
            return;
        }
        get("paymentAmount").textContent = money(services[serviceSelect.value].deposit);
        paymentModal.classList.add("active");
    });

    get("completePayment").addEventListener("click", () => {
        const name = get("customerName").value.trim();
        const phone = get("customerPhone").value.trim();
        const email = get("customerEmail").value.trim();
        const reference = get("paymentReference").value.trim();
        if (!name || !phone || !email || !reference) {
            alert("Please complete your contact and payment information.");
            return;
        }

        const details = services[serviceSelect.value];
        const booking = {
            id: Date.now().toString(), service: serviceSelect.value, price: details.price,
            deposit: details.deposit, date: appointmentDate.value, time: selectedTime,
            name, phone, email, note: get("customerNote").value.trim(), status: "Pending", feedback: ""
        };
        saveBookings([...getBookings(), booking]);
        paymentModal.classList.remove("active");
        renderBookings();
        refreshAvailability();
        get("appointments").scrollIntoView({ behavior: "smooth" });
        alert("Your appointment request has been submitted.");
    });

    document.addEventListener("click", (event) => {
        const statusButton = event.target.closest("[data-status][data-booking]");
        if (statusButton) {
            const bookings = getBookings();
            const booking = bookings.find((item) => item.id === statusButton.dataset.booking);
            if (booking) {
                booking.status = statusButton.dataset.status;
                booking.feedback = booking.status === "Confirmed" ? "Your appointment has been confirmed." : "The salon cannot provide this request at the selected time.";
                saveBookings(bookings);
                renderBookings();
                refreshAvailability();
            }
        }

        const feedbackButton = event.target.closest("[data-feedback]");
        if (feedbackButton) {
            const booking = getBookings().find((item) => item.id === feedbackButton.dataset.feedback);
            get("feedbackContent").textContent = booking?.feedback || "No feedback available.";
            feedbackModal.classList.add("active");
        }
    });

    ["closePayment", "closeFeedback", "closeFeedbackButton"].forEach((id) => {
        get(id).addEventListener("click", () => {
            paymentModal.classList.remove("active");
            feedbackModal.classList.remove("active");
        });
    });

    get("refreshOwner").addEventListener("click", renderBookings);
    get("mobileMenu").addEventListener("click", () => document.querySelector("nav").classList.toggle("open"));
    document.querySelector("nav").addEventListener("click", () => document.querySelector("nav").classList.remove("open"));

    updateSummary();
    refreshAvailability();
    renderBookings();
});
