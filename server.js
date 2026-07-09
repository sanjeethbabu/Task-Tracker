 const express = require('express);
const cors = require('cors');
const path = require('path');

if (!process.env.VERCEL) {
    require('dotenv').config();
}
const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/tasks', async (req, res) => {
    try {
        res.json(await db.listTasks());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tasks/check-duplicate', async (req, res) => {
    try {
        const { task } = req.query;
        if (!task) return res.json({ duplicate: false });
        res.json(await db.checkDuplicate(task));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const { task, assignee, endAt } = req.body;
        const created = await db.createTask({ task, assignee, endAt });
        res.status(201).json(created);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assignee } = req.body;
        const found = await db.updateTask(id, { status, assignee });
        if (!found) return res.status(404).json({ error: 'Task not found' });
        res.json({ message: 'Task updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const found = await db.deleteTask(id);
        if (!found) return res.status(404).json({ error: 'Task not found' });
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ ok: true, ...db.getStorageInfo() });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;

if (require.main === module) {
    db.initDb().then(() => {
        app.listen(port, () => {
            const info = db.getStorageInfo();
            console.log(`Server running at http://localhost:${port}`);
            console.log(`Storage: ${info.storage}${info.persistent ? ' (persistent)' : ''}`);
        });
    }).catch((err) => {
        console.error('Failed to start server:', err);
        process.exit(1);
    });
}
