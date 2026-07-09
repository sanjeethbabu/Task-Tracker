# TicTrack — Team Presentation Script

> Use this script to walk your team through the project: the app itself, the CI/CD pipeline, and how Docker/Kubernetes fit in.

---

## 1. What is TicTrack? (2 min)

**TicTrack** is a task management app — think a lighter Trello/To-doist.

**Key features:**
- Add tasks with optional end dates
- Mark tasks complete / reactivate them
- Automatic duplicate detection
- Stats dashboard (productivity %, today's focus, etc.)
- Sidebar with clock, calendar, greeting

**Tech stack:**
- **Backend:** Node.js + Express server (`server.js`)
- **Frontend:** Vanilla HTML/CSS/JS (no framework — lightweight)
- **Storage:** Excel file (`tasks.xlsx`) via `exceljs` library
- **Optional cloud DB:** Supabase (if credentials are set)

**Architecture in one sentence:** A browser talks to an Express API that reads/writes an Excel file.

---

## 2. Project Structure (1 min)

```
├── server.js           # Express API server (port 3000)
├── db.js               # Database layer (Excel or Supabase)
├── public/
│   ├── index.html      # Main app UI
│   ├── app.js          # Frontend logic
│   ├── style.css       # Dark theme styling
│   └── github-actions-demo.html  # CI/CD explainer page
├── .github/workflows/
│   ├── todo.yml        # CI: push/PR to main
│   └── node.js.yml     # CI: multi-version Node test
├── vercel.json         # Vercel deployment config
└── render.yaml         # Render deployment config
```

---

## 3. CI/CD — GitHub Actions (3 min)

### What it does
Every time someone pushes code or opens a PR, GitHub Actions automatically runs checks.

### Two workflows

**`todo.yml`** — triggered on push/PR to `main`
- Checkout code → Setup Node 22.x → `npm ci` → `npm test` → start server & curl it

**`node.js.yml`** — triggered on any push/PR (any branch)
- Same but tests across Node 18.x, 20.x, and 22.x (matrix build)

### Why this matters

| Before (no CI) | After (with CI) |
|---|---|
| Manually run tests before pushing | Tests run automatically |
| Easy to forget testing | Can't merge with failing tests |
| No multi-version testing | Matrix catches Node version issues |
| Reviewers can't see test status | Green checkmarks on every PR |
| Broken code reaches production | Pipeline blocks broken deploys |

### Interactive demo
Open `public/github-actions-demo.html` in browser → click "Run Pipeline" to see the steps animate live.

---

## 4. GitHub Actions vs Jenkins (2 min)

**Why we chose GitHub Actions over Jenkins:**

| GitHub Actions | Jenkins |
|---|---|
| Zero infrastructure — runs on GitHub | Need to host & maintain a server |
| Free for public repos | Free but you pay for the server |
| YAML lives in the repo | Jenkinsfile + plugin config |
| Native PR integration | Needs webhook setup |
| No maintenance | Plugin updates, security patches |

**When would we use Jenkins?** If this project moves to an enterprise with:
- Compliance requirements (air-gapped network)
- Custom build agents (Windows + Linux + macOS)
- Complex multi-stage pipelines with approvals

**Verdict:** For a GitHub-hosted project, GitHub Actions is the obvious choice.

---

## 5. Can We Use Docker? (2 min)

**Yes, but we don't need to right now.**

Docker and GitHub Actions are **not alternatives** — they solve different things:
- **GitHub Actions** = the automation engine (runs the pipeline)
- **Docker** = the packaging format (bundles the app)

### Current approach (no Docker)
```yaml
- run: npm ci
- run: npm test
```
Works fine — Node.js runs directly on GitHub's Ubuntu runner.

### Docker approach (if needed)
```yaml
- run: docker build -t tictrack .
- run: docker run tictrack npm test
```
We'd add Docker when:
- We need exact environment parity (same OS packages, system deps)
- We're deploying to container platforms (ECS, K8s, Docker Compose)
- The project grows to include multiple services

**For TicTrack today:** Docker is unnecessary. Simple is better.

---

## 6. Phase 2 — Docker & Kubernetes (3 min)

If the project were to grow, here's how we'd scale:

### Docker packages the app
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```
One command: `docker run -p 3000:3000 tictrack` — and it runs identically everywhere.

### Kubernetes orchestrates it
- **Deployment:** 3 replicas, self-healing, rolling updates
- **Service:** Load balancer on port 80 → pods on port 3000
- **Secrets:** API keys injected via K8s Secrets, not baked into the image

### Full pipeline with Docker + K8s
```
Push code → CI tests pass → Docker build → Push to registry → K8s rolling update
```

---

## 7. Key Takeaways (1 min)

1. **TicTrack is a simple, functional task tracker** — Node.js + Excel, deployed on Vercel/Render
2. **GitHub Actions automates quality** — tests run on every push, no manual effort
3. **Docker is available but not needed** — direct npm install is sufficient for this scale
4. **Kubernetes is future-proofing** — we'd add it when traffic or service count grows
5. **The CI/CD explainer page** (`github-actions-demo.html`) is a living document — everyone can explore the pipelines interactively

---

## 8. Live Demo (5 min)

1. Open `http://localhost:3000` -> Add a task, complete it, check stats
2. Open `public/github-actions-demo.html` -> Click "Run Pipeline" + "Run Full Pipeline"
3. Show `.github/workflows/todo.yml` in GitHub
4. Show a passing PR check in the repo

---

*End of script — estimated time: ~15-20 min*
