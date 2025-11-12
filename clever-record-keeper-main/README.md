# Clever Record Keeper

A lightweight student records web application with a local Express + MongoDB backend and a React + Vite frontend. Supabase integration was removed; the project now persists data to a local MongoDB instance and exposes a simple REST API for student and class data.

## Key features

- Student CRUD (Create, Read, Update, Delete) via REST API
- Programmatic seeding of students across Class 1–10 (40–50 students per class) with rich metadata: address, parent contact, class teacher and subject heads
- Class-level metadata stored in `classes` collection (attendance rate, grade buckets, teacher/contact, totalStudents)
- Dashboard with class summary and performance visualizations (Chart.js)
- Development-ready: Vite dev server for the frontend and a Node/Express backend

## Tech stack

- Frontend: React + TypeScript + Vite
- Styling: Tailwind CSS
- Charts: Chart.js
- Backend: Node.js + Express
- Database: MongoDB (local)

## Prerequisites

- Node.js (14+ recommended)
- npm
- MongoDB running locally (default URI: `mongodb://localhost:27017`)

## Project layout (important paths)

- `server/` — Express backend, seeding scripts and utilities
- `src/` — React frontend source
  - `src/lib/storage.ts` — frontend storage layer that calls backend endpoints
  - `src/components/` — UI components (Dashboard, StudentList, PerformanceChart, etc.)

## Setup (PowerShell)

1. Open PowerShell and change into the project inner folder (this repo uses a nested folder structure):

```powershell
Set-Location -LiteralPath 'C:\Users\Downloads\clever-record-keeper-main\clever-record-keeper-main'
```

2. Install dependencies (if not already):

```powershell
npm install
```

3. Start the backend server (option A - npm script):

```powershell
npm run start:server
```

Or start directly with Node (option B):

```powershell
# Run from the same inner project folder
node server\index.js
```

"explanation":"Update README to emphasize MongoDB Compass demo and two-way visibility between website and MongoDB Compass.",
```markdown
# Clever Record Keeper — MongoDB Compass demo

This is a small, purpose-built demo that shows how a simple web UI and a local MongoDB database (viewable in MongoDB Compass) work together. The main goal of this repository is to demonstrate that changes made through the website are persisted to MongoDB and are immediately visible in MongoDB Compass — and vice versa: edits made in MongoDB Compass appear in the website when the data is reloaded.

> In short: this project demonstrates two-way visibility between the web UI and MongoDB (Compass). It's not a production product; it's a developer demo for working with a local MongoDB instance.

## Key features

- Student CRUD (Create, Read, Update, Delete) via a simple REST API
- Programmatic seeding of students across Class 1–10 (approx. 40–50 students per class) with richer metadata: address, parent contact, class teacher and subject heads
- Class-level metadata stored in the `classes` collection (attendance rate, grade buckets, teacher/contact, totalStudents)
- Dashboard with class summary and performance visualizations (Chart.js)
- Development-ready: Vite dev server for the frontend and a Node/Express backend that persists data to MongoDB

## Tech stack

- Frontend: React + TypeScript + Vite
- Styling: Tailwind CSS
- Charts: Chart.js
- Backend: Node.js + Express
- Database: MongoDB (local) — use MongoDB Compass to inspect the data live

## Prerequisites

- Node.js (14+ recommended)
- npm
- MongoDB running locally (default URI: `mongodb://localhost:27017`)

## Project layout (important paths)

- `server/` — Express backend, seeding scripts and utilities
- `src/` — React frontend source
  - `src/lib/storage.ts` — frontend storage layer that calls backend endpoints
  - `src/components/` — UI components (Dashboard, StudentList, PerformanceChart, etc.)

## Quick setup (PowerShell)

1. Change into the project inner folder (this repo uses a nested folder structure):

```powershell
Set-Location -LiteralPath 'C:\Users\Tejar\Downloads\clever-record-keeper-main\clever-record-keeper-main'
```

2. Install dependencies (if not already):

```powershell
npm install
```

3. Start the backend server (option A - npm script):

```powershell
npm run start:server
```

Or start directly with Node (option B):

```powershell
# Run from the same inner project folder
node server\index.js
```

4. Start the frontend dev server:

```powershell
npm run dev
```

Note: Vite will try a default port (5173 or 8080 depending on environment) and increment if the port is in use. Check the terminal to see the actual URL.

## Environment variables

The server defaults are suitable for local development. If needed, set these environment variables before starting the server:

- `MONGO_URI` — MongoDB connection string (default: `mongodb://localhost:27017`)
- `MONGO_DB` — Database name (defaults used in this project)
- `PORT` — HTTP port for Express (default: `4000`)
- Frontend: `VITE_API_BASE` — base URL for the backend (e.g. `http://localhost:4000`). Either set in the environment used by Vite or leave default.

## API (summary)

All endpoints are prefixed with `/api`.

- GET `/api/classes/meta` — returns seeded class metadata documents (className, address, teacher, parentContact, attendanceRate, gradeBuckets, totalStudents)
- GET `/api/classes` — aggregated classes overview (by class name)
- GET `/api/classes/:className/students` — students for a specific class
- GET `/api/students` — list all students
- POST `/api/students` — create a student (JSON body)
- PUT `/api/students/:id` — update a student
- DELETE `/api/students/:id` — delete a student

Example (PowerShell):

```powershell
# list classes meta
Invoke-RestMethod -Uri 'http://localhost:4000/api/classes/meta' -Method Get | ConvertTo-Json -Depth 5

# list first 3 students
Invoke-RestMethod -Uri 'http://localhost:4000/api/students' -Method Get | Select-Object -First 3 | ConvertTo-Json -Depth 5
```

## Seeding & utility scripts

From the project folder you can run:

- `node server/seed_classes.js` — upserts the 10 class metadata documents into the `classes` collection
- `node server/set_class_avg_96.js` — mass-updates student grades to a target average (useful for testing)
- `node server/checkMongo.js` — quick connectivity and sample document check

These scripts are intended for local development/testing only.

## Frontend notes

- The frontend uses the backend-only storage layer in `src/lib/storage.ts`. If your browser shows stale data, clear the localStorage key `crk_students` via DevTools → Application → Local Storage and reload.
- Changes you make in the web UI (Add / Edit / Delete students or classes) are persisted to MongoDB and are visible immediately in MongoDB Compass. Similarly, edits made directly in MongoDB Compass will appear in the website after a reload.

## Troubleshooting

- `npm ERR! enoent Could not read package.json` — you're running npm from the wrong folder. Change to the inner project folder:

```powershell
Set-Location -LiteralPath 'C:\Users\Tejar\Downloads\clever-record-keeper-main\clever-record-keeper-main'
```

- `EADDRINUSE` when starting the server — another process is using the port (default 4000). Identify and stop the process or change `PORT`.
- MongoDB connection errors — ensure MongoDB service is running locally and accessible using the `MONGO_URI` you provided.

## Development & contribution notes

- Aim for small, focused pull requests and include failing tests when changing behavior.
- If adding new endpoints, update `src/lib/storage.ts` to match the frontend contract and add a small test script under `server/tests/` to validate the route.

## What's been removed

This repository no longer contains Supabase integration — all persistence is handled by the local Express + MongoDB backend.

## Contact / Next steps

If you want me to:

- Wire the frontend dashboard to explicitly fetch `/api/classes/meta` and show a clickable class summary view, I can make the changes and verify components render the class data.
- Add automated tests or TypeScript types for the backend models.

Open an issue or request specific changes and I will implement them.

---
Produced: November 6, 2025
---

```
