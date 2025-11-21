// Configuration
const N8N_BASE_URL = 'https://n8n.taetae.dev';
const CHAT_WEBHOOK_ID = '2b078be8-7e2b-472e-b483-8356f24c7186/chat';
// TODO: Replace with the actual Webhook ID for fetching reservations after importing the workflow
const GET_RESERVATIONS_WEBHOOK_ID = 'reservations';

// DOM Elements
const reservationList = document.getElementById('reservationList');
const refreshBtn = document.getElementById('refreshBtn');

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

// Fetch Reservations
async function fetchReservations() {
    if (GET_RESERVATIONS_WEBHOOK_ID === 'YOUR_GET_RESERVATIONS_WEBHOOK_ID') {
        reservationList.innerHTML = '<tr><td colspan="4" class="loading-text">⚠️ n8n 워크플로우를 가져온 후 Webhook ID를 설정해주세요.</td></tr>';
        return;
    }

    reservationList.innerHTML = '<tr><td colspan="4" class="loading-text">데이터를 불러오는 중...</td></tr>';

    try {
        const url = `${N8N_BASE_URL}/webhook/${GET_RESERVATIONS_WEBHOOK_ID}`;
        const response = await axios.get(url);
        const data = response.data;

        // Assuming n8n returns an array of objects or { data: [...] }
        let rows = Array.isArray(data) ? data : (data.data || []);

        // Sort by Room Number (1실 -> 2실), then by Date, then by Time
        rows.sort((a, b) => {
            const roomA = a.roomnum || a['창의실'] || '';
            const roomB = b.roomnum || b['창의실'] || '';
            if (roomA !== roomB) return roomA.localeCompare(roomB);

            const dateA = a.date || a['날짜'] || '';
            const dateB = b.date || b['날짜'] || '';
            if (dateA !== dateB) return dateA.localeCompare(dateB);

            const timeA = a.time || a['시간'] || '';
            const timeB = b.time || b['시간'] || '';
            return timeA.localeCompare(timeB);
        });

        renderTable(rows);
    } catch (error) {
        console.error('Fetch Error:', error);
        reservationList.innerHTML = '<tr><td colspan="4" class="loading-text">데이터를 불러오는데 실패했습니다.</td></tr>';
    }
}

function renderTable(rows) {
    if (rows.length === 0) {
        reservationList.innerHTML = '<tr><td colspan="5" class="loading-text">예약 내역이 없습니다.</td></tr>';
        return;
    }

    reservationList.innerHTML = rows.map(row => {
        // Format Date: Remove Year (YYYY.MM.DD -> MM.DD)
        let dateStr = row.date || row['날짜'] || '-';
        if (dateStr.length > 5) {
            // Assuming format YYYY.MM.DD or YYYY-MM-DD, take last 5 chars (MM.DD)
            // Or split by . or - and join last two
            dateStr = dateStr.replace(/^\d{4}[.-]/, '');
        }

        // Format Time: Remove details after space or parenthesis (e.g., "자습1교시 (19:00~)" -> "자습1교시")
        let timeStr = row.time || row['시간'] || '-';
        timeStr = timeStr.split('(')[0].trim(); // Remove (time)
        // If there are other formats like "자습1교시 19:00", split by space might be too aggressive if "자습 1교시" is used.
        // User said "자습*교시 뒤에 있는 시간같은거". Let's assume parenthesis or specific patterns.
        // If the format is "자습1교시 19:00~", we might want to keep just "자습1교시".
        // Let's try to keep it simple: remove anything starting with a digit after a space, or parenthesis.

        // Student ID
        const studentId = row.User || row['학번'] || '-';

        return `
        <tr>
            <td>${row.roomnum || row['창의실'] || '-'}</td>
            <td>${dateStr}</td>
            <td>${timeStr}</td>
            <td>${studentId}</td>
            <td>${row.name || row['이름'] || '-'}</td>
        </tr>
        `;
    }).join('');
}

// Initial Fetch
// fetchReservations(); // Uncomment when ID is set

refreshBtn.addEventListener('click', fetchReservations);

// Chat Handler
// Generate a unique session ID for this page load to maintain conversation context
const currentSessionId = 'session-' + Math.random().toString(36).substr(2, 9);

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message
    addMessage('user', message);
    chatInput.value = '';

    // Show typing indicator
    const loadingId = addMessage('bot', '...');

    try {
        const url = `${N8N_BASE_URL}/webhook/${CHAT_WEBHOOK_ID}`;

        const response = await axios.post(url, {
            chatInput: message,
            sessionId: currentSessionId
        });

        // Remove loading message
        const loadingMsg = document.getElementById(loadingId);
        if (loadingMsg) loadingMsg.remove();

        // Add bot response
        const botReply = response.data.output || response.data.text || JSON.stringify(response.data);
        addMessage('bot', botReply);

    } catch (error) {
        console.error('Chat Error:', error);
        const loadingMsg = document.getElementById(loadingId);
        if (loadingMsg) loadingMsg.remove();

        let errorText = '죄송합니다. 오류가 발생했습니다.';
        if (error.response) {
            errorText += ` (Server Error: ${error.response.status})`;
        } else if (error.request) {
            errorText += ' (Network Error: 서버에 연결할 수 없습니다. CORS 문제일 수 있습니다.)';
        } else {
            errorText += ` (${error.message})`;
        }

        addMessage('bot', errorText);
    }
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// UI Helpers
function addMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    const id = 'msg-' + Date.now();
    msgDiv.id = id;

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.innerText = text;

    msgDiv.appendChild(contentDiv);
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}
