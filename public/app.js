const API_URL = '/api';

const todoForm = document.getElementById('todo-form');
const taskInput = document.getElementById('task-input');
const assigneeInput = document.getElementById('assignee-input');
const taskTimeInput = document.getElementById('task-time');
const taskList = document.getElementById('task-list');
const tabBtns = document.querySelectorAll('.tab-btn');

let selectedDate = null;
let currentTab = 'active';

document.addEventListener('DOMContentLoaded', () => {
    fetchTasks();
    seedTimeInput();
    seedCalendar();
    startClock();
});

// Tab switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === currentTab));
        fetchTasks();
    });
});

// Pre-fill time input with current time
function seedTimeInput() {
    if (!taskTimeInput) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    taskTimeInput.value = `${hh}:${mm}`;
}

// Clock + calendar loop
let calViewYear = new Date().getFullYear();
let calViewMonth = new Date().getMonth();

function startClock() {
    renderAnalogClock(new Date());
    updateSidebarInfo();
    setTimeout(startClock, 1000);
}

function seedCalendar() {
    renderCalendar(new Date(calViewYear, calViewMonth, 1));
}

function updateTodayHighlight() {
    document.querySelectorAll('.cal-day.today').forEach(el => el.classList.remove('today'));
    const now = new Date();
    const today = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
}

function updateSidebarInfo() {
    const now = new Date();
    document.getElementById('digital-time').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    document.getElementById('digital-date').textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const h = now.getHours();
    const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    document.getElementById('greeting').textContent = greeting;
    const navDate = document.getElementById('nav-date');
    if (navDate) navDate.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// Analog clock
function renderAnalogClock(now) {
    const canvas = document.getElementById('analog-clock');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 140;
    const center = size / 2;
    const radius = center - 6;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(139,92,246,0.7)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.clip();
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, 'rgba(139,92,246,0.25)');
    grad.addColorStop(1, 'rgba(236,72,153,0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
    ctx.save();
    ctx.translate(center, center);
    const hr = now.getHours() % 12;
    const mn = now.getMinutes();
    const sc = now.getSeconds();
    const ms = now.getMilliseconds();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 6;
    for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * (radius - 16), Math.sin(angle) * (radius - 16));
        ctx.lineTo(Math.cos(angle) * (radius - 7), Math.sin(angle) * (radius - 7));
        ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 11px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) {
        const angle = (i * Math.PI * 2) / 12 - Math.PI / 2;
        const numRadius = radius - 26;
        ctx.fillText(i, Math.cos(angle) * numRadius, Math.sin(angle) * numRadius);
    }
    ctx.shadowColor = 'rgba(236,72,153,0.8)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(((sc + ms / 1000) / 60) * Math.PI * 2 - Math.PI / 2) * (radius - 26), Math.sin(((sc + ms / 1000) / 60) * Math.PI * 2 - Math.PI / 2) * (radius - 26));
    ctx.stroke();
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(((mn + sc / 60) / 60) * Math.PI * 2 - Math.PI / 2) * (radius - 40), Math.sin(((mn + sc / 60) / 60) * Math.PI * 2 - Math.PI / 2) * (radius - 40));
    ctx.stroke();
    ctx.shadowColor = '#f8fafc';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(((hr + mn / 60) / 12) * Math.PI * 2 - Math.PI / 2) * (radius - 48), Math.sin(((hr + mn / 60) / 12) * Math.PI * 2 - Math.PI / 2) * (radius - 48));
    ctx.stroke();
    ctx.restore();
}

// Calendar with clickable dates
function renderCalendar(date) {
    const cal = document.getElementById('calendar');
    if (!cal) return;
    const year = date.getFullYear();
    const month = date.getMonth();
    const now = new Date();
    const todayDay = now.getDate();
    const todayMonth = now.getMonth();
    const todayYear = now.getFullYear();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const prevMonthDays = new Date(year, month, 0).getDate();

    let html = `<div class="cal-month">${monthName}</div><div class="cal-nav"><button class="cal-prev-btn" type="button"><i class="fas fa-chevron-left"></i></button><button class="cal-next-btn" type="button"><i class="fas fa-chevron-right"></i></button></div><div class="cal-grid">`;
    ['S','M','T','W','T','F','S'].forEach(d => html += `<div class="cal-day-label">${d}</div>`);

    for (let i = firstDay - 1; i >= 0; i--) {
        html += `<div class="cal-day prev-month">${prevMonthDays - i}</div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const isActuallyToday = (d === todayDay && month === todayMonth && year === todayYear);
        const isSel = selectedDate === `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        let cls = 'cal-day clickable';
        if (isSel) cls += ' selected';
        else if (isActuallyToday) cls += ' today';
        html += `<div class="${cls}" data-day="${d}" data-month="${month + 1}" data-year="${year}">${d}</div>`;
    }

    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
    for (let i = 1; i <= remaining; i++) {
        html += `<div class="cal-day next-month">${i}</div>`;
    }

    html += '</div>';
    cal.innerHTML = html;

    cal.querySelectorAll('.cal-prev-btn, .cal-next-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const newDate = new Date(year, month + (btn.classList.contains('cal-next-btn') ? 1 : -1), 1);
            calViewYear = newDate.getFullYear();
            calViewMonth = newDate.getMonth();
            renderCalendar(newDate);
        };
    });

    cal.querySelectorAll('.cal-day.clickable').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const d = parseInt(el.dataset.day);
            const m = parseInt(el.dataset.month);
            const y = parseInt(el.dataset.year);
            selectedDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            document.getElementById('task-date-input').value = selectedDate;
            calViewYear = y;
            calViewMonth = m - 1;
            renderCalendar(new Date(y, m - 1, 1));
        });
    });
}

function initCalendarInteraction() {
    // already handled in renderCalendar via event delegation
}

// Fetch and render tasks
async function fetchTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`);
        const tasks = await response.json();
        renderTasks(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

function renderTasks(tasks) {
    taskList.innerHTML = '';
    let filtered = tasks;
    if (currentTab === 'active') filtered = tasks.filter(t => t.status !== 'Completed');
    else if (currentTab === 'completed') filtered = tasks.filter(t => t.status === 'Completed');

    if (filtered.length === 0) {
        taskList.innerHTML = `
            <li class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>No tasks here. Add one above!</p>
            </li>
        `;
    } else {
        filtered.forEach(task => taskList.appendChild(createTaskElement(task)));
    }
    updateStats(tasks);
}

function getTaskDate(task) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const mmm = now.toLocaleDateString('en-US', { month: 'short' });
    const yyyy = now.getFullYear();

    const candidates = [task.scheduledAt, task.createdAt, task.completedAt].filter(Boolean);

    for (const c of candidates) {
        if (!c || typeof c !== 'string') continue;
        if (c.includes(`${d} ${mmm} ${yyyy}`) || c.includes(`${d} ${mmm}`)) return true;
        if (c.startsWith(`${y}-${m}-${d}`)) return true;
        if (c.startsWith(`${yyyy}-${m}-${d}`)) return true;
        if (c.startsWith(`${d} ${mmm} ${yyyy}`)) return true;
    }
    return false;
}

function updateStats(tasks) {
    const totalAll = tasks.length;
    const doneAll = tasks.filter(t => t.status === 'Completed').length;
    const allPct = totalAll === 0 ? 0 : Math.round((doneAll / totalAll) * 100);

    const todayTasks = tasks.filter(t => getTaskDate(t));
    const totalToday = todayTasks.length;
    const doneToday = todayTasks.filter(t => t.status === 'Completed').length;
    const todayPct = totalToday === 0 ? 0 : Math.round((doneToday / totalToday) * 100);

    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    const setW = (id, v) => { const e = document.getElementById(id); if (e) e.style.width = v; };

    set('stat-total-main', totalAll);
    set('stat-active-main', totalAll - doneAll);
    set('stat-done-main', doneAll);
    setW('stat-all-bar-main', allPct + '%');
    set('stat-all-pct-main', allPct + '%');

    const now2 = new Date();
    const todayStr = now2.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const todayTasksList = tasks.filter(t => {
        const candidates = [t.scheduledAt, t.createdAt, t.completedAt].filter(Boolean);
        return candidates.some(c => String(c).includes(todayStr));
    });
    const todayListEl = document.getElementById('stat-today-list');
    if (todayListEl) {
        if (todayTasksList.length === 0) {
            todayListEl.innerHTML = '<span class="stat-empty">No tasks scheduled today yet</span>';
        } else {
            todayListEl.innerHTML = todayTasksList.slice(0, 8).map(t => {
                const cls = t.status === 'Completed' ? 'today-badge completed' : 'today-badge active';
                return `<span class="${cls}">${escapeHtml(t.task)}</span>`;
            }).join('');
            if (todayTasksList.length > 8) {
                todayListEl.innerHTML += `<span class="stat-empty">+${todayTasksList.length - 8} more</span>`;
            }
        }
    }

    set('stat-today-active', todayTasks.filter(t => t.status !== 'Completed').length);
    set('stat-today-completed', todayTasks.filter(t => t.status === 'Completed').length);
    setW('stat-today-bar-main', todayPct + '%');
    set('stat-today-pct-main', todayPct + '%');
    setW('stat-today-focus', todayPct + '%');
    set('stat-today-focus-text', todayPct + '%');

    const prodEl = document.getElementById('stat-productivity');
    if (prodEl) prodEl.textContent = `${allPct}% productivity`;
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.status === 'Completed' ? 'completed' : ''}`;
    li.dataset.id = task.id;
    const timeDisplay = task.scheduledAt || task.createdAt || '';
    li.innerHTML = `
        <div class="task-checkbox" onclick="toggleTaskStatus('${task.id}', '${task.status}')">
            <i class="fas fa-check"></i>
        </div>
        <div class="task-content">
            <div class="task-text">${escapeHtml(task.task)}</div>
            ${task.assignee ? `<div class="task-assignee"><i class="fas fa-user"></i> ${escapeHtml(task.assignee)}</div>` : ''}
            ${timeDisplay ? `<div class="task-meta"><span class="task-date"><i class="fa-regular fa-clock"></i> ${formatDate(timeDisplay)}</span></div>` : ''}
        </div>
        <button class="delete-btn" onclick="deleteTask('${task.id}')">
            <i class="fas fa-trash-can"></i>
        </button>
    `;
    return li;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    if (/^\d{1,2}:\d{2}$/.test(String(dateStr).trim())) return dateStr;
    try {
        const date = new Date(String(dateStr).trim());
        if (isNaN(date.getTime())) return dateStr;
        const d = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const t = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        return `${d} · ${t}`;
    } catch {
        return dateStr;
    }
}

// Submit task
todoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const task = taskInput.value.trim();
    if (!task) return;
    const assignee = assigneeInput.value.trim();
    const time = taskTimeInput ? taskTimeInput.value : `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    const date = document.getElementById('task-date-input')?.value || '';
    let scheduledAt = '';
    if (date && date.trim()) {
        scheduledAt = `${date.trim()} ${time}`;
    } else {
        const now = new Date();
        const yy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        scheduledAt = `${yy}-${mm}-${dd} ${time}`;
    }
    await createTask(task, assignee, scheduledAt);
});

async function createTask(task, assignee, scheduledAt) {
    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task, assignee, endAt: scheduledAt })
        });
        if (response.ok) {
            taskInput.value = '';
            assigneeInput.value = '';
            if (taskTimeInput) {
                const now = new Date();
                taskTimeInput.value = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            }
            selectedDate = null;
            const dateInput = document.getElementById('task-date-input');
            if (dateInput) dateInput.value = '';
            fetchTasks();
        }
    } catch (error) {
        console.error('Error adding task:', error);
    }
}

async function toggleTaskStatus(id, currentStatus) {
    const newStatus = currentStatus === 'Active' ? 'Completed' : 'Active';
    try {
        const response = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) fetchTasks();
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

async function deleteTask(id) {
    if (!confirm('Delete this task?')) return;
    try {
        const response = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
        if (response.ok) fetchTasks();
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}
