# Task Tracker

A premium task management application synced with Excel. Track active and completed tasks with automatic duplicate detection, end date tracking, and persistent Excel storage.

## Features

- **Tabbed Interface**: Separate views for Active and Completed tasks
- **End Date Tracking**: Optional end date for each task
- **Smart Duplicate Detection**: Case-insensitive duplicate checking with confirmation modal
- **Excel Sync**: All data persisted in `tasks.xlsx` with bold headers
- **Task Management**: Create, complete, reactivate, and delete tasks
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Database**: Excel file (`tasks.xlsx`) via ExcelJS

## Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

1. Start the server:
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

2. Open browser and navigate to `http://localhost:3000`

## How to Use

### Adding Tasks
- Enter task name in the input field
- Optionally select an end date
- Click "Add Task" or press Enter
- If a similar task exists, you'll get a confirmation prompt

### Managing Tasks
- Click the checkbox to toggle between Active and Completed
- Click the trash icon to delete a task
- Use tabs to switch between Active and Completed views

### End Date
- Set an optional end date when creating a task
- End date is automatically set when marking a task as Completed

## Project Structure

```
├── server.js          # Express server with Excel integration
├── package.json       # Dependencies and scripts
├── tasks.xlsx         # Excel file for data storage
├── public/
│   ├── index.html     # Main HTML structure
│   ├── app.js         # Frontend JavaScript logic
│   └── style.css      # Styles and theming
└── README.md          # This file
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | Get all tasks |
| POST | `/api/tasks` | Create a new task |
| PATCH | `/api/tasks/:id` | Update task status |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/api/tasks/check-duplicate?task=` | Check for duplicate tasks |

## Excel Structure

### Tasks Sheet
| Column | Description |
|--------|-------------|
| ID | Unique task identifier |
| Task | Task description |
| Status | Active or Completed |
| Created At | Timestamp of creation |
| End At | Optional end date |

### TaskHistory Sheet
| Column | Description |
|--------|-------------|
| ID | Unique history entry ID |
| TaskID | Reference to task |
| TaskText | Task description |
| Status | Status at time of action |
| Created At | Original creation timestamp |
| End At | End date if completed |
| Action | Created/Completed/Reactivated/Deleted |

## Scripts

- `npm start` - Start the server
- `npm run dev` - Start with nodemon (auto-reload on changes)

## Notes

- Close `tasks.xlsx` in Excel before starting the server to avoid file lock errors
- OneDrive sync may cause file locks; pause sync if experiencing issues
- Bold headers are automatically applied to Excel sheets