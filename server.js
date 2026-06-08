 const express = require('express');
const cors = require('cors');
const ExcelJS = require('excel');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;
const EXCEL_FILE = path.join(__dirname, 'tasks.xlsx');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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

// Consistent datetime string for all stored timestamps
function nowStr() {
    return new Date().toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
}

// Parse client-sent "YYYY-MM-DD HH:MM" into the same display format as nowStr()
function formatIncoming(raw) {
    if (!raw || typeof raw !== 'string') return '';
    // Replace space separator with T so Node.js parses it as local time correctly
    const d = new Date(raw.trim().replace(' ', 'T'));
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
}

function applyHeaderStyle(sheet) {
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FF000000' }, size: 11 };
    header.alignment = { horizontal: 'center', vertical: 'middle' };
    header.height = 22;
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

async function initExcel() {
    if (!fs.existsSync(EXCEL_FILE)) {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Tasks');
        sheet.columns = COLUMNS;
        applyHeaderStyle(sheet);
        await workbook.xlsx.writeFile(EXCEL_FILE);
        console.log('Created new tasks.xlsx');
    }
}

function normalizeTaskText(text) {
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

async function getTaskSheet() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_FILE);
    const sheet = workbook.getWorksheet('Tasks');
    // Migrate if columns are outdated (missing new columns)
    const keys = (sheet.columns || []).map(c => c.key);
    if (!keys.includes('record') || !keys.includes('deletedAt')) {
        sheet.columns = COLUMNS;
        applyHeaderStyle(sheet);
    }
    return { workbook, sheet };
}

// Column index helpers (1-based)
const COL = {
    id: 1, task: 2, assignee: 3, status: 4,
    createdAt: 5, scheduledAt: 6, completedAt: 7,
    deletedAt: 8, record: 9
};

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

// ── Routes ────────────────────────────────────────────────────

app.get('/api/tasks', async (req, res) => {
    try {
        const { sheet } = await getTaskSheet();
        const tasks = [];
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const record = row.getCell(COL.record).value || 'PRE';
            if (record === 'DEL') return;
            tasks.push(rowToTask(row));
        });
        res.json(tasks.reverse());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tasks/check-duplicate', async (req, res) => {
    try {
        const { task } = req.query;
        if (!task) return res.json({ duplicate: false });
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
        res.json(matches.length > 0 ? { duplicate: true, matches } : { duplicate: false });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const { task, assignee, endAt } = req.body;
        const { workbook, sheet } = await getTaskSheet();
        const id = Date.now().toString();
        const createdAt   = nowStr();
        const scheduledAt = formatIncoming(endAt) || createdAt;  // same format as createdAt
        sheet.addRow({
            id, task,
            assignee:    assignee || '',
            status:      'Active',
            createdAt,
            scheduledAt,
            completedAt: '',
            deletedAt:   '',
            record:      'PRE'
        });
        await workbook.xlsx.writeFile(EXCEL_FILE);
        res.status(201).json({ id, task, assignee: assignee || '', status: 'Active', createdAt, scheduledAt, completedAt: '' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assignee } = req.body;
        const { workbook, sheet } = await getTaskSheet();
        let found = false;
        sheet.eachRow((row) => {
            if (!row.getCell(COL.id).value) return;
            if (row.getCell(COL.id).value.toString() !== id.toString()) return;
            if (assignee !== undefined) row.getCell(COL.assignee).value = assignee;
            if (status !== undefined) {
                row.getCell(COL.status).value = status;
                if (status === 'Completed') {
                    row.getCell(COL.completedAt).value = nowStr();
                } else if (status === 'Active') {
                    row.getCell(COL.completedAt).value = '';
                }
            }
            found = true;
        });
        if (!found) return res.status(404).json({ error: 'Task not found' });
        await workbook.xlsx.writeFile(EXCEL_FILE);
        res.json({ message: 'Task updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { workbook, sheet } = await getTaskSheet();
        let found = false;
        sheet.eachRow((row) => {
            if (!row.getCell(COL.id).value) return;
            if (row.getCell(COL.id).value.toString() !== id.toString()) return;
            row.getCell(COL.record).value    = 'DEL';
            row.getCell(COL.deletedAt).value = nowStr();
            found = true;
        });
        if (!found) return res.status(404).json({ error: 'Task not found' });
        await workbook.xlsx.writeFile(EXCEL_FILE);
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

initExcel().then(() => {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
});
