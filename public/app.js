const API_URL = 'http://localhost:3000/api';

const todoForm = document.getElementById('todo-form');
const taskInput = document.getElementById('task-input');
const endAtInput = document.getElementById('end-at-input');
const activeList = document.getElementById('active-list');
const completedList = document.getElementById('completed-list');
const activeCount = document.getElementById('active-count');
const completedCount = document.getElementById('completed-count');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
const duplicateModal = document.getElementById('duplicate-modal');
const modalTaskText = document.getElementById('modal-task-text');
const modalLastDone = document.getElementById('modal-last-done');
const modalStatus = document.getElementById('modal-status');
const modalCreateAnyway = document.getElementById('modal-create-anyway');
const modalCancel = document.getElementById('modal-cancel');

let currentTab = 'active';
let pendingTask = null;

document.addEventListener('DOMContentLoaded', fetchTasks);

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
    });
});

async function switchTab(tab) {
    currentTab = tab;
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    tabPanels.forEach(p => p.classList.toggle('active', p.id === `${tab}-panel`));
    await fetchTasks();
}

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
    activeList.innerHTML = '';
    completedList.innerHTML = '';
    let aCount = 0;
    let cCount = 0;
    tasks.forEach(task => {
        const li = createTaskElement(task);
        if (task.status === 'Active') {
            activeList.appendChild(li);
            aCount++;
        } else {
            completedList.appendChild(li);
            cCount++;
        }
    });
    activeCount.textContent = aCount;
    completedCount.textContent = cCount;

    if (currentTab === 'active') {
        document.getElementById('active-panel').style.display = 'block';
        document.getElementById('completed-panel').style.display = 'none';
    } else {
        document.getElementById('active-panel').style.display = 'none';
        document.getElementById('completed-panel').style.display = 'block';
    }
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.status === 'Completed' ? 'completed' : ''}`;
    li.dataset.id = task.id;
    const endAtDisplay = task.endAt ? formatDate(task.endAt) : '';
    li.innerHTML = `
        <div class="task-checkbox" onclick="toggleTaskStatus('${task.id}', '${task.status}')">
            <i class="fas fa-check"></i>
        </div>
        <div class="task-content">
            <div class="task-text">${escapeHtml(task.task)}</div>
            <div class="task-meta">
                <span class="task-date"><i class="fa-regular fa-calendar"></i> ${formatDate(task.createdAt)}</span>
                ${endAtDisplay ? `<span class="task-date end-date"><i class="fa-regular fa-calendar-check"></i> End: ${endAtDisplay}</span>` : ''}
            </div>
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
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return dateStr;
    }
}

todoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const task = taskInput.value.trim();
    const endAt = endAtInput ? endAtInput.value : '';
    if (!task) return;
    try {
        const checkResponse = await fetch(`${API_URL}/tasks/check-duplicate?task=${encodeURIComponent(task)}`);
        const checkResult = await checkResponse.json();
        if (checkResult.duplicate && checkResult.matches.length > 0) {
            pendingTask = { task, endAt };
            const match = checkResult.matches[0];
            modalTaskText.textContent = match.task;
            modalLastDone.textContent = match.endAt || match.createdAt;
            modalStatus.textContent = match.status;
            duplicateModal.classList.add('show');
            return;
        }
        await createTask(task, endAt);
    } catch (error) {
        console.error('Error adding task:', error);
    }
});

async function createTask(task, endAt) {
    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task, endAt })
        });
        if (response.ok) {
            taskInput.value = '';
            if (endAtInput) endAtInput.value = '';
            fetchTasks();
        }
    } catch (error) {
        console.error('Error adding task:', error);
    }
}

modalCreateAnyway.addEventListener('click', async () => {
    duplicateModal.classList.remove('show');
    if (pendingTask) {
        await createTask(pendingTask.task, pendingTask.endAt);
        pendingTask = null;
    }
});

modalCancel.addEventListener('click', () => {
    duplicateModal.classList.remove('show');
    pendingTask = null;
});

duplicateModal.addEventListener('click', (e) => {
    if (e.target === duplicateModal) {
        duplicateModal.classList.remove('show');
        pendingTask = null;
    }
});

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
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
        const response = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
        if (response.ok) fetchTasks();
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}
