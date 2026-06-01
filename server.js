const express = require('express');
const cors = require('cors');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;
const EXCEL_FILE = path.join(__dirname, 'tasks.xlsx');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

async function initExcel() {
    if (!fs.existsSync(EXCEL_FILE)) {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Tasks');
        sheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Task', key: 'task', width: 40 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Created At', key: 'createdAt', width: 25 },
            { header: 'End At', key: 'endAt', width: 25 }
        ];
        sheet.getRow(1).font = { bold: true };
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
    const columns = sheet.columns || [];
    const hasEndAt = columns.some(col => col.key === 'endAt');
    if (!hasEndAt) {
        sheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Task', key: 'task', width: 40 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Created At', key: 'createdAt', width: 25 },
            { header: 'End At', key: 'endAt', width: 25 }
        ];
        sheet.getRow(1).font = { bold: true };
    }
    return { workbook, sheet };
}

app.get('/api/tasks', async (req, res) => {
    try {
        const { sheet } = await getTaskSheet();
        const tasks = [];
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                tasks.push({
                    id: row.getCell(1).value,
                    task: row.getCell(2).value,
                    status: row.getCell(3).value,
                    createdAt: row.getCell(4).value,
                    endAt: row.getCell(5) ? row.getCell(5).value : ''
                });
            }
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
            if (rowNumber > 1) {
                const existingTask = row.getCell(2).value;
                if (existingTask && normalizeTaskText(existingTask) === normalizedQuery) {
                    matches.push({
                        id: row.getCell(1).value,
                        task: existingTask,
                        status: row.getCell(3).value,
                        createdAt: row.getCell(4).value,
                        endAt: row.getCell(5) ? row.getCell(5).value : ''
                    });
                }
            }
        });
        res.json(matches.length > 0 ? { duplicate: true, matches } : { duplicate: false });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const { task, endAt } = req.body;
        const { workbook, sheet } = await getTaskSheet();
        const id = Date.now().toString();
        const createdAt = new Date().toLocaleString();
        sheet.addRow({ id, task, status: 'Active', createdAt, endAt: endAt || '' });
        await workbook.xlsx.writeFile(EXCEL_FILE);
        res.status(201).json({ id, task, status: 'Active', createdAt, endAt: endAt || '' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const { workbook, sheet } = await getTaskSheet();
        let found = false;
        sheet.eachRow((row, rowNumber) => {
            if (row.getCell(1).value && row.getCell(1).value.toString() === id.toString()) {
                row.getCell(3).value = status;
                if (status === 'Completed') {
                    row.getCell(5).value = new Date().toLocaleString();
                }
                found = true;
            }
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
        let rowIndexToDelete = -1;
        sheet.eachRow((row, rowNumber) => {
            if (row.getCell(1).value && row.getCell(1).value.toString() === id.toString()) {
                rowIndexToDelete = rowNumber;
            }
        });
        if (rowIndexToDelete === -1) return res.status(404).json({ error: 'Task not found' });
        sheet.spliceRows(rowIndexToDelete, 1);
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
