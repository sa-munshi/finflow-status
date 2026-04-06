# 📋 FinFlow Status Page

A self-hosted, real-time service monitoring and status page for [FinFlow](https://app.sadabmunshi.online) services. Built with **Node.js** and **Express**, it pings configured services at regular intervals and displays their uptime in a clean, mobile-friendly dashboard.

---

## ✨ Features

- **Real-time monitoring** — automatically pings FinFlow Web, WhatsApp, and Telegram services every 3 minutes
- **24-hour uptime bars** — visual 30-slot bar chart showing service health over the last 24 hours
- **90-day history** — per-service daily uptime history with expandable detail rows
- **Overall system status** — hero banner shows Operational / Degraded / Down at a glance
- **Email subscription** — visitors can subscribe to status change notifications
- **Status change alerts** — server logs when a service transitions between UP and DOWN
- **Responsive UI** — works seamlessly on desktop and mobile (bottom-sheet modal on small screens)
- **No external database** — lightweight in-memory store with automatic 90-day data pruning
- **Deploy-ready** — ships with a `render.yaml` for one-click deployment on [Render](https://render.com)

---

## 🚀 Live Demo

👉 **[https://status.app.sadabmunshi.online/](https://status.app.sadabmunshi.online/)**

---

## 📁 Project Structure

```
finflow-status/
├── server.js          # Express server — API routes, service pinging, in-memory store
├── package.json       # Project metadata, scripts, and dependencies
├── render.yaml        # Render deployment blueprint
├── .gitignore         # Ignored files (node_modules, .env)
└── public/
    ├── index.html     # Main status dashboard (single-page app)
    └── history.html   # 90-day history page for individual services
```

---

## ⚙️ Installation & Local Setup

### Prerequisites

- [Node.js](https://nodejs.org/) **v18** or higher

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/sa-munshi/finflow-status.git
cd finflow-status

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

The app will be available at **http://localhost:3000**.

---

## 🔧 Environment Variables

Create a `.env` file in the project root (optional):

```env
# Server port (defaults to 3000)
PORT=3000

# Node environment
NODE_ENV=production
```

> **Note:** Service URLs are currently defined directly in `server.js` under the `SERVICES` array. To monitor different services, edit that array.

---

## 🧪 Scripts Available

| Script | Command | Description |
|--------|---------|-------------|
| **start** | `npm start` | Starts the production server (`node server.js`) |
| **dev** | `npm run dev` | Starts the development server (`node server.js`) |

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Serves the main status dashboard (`public/index.html`) |
| `GET` | `/history` | Serves the 90-day history page (`public/history.html`) |
| `GET` | `/api/status` | Returns current status of all services with 24h uptime bars and overall system health |
| `GET` | `/api/history?service=<name>` | Returns 90-day daily uptime history for a specific service (e.g., `?service=FinFlow Web`) |
| `GET` | `/api/subscribers/count` | Returns the current count of email subscribers |
| `POST` | `/api/subscribe` | Subscribes an email address to status notifications. Body: `{ "email": "user@example.com" }` |

### Example: `GET /api/status` response

```json
{
  "lastUpdated": "2026-04-06T15:00:00.000Z",
  "overall": "operational",
  "services": [
    {
      "name": "FinFlow Web",
      "status": "operational",
      "uptimePercent": "100.000",
      "bars24h": ["up", "up", "unknown", "..."],
      "history": [{ "timestamp": "...", "success": true }]
    }
  ]
}
```

---

## 🚀 Deployment

### Render (recommended)

This project includes a **`render.yaml`** blueprint for seamless deployment on [Render](https://render.com):

```yaml
services:
  - type: web
    name: finflow-status
    runtime: node
    buildCommand: npm install
    startCommand: node server.js
    plan: free
    envVars:
      - key: NODE_ENV
        value: production
```

**Deploy steps:**

1. Push this repository to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**
3. Connect your GitHub repo and select this repository
4. Render will auto-detect `render.yaml` and configure everything
5. Click **Apply** — your status page will be live in minutes

### Other platforms

Since this is a standard Node.js app, it can be deployed on any platform that supports Node.js (Heroku, Railway, Fly.io, VPS, etc.):

```bash
npm install
NODE_ENV=production node server.js
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** this repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Commit** your changes: `git commit -m "Add my feature"`
4. **Push** to the branch: `git push origin feature/my-feature`
5. **Open** a Pull Request

### Guidelines

- Keep the codebase simple and lightweight
- Test your changes locally before submitting
- Follow the existing code style
- Update this README if your changes affect the project setup or API

---

## 📄 License

This project is open source. Please check with the repository owner for specific license terms.

---

## 🙏 Acknowledgements

- [Express](https://expressjs.com/) — fast, minimalist web framework for Node.js
- [Render](https://render.com/) — cloud platform for hosting the status page
- [Inter](https://rsms.me/inter/) — typeface used in the dashboard UI
- [FinFlow](https://app.sadabmunshi.online) — the suite of services being monitored
