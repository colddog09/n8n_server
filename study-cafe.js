import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAyTMaUoBSruJmtRdBpr3ZfU5TsVomG-Y4",
    authDomain: "gbshs-351f8.firebaseapp.com",
    projectId: "gbshs-351f8",
    storageBucket: "gbshs-351f8.firebasestorage.app",
    messagingSenderId: "423897285124",
    appId: "1:423897285124:web:8db3306d579d4769cfeb51",
    measurementId: "G-XGKD6QB591"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const seatMap = document.getElementById('seatMap');
    const summaryDate = document.getElementById('summaryDate');
    const summarySeat = document.getElementById('summarySeat');
    const confirmBtn = document.getElementById('confirmBtn');
    const successModal = document.getElementById('successModal');

    const myBookingSection = document.getElementById('myBookingSection');
    const myBookingContent = document.getElementById('myBookingContent');

    // Get Logged In User ID
    const currentStudentId = localStorage.getItem('gbsStudentId');
    if (!currentStudentId) {
        alert('로그인이 필요합니다.');
        window.location.href = 'index.html';
        return;
    }

    let selectedSeat = null;
    let bookings = []; // Local cache of bookings from Firestore

    // Fixed "Today" date
    const today = new Date().toISOString().split('T')[0];
    if (summaryDate) summaryDate.textContent = today;

    // Initialize
    if (seatMap) {
        generateLayout();
        // Start Real-time Listener
        listenToBookings();
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

    // Real-time listener for bookings
    function listenToBookings() {
        const q = query(collection(db, "bookings"), where("date", "==", today));

        onSnapshot(q, (snapshot) => {
            bookings = [];
            snapshot.forEach((doc) => {
                bookings.push({ ...doc.data(), firestoreId: doc.id });
            });

            // Update UI whenever data changes
            updateSeatAvailability();
            updateMyBookingSection();
        });
    }

    function updateSeatAvailability() {
        // Reset selection if the selected seat became occupied by someone else
        if (selectedSeat) {
            const isNowOccupied = bookings.some(b => b.seatId === selectedSeat);
            if (isNowOccupied) {
                selectedSeat = null;
                updateSummary();
            }
        }

        const seats = document.querySelectorAll('.seat:not(.door)');
        seats.forEach(seat => {
            seat.classList.remove('occupied', 'selected', 'my-seat');

            // Check if seat is booked
            const booking = bookings.find(b => b.seatId === parseInt(seat.dataset.seatId));

            if (booking) {
                seat.classList.add('occupied');
                // If it's MY booking, add special class
                if (booking.studentId === currentStudentId) {
                    seat.classList.add('my-seat');
                    seat.style.borderColor = 'var(--success-color)';
                    seat.style.borderWidth = '2px';
                }
            } else if (selectedSeat === parseInt(seat.dataset.seatId)) {
                seat.classList.add('selected');
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

        // Find booking for THIS user
        const myBooking = bookings.find(b => b.studentId === currentStudentId);

        if (myBooking) {
            myBookingSection.style.display = 'block';
            myBookingContent.innerHTML = `
                <strong>${myBooking.date}</strong> | 
                <strong>좌석 #${myBooking.seatId}</strong> | 
                <span>${myBooking.timeLabel}</span>
            `;
            // Disable booking controls if already booked
            if (confirmBtn) confirmBtn.disabled = true;
        } else {
            myBookingSection.style.display = 'none';
            if (confirmBtn) confirmBtn.disabled = false;
        }
    }

    async function handleBooking(e) {
        if (e) e.preventDefault();
        if (!selectedSeat) return;

        // Check for existing bookings for THIS user locally first (optimization)
        const myExistingBooking = bookings.find(b => b.studentId === currentStudentId);

        if (myExistingBooking) {
            const warningModal = document.getElementById('warningModal');
            if (warningModal) warningModal.classList.add('active');
            return;
        }

        try {
            // Add to Firestore
            await addDoc(collection(db, "bookings"), {
                date: today,
                time: 'All Day',
                timeLabel: '종일',
                seatId: selectedSeat,
                studentId: currentStudentId,
                timestamp: new Date().toISOString()
            });

            // Show success modal
            successModal.classList.add('active');

            // Note: UI updates automatically via onSnapshot listener
        } catch (error) {
            console.error("Error adding booking: ", error);
            alert("예약 중 오류가 발생했습니다.");
        }
    }

    // Expose cancel function globally
    window.cancelBooking = async function () {
        if (confirm('정말로 이 예약을 취소하시겠습니까?')) {
            const myBooking = bookings.find(b => b.studentId === currentStudentId);
            if (myBooking && myBooking.firestoreId) {
                try {
                    await deleteDoc(doc(db, "bookings", myBooking.firestoreId));
                    // location.reload(); // No need to reload with real-time listener!
                } catch (error) {
                    console.error("Error removing booking: ", error);
                    alert("취소 중 오류가 발생했습니다.");
                }
            }
        }
    };
});
