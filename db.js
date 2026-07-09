const path = require('path);
const fs = require('fs');
const os = require('os');

const IS_SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const USE_SUPABASE = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

function getSupabaseUrl() {
    const url = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
    if (!url) return '';
    if (url.includes('supabase.com/dashboard')) {
        const match = url.match(/project\/([a-z0-9]+)/i);
        if (match) return `https://${match[1]}.supabase.co`;
    }
    return url;
}

function isValidSupabaseUrl(url) {
    return /^https:\/\/[a-z0-9]+\.supabase\.co$/i.test(url);
}

function getDataDir() {
    if (process.env.DATA_DIR) return process.env.DATA_DIR;
    if (IS_SERVERLESS) return os.tmpdir();
    return __dirname;
}

const EXCEL_FILE = path.join(getDataDir(), 'tasks.xlsx');

const COLUMNS = [
    { header: 'ID',           key: 'id',          width: 16 },
    { header: 'Task',         key: 'task',         width: 45 },
    { header: 'Assignee',     key: 'assignee',     width: 22 },
    { header: 'Status',       key: 'status',       width: 14 },
    { header: 'Created At',   key: 'createdAt',    width: 24 },
    { header: 'Scheduled At', key: 'scheduledAt',  width: 24 },
    { header: 'Completed At', key: 'completedAt',  width: 24 },
    { header: 'Deleted At',   key: 'deletedAt',    width: 24 },
    { header: 'Record',       key: 'record',       width: 10 }
];

const COL = {
    id: 1, task: 2, assignee: 3, status: 4,
    createdAt: 5, scheduledAt: 6, completedAt: 7,
    deletedAt: 8, record: 9
};

function nowStr() {
    return new Date().toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
}

function formatIncoming(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const d = new Date(raw.trim().replace(' ', 'T'));
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
}

function normalizeTaskText(text) {
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function rowToTask(row) {
    return {
        id:          row.getCell(COL.id).value,
        task:        row.getCell(COL.task).value,
        assignee:    row.getCell(COL.assignee).value || '',
        status:      row.getCell(COL.status).value,
        createdAt:   row.getCell(COL.createdAt).value || '',
        scheduledAt: row.getCell(COL.scheduledAt).value || '',
        completedAt: row.getCell(COL.completedAt).value || '',
        deletedAt:   row.getCell(COL.deletedAt).value || '',
        record:      row.getCell(COL.record).value || 'PRE'
    };
}

function dbRowToTask(row) {
    return {
        id:          row.id,
        task:        row.task,
        assignee:    row.assignee || '',
        status:      row.status,
        createdAt:   row.created_at || '',
        scheduledAt: row.scheduled_at || '',
        completedAt: row.completed_at || '',
        deletedAt:   row.deleted_at || '',
        record:      row.record || 'PRE'
    };
}

function taskToDbRow(task) {
    return {
        id:           task.id,
        task:         task.task,
        assignee:     task.assignee || '',
        status:       task.status,
        created_at:   task.createdAt,
        scheduled_at: task.scheduledAt,
        completed_at: task.completedAt || '',
        deleted_at:   task.deletedAt || '',
        record:       task.record || 'PRE'
    };
}

// ── Supabase ──────────────────────────────────────────────────

let supabase = null;

function getSupabase() {
    if (!supabase) {
        const { createClient } = require('@supabase/supabase-js');
        const ws = require('ws');
        const url = getSupabaseUrl();
        if (!isValidSupabaseUrl(url)) {
            throw new Error(
                'Invalid SUPABASE_URL. Use https://YOUR_PROJECT_REF.supabase.co (not the dashboard URL).'
            );
        }
        supabase = createClient(
            url,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { realtime: { transport: ws } }
        );
    }
    return supabase;
}

async function supabaseListTasks() {
    const { data, error } = await getSupabase()
        .from('tasks')
        .select('*')
        .neq('record', 'DEL')
        .order('id', { ascending: false });
    if (error) throw error;
    return (data || []).map(dbRowToTask);
}

async function supabaseCheckDuplicate(task) {
    const { data, error } = await getSupabase()
        .from('tasks')
        .select('*')
        .neq('record', 'DEL');
    if (error) throw error;
    const normalizedQuery = normalizeTaskText(task);
    const matches = (data || [])
        .filter(row => row.task && normalizeTaskText(String(row.task)) === normalizedQuery)
        .map(dbRowToTask);
    return matches.length > 0 ? { duplicate: true, matches } : { duplicate: false };
}

async function supabaseCreateTask({ task, assignee, endAt }) {
    const id = Date.now().toString();
    const createdAt = nowStr();
    const scheduledAt = formatIncoming(endAt) || createdAt;
    const row = taskToDbRow({
        id, task, assignee: assignee || '', status: 'Active',
        createdAt, scheduledAt, completedAt: '', deletedAt: '', record: 'PRE'
    });
    const { error } = await getSupabase().from('tasks').insert(row);
    if (error) throw error;
    return { id, task, assignee: assignee || '', status: 'Active', createdAt, scheduledAt, completedAt: '' };
}

async function supabaseUpdateTask(id, { status, assignee }) {
    const updates = {};
    if (assignee !== undefined) updates.assignee = assignee;
    if (status !== undefined) {
        updates.status = status;
        updates.completed_at = status === 'Completed' ? nowStr() : '';
    }
    const { data, error } = await getSupabase()
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .neq('record', 'DEL')
        .select('id');
    if (error) throw error;
    if (!data || data.length === 0) return false;
    return true;
}

async function supabaseDeleteTask(id) {
    const { data, error } = await getSupabase()
        .from('tasks')
        .update({ record: 'DEL', deleted_at: nowStr() })
        .eq('id', id)
        .neq('record', 'DEL')
        .select('id');
    if (error) throw error;
    if (!data || data.length === 0) return false;
    return true;
}

// ── Excel (local fallback) ────────────────────────────────────

function getExcelJS() {
    return require('exceljs');
}

let excelReady = null;

function applyHeaderStyle(sheet) {
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FF000000' }, size: 11 };
    header.alignment = { horizontal: 'center', vertical: 'middle' };
    header.height = 22;
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

async function saveWorkbook(workbook) {
    if (IS_SERVERLESS) {
        const buffer = await workbook.xlsx.writeBuffer();
        await fs.promises.writeFile(EXCEL_FILE, buffer);
    } else {
        await workbook.xlsx.writeFile(EXCEL_FILE);
    }
}

async function loadWorkbook() {
    const ExcelJS = getExcelJS();
    const workbook = new ExcelJS.Workbook();
    if (IS_SERVERLESS) {
        const data = await fs.promises.readFile(EXCEL_FILE);
        await workbook.xlsx.load(data);
    } else {
        await workbook.xlsx.readFile(EXCEL_FILE);
    }
    return workbook;
}

async function initExcel() {
    const dataDir = path.dirname(EXCEL_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(EXCEL_FILE)) {
        const ExcelJS = getExcelJS();
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Tasks');
        sheet.columns = COLUMNS;
        applyHeaderStyle(sheet);
        await saveWorkbook(workbook);
        console.log('Created new tasks.xlsx at', EXCEL_FILE);
    }
}

async function getTaskSheet() {
    await initExcel();
    const workbook = await loadWorkbook();
    const sheet = workbook.getWorksheet('Tasks');
    const keys = (sheet.columns || []).map(c => c.key);
    if (!keys.includes('record') || !keys.includes('deletedAt')) {
        sheet.columns = COLUMNS;
        applyHeaderStyle(sheet);
    }
    return { workbook, sheet };
}

async function excelListTasks() {
    const { sheet } = await getTaskSheet();
    const tasks = [];
    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        if ((row.getCell(COL.record).value || 'PRE') === 'DEL') return;
        tasks.push(rowToTask(row));
    });
    return tasks.reverse();
}

async function excelCheckDuplicate(task) {
    const { sheet } = await getTaskSheet();
    const normalizedQuery = normalizeTaskText(task);
    const matches = [];
    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        if ((row.getCell(COL.record).value || 'PRE') === 'DEL') return;
        const existingTask = row.getCell(COL.task).value;
        if (existingTask && normalizeTaskText(String(existingTask)) === normalizedQuery) {
            matches.push(rowToTask(row));
        }
    });
    return matches.length > 0 ? { duplicate: true, matches } : { duplicate: false };
}

async function excelCreateTask({ task, assignee, endAt }) {
    const { workbook, sheet } = await getTaskSheet();
    const id = Date.now().toString();
    const createdAt = nowStr();
    const scheduledAt = formatIncoming(endAt) || createdAt;
    sheet.addRow({
        id, task,
        assignee: assignee || '',
        status: 'Active',
        createdAt,
        scheduledAt,
        completedAt: '',
        deletedAt: '',
        record: 'PRE'
    });
    await saveWorkbook(workbook);
    return { id, task, assignee: assignee || '', status: 'Active', createdAt, scheduledAt, completedAt: '' };
}

async function excelUpdateTask(id, { status, assignee }) {
    const { workbook, sheet } = await getTaskSheet();
    let found = false;
    sheet.eachRow((row) => {
        if (!row.getCell(COL.id).value) return;
        if (row.getCell(COL.id).value.toString() !== id.toString()) return;
        if (assignee !== undefined) row.getCell(COL.assignee).value = assignee;
        if (status !== undefined) {
            row.getCell(COL.status).value = status;
            row.getCell(COL.completedAt).value = status === 'Completed' ? nowStr() : '';
        }
        found = true;
    });
    if (!found) return false;
    await saveWorkbook(workbook);
    return true;
}

async function excelDeleteTask(id) {
    const { workbook, sheet } = await getTaskSheet();
    let found = false;
    sheet.eachRow((row) => {
        if (!row.getCell(COL.id).value) return;
        if (row.getCell(COL.id).value.toString() !== id.toString()) return;
        row.getCell(COL.record).value = 'DEL';
        row.getCell(COL.deletedAt).value = nowStr();
        found = true;
    });
    if (!found) return false;
    await saveWorkbook(workbook);
    return true;
}

// ── Public API ────────────────────────────────────────────────

async function initDb() {
    if (USE_SUPABASE) return;
    await initExcel();
}

function getStorageInfo() {
    const url = getSupabaseUrl();
    return {
        storage: USE_SUPABASE ? 'supabase' : 'excel',
        persistent: USE_SUPABASE && isValidSupabaseUrl(url),
        supabaseUrl: USE_SUPABASE ? url : null,
        excelFile: USE_SUPABASE ? null : EXCEL_FILE
    };
}

module.exports = {
    initDb,
    getStorageInfo,
    listTasks: USE_SUPABASE ? supabaseListTasks : excelListTasks,
    checkDuplicate: USE_SUPABASE ? supabaseCheckDuplicate : excelCheckDuplicate,
    createTask: USE_SUPABASE ? supabaseCreateTask : excelCreateTask,
    updateTask: USE_SUPABASE ? supabaseUpdateTask : excelUpdateTask,
    deleteTask: USE_SUPABASE ? supabaseDeleteTask : excelDeleteTask
};
