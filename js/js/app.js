/* ===================================================
   MAIN APPLICATION LOGIC
   =================================================== */

let currentRole = 'student';
let currentUser = null;
let currentSelectedLetter = ALPHABET_DATA[0];
let isDrawing = false;
let userDrawingPoints = [];

// Khởi tạo ứng dụng
document.addEventListener("DOMContentLoaded", () => {
    initDatabase();
    renderAlphabetGrid();
    setupCanvas();
});

function initDatabase() {
    if (!localStorage.getItem("USERS")) {
        localStorage.setItem("USERS", JSON.stringify(DEFAULT_USERS));
    }
}

// Xử lý Auth
function setRole(role) {
    currentRole = role;
    document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function handleLogin(e) {
    e.preventDefault();
    const id = document.getElementById('login-id').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const users = JSON.parse(localStorage.getItem("USERS"));

    const user = users.find(u => u.id === id && u.pass === pass && u.role === currentRole);

    if (user) {
        currentUser = user;
        document.getElementById('auth-screen').classList.add('hidden');
        if (user.role === 'student') {
            document.getElementById('student-app').classList.remove('hidden');
            document.getElementById('student-name-display').innerText = user.name;
            document.getElementById('student-stars').innerText = user.stars || 0;
            initGame();
        } else {
            document.getElementById('teacher-app').classList.remove('hidden');
            renderTeacherStudentTable();
            populatePrintSelect();
        }
    } else {
        const err = document.getElementById('login-error');
        err.innerText = "Mã số hoặc mật khẩu không chính xác!";
        err.classList.remove('hidden');
    }
}

function logout() {
    location.reload();
}

/* ===================================================
   GIAO DIỆN HỌC SINH & ANIMATION SVG
   =================================================== */

function renderAlphabetGrid() {
    const container = document.getElementById('alphabet-container');
    container.innerHTML = "";
    ALPHABET_DATA.forEach(item => {
        const card = document.createElement('div');
        card.className = "letter-card";
        card.innerHTML = `<span class="char">${item.lower}</span><span style="font-size: 12px; color: #64748B;">${item.upper}</span>`;
        card.onclick = () => selectLetter(item);
        container.appendChild(card);
    });
}

function selectLetter(letterItem) {
    currentSelectedLetter = letterItem;
    document.getElementById('writing-zone').classList.remove('hidden');
    document.getElementById('selected-letter-title').innerText = `${letterItem.name} (${letterItem.lower} / ${letterItem.upper})`;
    clearCanvas();
    drawStaticTemplateSVG();
    playVoiceInstruction();
}

function playVoiceInstruction() {
    VoiceAssistant.speak(`Đây là ${currentSelectedLetter.name}. Con hãy xem cách viết nhé.`);
}

function drawStaticTemplateSVG() {
    const svg = document.getElementById('svg-animation');
    svg.innerHTML = "";
    currentSelectedLetter.strokes.forEach(stroke => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", stroke.d);
        path.setAttribute("stroke", "#E2E8F0");
        path.setAttribute("stroke-width", "8");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-linecap", "round");
        svg.appendChild(path);
    });
}

function startAnimation() {
    const svg = document.getElementById('svg-animation');
    svg.innerHTML = ""; // Clear old
    
    currentSelectedLetter.strokes.forEach((stroke, index) => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", stroke.d);
        path.setAttribute("stroke", "#FF7B9C");
        path.setAttribute("stroke-width", "8");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-linecap", "round");
        
        const length = 1000; // Chiều dài ước tính nét vẽ
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;
        path.style.animation = `drawStroke 2s ease-in-out forwards ${index * 2}s`;
        
        svg.appendChild(path);
    });

    // Thêm CSS Keyframe động cho SVG Animation
    if (!document.getElementById('svg-anim-style')) {
        const style = document.createElement('style');
        style.id = 'svg-anim-style';
        style.innerHTML = `@keyframes drawStroke { to { stroke-dashoffset: 0; } }`;
        document.head.appendChild(style);
    }
}

/* ===================================================
   CANVAS TỰ VIẾT BẰNG TAY (MOUSE/TOUCH)
   =================================================== */

function setupCanvas() {
    const canvas = document.getElementById('paint-canvas');
    const ctx = canvas.getContext('2d');

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDraw = (e) => {
        isDrawing = true;
        const pos = getPos(e);
        userDrawingPoints = [pos];
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.strokeStyle = "#2B2D42";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const pos = getPos(e);
        userDrawingPoints.push(pos);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const stopDraw = () => { isDrawing = false; };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);

    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDraw);
}

function clearCanvas() {
    const canvas = document.getElementById('paint-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    userDrawingPoints = [];
    document.getElementById('feedback-msg').innerText = "";
}

function checkWriting() {
    const result = StrokeRecognizer.evaluateStroke(userDrawingPoints, currentSelectedLetter.strokes[0].d);
    const feedbackEl = document.getElementById('feedback-msg');
    feedbackEl.innerText = result.feedback;
    feedbackEl.style.color = result.isPassed ? "green" : "#E11D48";

    if (result.isPassed && currentUser) {
        currentUser.stars = (currentUser.stars || 0) + 2;
        document.getElementById('student-stars').innerText = currentUser.stars;
        VoiceAssistant.speak("Hoan hô! Con làm tốt lắm.");
    } else {
        VoiceAssistant.speak("Con hãy thử lại nhé.");
    }
}

/* ===================================================
   TRÒ CHƠI HỌC TẬP
   =================================================== */
let currentGameTarget = null;

function initGame() {
    const randomIndex = Math.floor(Math.random() * ALPHABET_DATA.length);
    currentGameTarget = ALPHABET_DATA[randomIndex];

    const optionsContainer = document.getElementById('game-options');
    optionsContainer.innerHTML = "";

    // Lấy ngẫu nhiên 3 lựa chọn
    const options = [currentGameTarget];
    while(options.length < 3) {
        const rand = ALPHABET_DATA[Math.floor(Math.random() * ALPHABET_DATA.length)];
        if(!options.find(o => o.id === rand.id)) options.push(rand);
    }
    options.sort(() => Math.random() - 0.5);

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = "font-hp001";
        btn.style.cssText = "font-size: 36px; width: 80px; height: 80px; border-radius: 16px; border: 2px solid #4ECDC4; background: white; cursor: pointer;";
        btn.innerText = opt.lower;
        btn.onclick = () => checkGameAnswer(opt);
        optionsContainer.appendChild(btn);
    });
}

function playGameAudio() {
    if (currentGameTarget) {
        VoiceAssistant.speak(`Hãy tìm chữ ${currentGameTarget.name}`);
    }
}

function checkGameAnswer(selected) {
    if (selected.id === currentGameTarget.id) {
        alert("Chính xác! Con nhận được 5 ⭐");
        currentUser.stars += 5;
        document.getElementById('student-stars').innerText = currentUser.stars;
        initGame();
    } else {
        alert("Chưa đúng rồi! Con thử lại nhé.");
    }
}

/* ===================================================
   GIÁO VIÊN & IN PHIẾU
   =================================================== */

function renderTeacherStudentTable() {
    const users = JSON.parse(localStorage.getItem("USERS")).filter(u => u.role === 'student');
    const tbody = document.getElementById('student-table-body');
    tbody.innerHTML = "";
    users.forEach(s => {
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 12px;">${s.id}</td>
                <td style="padding: 12px;">${s.name}</td>
                <td style="padding: 12px;">${s.class}</td>
                <td style="padding: 12px;">⭐ ${s.stars}</td>
            </tr>
        `;
    });
}

function populatePrintSelect() {
    const select = document.getElementById('print-letter-select');
    select.innerHTML = "";
    ALPHABET_DATA.forEach(item => {
        select.innerHTML += `<option value="${item.id}">${item.name} (${item.lower})</option>`;
    });
}

function generatePrintSheet() {
    const letterId = document.getElementById('print-letter-select').value;
    const item = ALPHABET_DATA.find(a => a.id === letterId);
    const container = document.getElementById('print-rows-container');
    container.innerHTML = "";

    for (let i = 0; i < 8; i++) {
        const row = document.createElement('div');
        row.style.cssText = "font-family: 'HP001_4_Normal'; font-size: 36px; letter-spacing: 25px; border-bottom: 1px dashed #CCC; margin-bottom: 15px; padding-bottom: 5px;";
        row.innerText = `${item.lower} ${item.lower} ${item.lower} ${item.lower} ${item.lower} ${item.lower} ${item.lower}`;
        container.appendChild(row);
    }
}

function showStudentTab(tab) {
    document.getElementById('st-tab-learn').classList.add('hidden');
    document.getElementById('st-tab-games').classList.add('hidden');
    if(tab === 'learn') document.getElementById('st-tab-learn').classList.remove('hidden');
    if(tab === 'games') document.getElementById('st-tab-games').classList.remove('hidden');
}

function showTeacherTab(tab) {
    document.getElementById('tc-tab-students').classList.add('hidden');
    document.getElementById('tc-tab-print').classList.add('hidden');
    if(tab === 'students') document.getElementById('tc-tab-students').classList.remove('hidden');
    if(tab === 'print') document.getElementById('tc-tab-print').classList.remove('hidden');
}
