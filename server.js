const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// ── Service definitions (URLs stay server-side only) ──
const SERVICES = [
  {
    id: "web",
    displayName: "FinFlow Web",
    url: "https://app.sadabmunshi.online",
  },
  {
    id: "whatsapp",
    displayName: "FinFlow WhatsApp",
    url: "https://finflow-whatsapp-c1rc.onrender.com/",
  },
  {
    id: "telegram",
    displayName: "FinFlow Telegram",
    url: "https://bot-finflow.onrender.com/",
  },
];

const MAX_HISTORY = 30;
const PING_INTERVAL_SEC = 180; // 3 minutes

// ── In-memory store ──
const serviceState = SERVICES.map((svc) => ({
  ...svc,
  history: [], // [{ timestamp: ISO_string, success: bool }]
}));

// ── Robust ping with redirect follow, custom headers, 30s timeout ──
async function pingService(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "FinFlow-StatusPage/1.0",
        Accept: "*/*",
      },
    });
    clearTimeout(timeout);
    // Accept 200-403 as "up" (403 = server running but blocking bots)
    return response.status >= 200 && response.status < 404;
  } catch {
    clearTimeout(timeout);
    return false;
  }
}

async function checkAllServices() {
  for (const svc of serviceState) {
    const success = await pingService(svc.url);
    const entry = { timestamp: new Date().toISOString(), success };

    svc.history.push(entry);
    if (svc.history.length > MAX_HISTORY) {
      svc.history.shift();
    }
  }
}

// ── Build API response (URLs never exposed) ──
function buildStatusResponse() {
  const services = serviceState.map((svc) => {
    const total = svc.history.length;
    const up = svc.history.filter((h) => h.success).length;
    const uptimePercent = total > 0 ? ((up / total) * 100).toFixed(3) : "100.000";
    const lastCheck = svc.history[svc.history.length - 1];
    const isUp = lastCheck ? lastCheck.success : true;

    return {
      name: svc.displayName,
      status: isUp ? "operational" : "down",
      uptimePercent,
      history: svc.history,
    };
  });

  const anyDown = services.some((s) => s.status === "down");
  const allUnchecked = services.every((s) => s.history.length === 0);

  let overall;
  if (allUnchecked) {
    overall = "operational";
  } else if (anyDown) {
    const allDown = services.every((s) => s.status === "down");
    overall = allDown ? "down" : "degraded";
  } else {
    overall = "operational";
  }

  return {
    lastUpdated: new Date().toISOString(),
    overall,
    services,
  };
}

// ── Routes ──
app.get("/api/status", (_req, res) => {
  res.json(buildStatusResponse());
});

// Initial check, then recurring interval
checkAllServices().then(() => {
  setInterval(checkAllServices, PING_INTERVAL_SEC * 1000);
});

app.listen(PORT, () => {
  console.log(`FinFlow Status Page running on port ${PORT}`);
});
