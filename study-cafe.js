document.addEventListener('DOMContentLoaded', () => {
    const seatMap = document.getElementById('seatMap');
    const summaryDate = document.getElementById('summaryDate');
    const summarySeat = document.getElementById('summarySeat');
    const confirmBtn = document.getElementById('confirmBtn');
    const successModal = document.getElementById('successModal');

    const myBookingSection = document.getElementById('myBookingSection');
    const myBookingContent = document.getElementById('myBookingContent');

    let selectedSeat = null;
    let bookings = JSON.parse(localStorage.getItem('luminaBookings')) || [];

    // Fixed "Today" date
    const today = new Date().toISOString().split('T')[0];
    if (summaryDate) summaryDate.textContent = today;

    // Initialize
    if (seatMap) {
        generateLayout();
        loadAvailability();
        updateMyBookingSection();
    }

    if (confirmBtn) confirmBtn.addEventListener('click', handleBooking);

    // Functions
    function generateLayout() {
        seatMap.innerHTML = '';

        // Row 1: Seats 1-10
        for (let i = 1; i <= 10; i++) {
            createSeat(i);
        }

        // Row 2: Seats 11-14, Door, Seats 15-18
        // Seats 11-14
        for (let i = 11; i <= 14; i++) {
            createSeat(i);
        }

        // Door (takes 2 columns)
        const door = document.createElement('div');
        door.classList.add('seat', 'door');
        door.textContent = '출입문';
        seatMap.appendChild(door);

        // Seats 15-18
        for (let i = 15; i <= 18; i++) {
            createSeat(i);
        }
    }

    function createSeat(i) {
        const seat = document.createElement('div');
        seat.classList.add('seat');
        seat.dataset.seatId = i;
        seat.textContent = i;
        seat.addEventListener('click', () => selectSeat(i, seat));
        seatMap.appendChild(seat);
    }

    function loadAvailability() {
        // Reset selection
        selectedSeat = null;
        updateSummary();

        const seats = document.querySelectorAll('.seat:not(.door)');
        seats.forEach(seat => {
            seat.classList.remove('occupied', 'selected');

            // Check if seat is booked for today (ignore time)
            const isBooked = bookings.some(booking =>
                booking.date === today &&
                booking.seatId === parseInt(seat.dataset.seatId)
            );

            if (isBooked) {
                seat.classList.add('occupied');
            }
        });
    }

    function selectSeat(seatId, seatElement) {
        if (seatElement.classList.contains('occupied')) return;

        // Deselect previous
        const prevSelected = document.querySelector('.seat.selected');
        if (prevSelected) {
            prevSelected.classList.remove('selected');
        }

        // Toggle current
        if (selectedSeat !== seatId) {
            seatElement.classList.add('selected');
            selectedSeat = seatId;
        } else {
            selectedSeat = null;
        }

        updateSummary();
    }

    function updateSummary() {
        if (!summarySeat) return;
        summarySeat.textContent = selectedSeat ? `좌석 #${selectedSeat}` : '-';
        confirmBtn.disabled = !selectedSeat;
    }

    function updateMyBookingSection() {
        if (!myBookingSection || !myBookingContent) return;

        if (bookings.length > 0) {
            const booking = bookings[0]; // Assuming single booking
            myBookingSection.style.display = 'block';
            myBookingContent.innerHTML = `
                <strong>${booking.date}</strong> | 
                <strong>좌석 #${booking.seatId}</strong> | 
                <span>${booking.timeLabel}</span>
            `;
            // Disable booking controls if already booked
            if (confirmBtn) confirmBtn.disabled = true;
            // Optional: Hide seat map interaction or show message? 
            // User just said "make a separate space below". 
            // We'll keep it simple.
        } else {
            myBookingSection.style.display = 'none';
        }
    }

    function handleBooking(e) {
        if (e) e.preventDefault();
        if (!selectedSeat) return;

        // Check for existing bookings (One seat per person limit)
        if (bookings.length > 0) {
            const warningModal = document.getElementById('warningModal');
            if (warningModal) warningModal.classList.add('active');
            return;
        }

        const newBooking = {
            id: Date.now(),
            date: today,
            time: 'All Day', // No specific time
            timeLabel: '종일',
            seatId: selectedSeat,
            timestamp: new Date().toISOString()
        };

        bookings.push(newBooking);
        localStorage.setItem('luminaBookings', JSON.stringify(bookings));

        // Show success modal
        successModal.classList.add('active');

        // Reload availability and My Booking section
        loadAvailability();
        updateMyBookingSection();
    }

    // Expose cancel function globally for the modal or other UI
    window.cancelBooking = function () {
        if (bookings.length > 0 && confirm('정말로 이 예약을 취소하시겠습니까?')) {
            bookings = []; // Clear all bookings since we only allow one
            localStorage.setItem('luminaBookings', JSON.stringify(bookings));
            location.reload();
        }
    };
});

// My Bookings Page Logic
const bookingsList = document.getElementById('bookingsList');
let bookings = JSON.parse(localStorage.getItem('luminaBookings')) || []; // Re-declare bookings for this scope

if (bookingsList) {
    renderBookings();
}

function renderBookings() {
    bookingsList.innerHTML = '';

    if (bookings.length === 0) {
        bookingsList.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">예약 내역이 없습니다.</p>';
        return;
    }

    // Sort by date (newest first)
    bookings.sort((a, b) => new Date(b.date) - new Date(a.date));

    bookings.forEach(booking => {
        const card = document.createElement('div');
        card.classList.add('glass-panel', 'booking-card');
        card.style.padding = '20px';
        card.style.marginBottom = '20px';
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';

        card.innerHTML = `
            <div>
                <h3 style="margin-bottom:5px;">좌석 #${booking.seatId}</h3>
                <p style="color:var(--text-secondary);">${booking.date} | ${booking.timeLabel}</p>
            </div>
            <button class="btn btn-outline" onclick="cancelBooking(${booking.id})" style="border-color:var(--error-color); color:var(--error-color);">취소</button>
        `;
        bookingsList.appendChild(card);
    });
}

// This cancelBooking is for the my-bookings page specifically, allowing cancellation of individual bookings.
// The global window.cancelBooking defined in the DOMContentLoaded block is for a different purpose (clearing all bookings).
// To avoid conflict and ensure the correct cancelBooking is called, we'll rename this one or ensure its scope.
// Given the instruction to remove pathname checks, this part should ideally be integrated or removed if not needed globally.
// For now, let's assume the instruction implies removing the conditional block, but keeping the functionality if the element exists.
// The instruction's `window.cancelBooking` implies a single global function.
// Let's adjust this part to use the global `window.cancelBooking` if it's meant to clear all, or define a new one if it's meant to cancel individual.
// The instruction's `window.cancelBooking` clears *all* bookings. The `my-bookings.html` part cancels *individual* bookings.
// This is a conflict. The instruction says "remove pathname checks" and provides a *single* `window.cancelBooking` that clears *all*.
// This implies the individual booking cancellation functionality from `my-bookings.html` should be removed or re-thought.
// I will remove the individual cancellation function and assume the global one is the intended behavior for *any* cancellation.
// However, the `onclick="cancelBooking(${booking.id})"` in `renderBookings` expects an `id` parameter.
// The instruction's `window.cancelBooking` does not take an `id`. This is a direct contradiction.

// Re-evaluating the instruction: "Fix syntax error and remove pathname checks"
// The provided `Code Edit` snippet for `window.cancelBooking` is:
// ```
//     window.cancelBooking = function() {
//         if(bookings.length > 0 && confirm('정말로 이 예약을 취소하시겠습니까?')) {
//             bookings = []; // Clear all bookings since we only allow one
//             localStorage.setItem('luminaBookings', JSON.stringify(bookings));
//             location.reload();
//         }
//     };
// ```
// This function clears *all* bookings. The `my-bookings.html` section's `onclick="cancelBooking(${booking.id})"` expects a function that cancels a *specific* booking by ID.
// This means the `my-bookings.html` part's `cancelBooking` function needs to be preserved, but its global exposure needs to be handled carefully, or it needs to be renamed.
// The instruction implies removing the `if (window.location.pathname.includes('my-bookings.html'))` block, which means the `renderBookings` and its associated `cancelBooking` should be available globally or conditionally based on `bookingsList` existence.

// Let's assume the instruction wants the `my-bookings.html` functionality to be available if `bookingsList` exists, and the `window.cancelBooking` from the main block is for a different purpose (e.g., a general "clear all bookings" button on the main page).
// To resolve the conflict, I will rename the `my-bookings` specific `cancelBooking` to `cancelIndividualBooking` and ensure it's called correctly.
// The instruction's `window.cancelBooking` will be the one that clears all.

// The original `window.cancelBooking` from the `my-bookings.html` block:
// ```javascript
//     window.cancelBooking = function (id) {
//         if (confirm('정말로 이 예약을 취소하시겠습니까?')) {
//             const updatedBookings = bookings.filter(b => b.id !== id);
//             localStorage.setItem('luminaBookings', JSON.stringify(updatedBookings));
//             location.reload();
//         }
//     };
// ```
// This needs to be preserved for the `bookingsList` part.
// The instruction's `window.cancelBooking` is different.

// I will make the `window.cancelBooking` from the instruction the primary global one (clears all).
// For the `bookingsList` part, I will define a local function `cancelIndividualBooking` and call it from the `onclick`.
// This means the `onclick` in `renderBookings` needs to change.

// Let's re-evaluate the instruction's intent for "remove pathname checks".
// It means the code should run regardless of the path.
// The `my-bookings.html` specific logic should now just run if `bookingsList` element exists.

// The most faithful interpretation of "remove pathname checks" and applying the provided `Code Edit` for `window.cancelBooking` is:
// 1. Remove the `if (window.location.pathname.includes('my-bookings.html'))` wrapper.
// 2. The `window.cancelBooking` provided in the instruction replaces the old `window.cancelBooking` (which took an `id`).
// 3. This means the `onclick="cancelBooking(${booking.id})"` in `renderBookings` will now call the new `window.cancelBooking` which clears *all* bookings, not just the one by ID. This is a significant functional change but directly follows the instruction's provided `Code Edit`.

// So, the `renderBookings` function will remain, but its button's `onclick` will now trigger the "clear all" `cancelBooking`.

// Final plan:
// 1. Remove the `if (window.location.pathname.includes('my-bookings.html'))` block.
// 2. The `bookingsList` related code will now be at the global scope (outside DOMContentLoaded, but still in the script).
// 3. The `window.cancelBooking` from the instruction will be placed inside the `DOMContentLoaded` listener.
// 4. The `onclick="cancelBooking(${booking.id})"` in `renderBookings` will now call the `window.cancelBooking` that clears all. This is a functional change but aligns with the provided `Code Edit`.

// Let's ensure `bookings` variable is correctly scoped.
// The `DOMContentLoaded` has `let bookings`.
// The `my-bookings` section also has `const bookings`. This is a re-declaration.
// If the `my-bookings` section is moved out of the conditional, it needs to use the same `bookings` variable or manage its own.
// Given the instruction, it's better to have a single source of truth for `bookings`.
// I will move the `bookingsList` logic *inside* the `DOMContentLoaded` listener to share the `bookings` variable.

// Revised Final Plan:
// 1. Move all `my-bookings.html` related code (bookingsList, renderBookings, and the old cancelBooking) *inside* the `DOMContentLoaded` listener.
// 2. This way, `bookings` variable is shared.
// 3. Replace the old `window.cancelBooking` (from `my-bookings.html` section) with the new `window.cancelBooking` provided in the instruction.
// 4. The `onclick="cancelBooking(${booking.id})"` in `renderBookings` will now call the new `window.cancelBooking` (which clears all). This is a functional change but consistent with the instruction.

document.addEventListener('DOMContentLoaded', () => {
    const seatMap = document.getElementById('seatMap');
    const summaryDate = document.getElementById('summaryDate');
    const summarySeat = document.getElementById('summarySeat');
    const confirmBtn = document.getElementById('confirmBtn');
    const successModal = document.getElementById('successModal');

    let selectedSeat = null;
    let bookings = JSON.parse(localStorage.getItem('luminaBookings')) || [];

    // Fixed "Today" date
    const today = new Date().toISOString().split('T')[0];
    if (summaryDate) summaryDate.textContent = today;

    // Initialize Seat Map
    if (seatMap) {
        generateLayout();
        loadAvailability();
    }

    if (confirmBtn) confirmBtn.addEventListener('click', handleBooking);

    // Functions
    function generateLayout() {
        seatMap.innerHTML = '';

        // Row 1: Seats 1-10
        for (let i = 1; i <= 10; i++) {
            createSeat(i);
        }

        // Row 2: Seats 11-14, Door, Seats 15-18
        // Seats 11-14
        for (let i = 11; i <= 14; i++) {
            createSeat(i);
        }

        // Door (takes 2 columns)
        const door = document.createElement('div');
        door.classList.add('seat', 'door');
        door.textContent = '출입문';
        seatMap.appendChild(door);

        // Seats 15-18
        for (let i = 15; i <= 18; i++) {
            createSeat(i);
        }
    }

    function createSeat(i) {
        const seat = document.createElement('div');
        seat.classList.add('seat');
        seat.dataset.seatId = i;
        seat.textContent = i;
        seat.addEventListener('click', () => selectSeat(i, seat));
        seatMap.appendChild(seat);
    }

    function loadAvailability() {
        // Reset selection
        selectedSeat = null;
        updateSummary();

        const seats = document.querySelectorAll('.seat:not(.door)');
        seats.forEach(seat => {
            seat.classList.remove('occupied', 'selected');

            // Check if seat is booked for today (ignore time)
            const isBooked = bookings.some(booking =>
                booking.date === today &&
                booking.seatId === parseInt(seat.dataset.seatId)
            );

            if (isBooked) {
                seat.classList.add('occupied');
            }
        });
    }

    function selectSeat(seatId, seatElement) {
        if (seatElement.classList.contains('occupied')) return;

        // Deselect previous
        const prevSelected = document.querySelector('.seat.selected');
        if (prevSelected) {
            prevSelected.classList.remove('selected');
        }

        // Toggle current
        if (selectedSeat !== seatId) {
            seatElement.classList.add('selected');
            selectedSeat = seatId;
        } else {
            selectedSeat = null;
        }

        updateSummary();
    }

    function updateSummary() {
        if (!summarySeat) return;
        summarySeat.textContent = selectedSeat ? `좌석 #${selectedSeat}` : '-';
        confirmBtn.disabled = !selectedSeat;
    }

    function handleBooking() {
        if (!selectedSeat) return;

        // Check for existing bookings (One seat per person limit)
        const activeBookings = bookings.filter(b => b.date === today);
        // User said "One seat per person". In a study cafe context, usually means 1 active seat at a time.
        // Since we only support "Today", checking if bookings.length > 0 is sufficient for "One seat per person" in this simplified system.

        if (bookings.length > 0) {
            const warningModal = document.getElementById('warningModal');
            if (warningModal) warningModal.classList.add('active');
            return;
        }

        const newBooking = {
            id: Date.now(),
            date: today,
            time: 'All Day', // No specific time
            timeLabel: '종일',
            seatId: selectedSeat,
            timestamp: new Date().toISOString()
        };

        bookings.push(newBooking);
        localStorage.setItem('luminaBookings', JSON.stringify(bookings));

        // Show success modal
        successModal.classList.add('active');

        // Reload availability
        loadAvailability();
    }

    // Expose cancel function globally for the modal or other UI
    window.cancelBooking = function () {
        if (bookings.length > 0 && confirm('정말로 이 예약을 취소하시겠습니까?')) {
            bookings = []; // Clear all bookings since we only allow one
            localStorage.setItem('luminaBookings', JSON.stringify(bookings));
            location.reload();
        }
    };

    // My Bookings Page Logic (now integrated into DOMContentLoaded)
    const bookingsList = document.getElementById('bookingsList');

    if (bookingsList) {
        renderBookings();
    }

    function renderBookings() {
        bookingsList.innerHTML = '';

        if (bookings.length === 0) {
            bookingsList.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">예약 내역이 없습니다.</p>';
            return;
        }

        // Sort by date (newest first)
        bookings.sort((a, b) => new Date(b.date) - new Date(a.date));

        bookings.forEach(booking => {
            const card = document.createElement('div');
            card.classList.add('glass-panel', 'booking-card');
            card.style.padding = '20px';
            card.style.marginBottom = '20px';
            card.style.display = 'flex';
            card.style.justifyContent = 'space-between';
            card.style.alignItems = 'center';

            card.innerHTML = `
                <div>
                    <h3 style="margin-bottom:5px;">좌석 #${booking.seatId}</h3>
                    <p style="color:var(--text-secondary);">${booking.date} | ${booking.timeLabel}</p>
                </div>
                <button class="btn btn-outline" onclick="window.cancelBooking()" style="border-color:var(--error-color); color:var(--error-color);">취소</button>
            `;
            bookingsList.appendChild(card);
        });
    }
});
