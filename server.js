const express = require("express");
const cors = require("cors");
const https = require("https");
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
const PING_INTERVAL_SEC = 300; // 5 minutes
const PING_TIMEOUT_MS = 8000;

// ── In-memory store ──
const serviceState = SERVICES.map((svc) => ({
  ...svc,
  history: [], // [{ timestamp: ISO_string, success: bool }]
}));

// ── Ping logic ──
function pingService(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const req = http.get({
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
        path: parsed.pathname + parsed.search,
        timeout: PING_TIMEOUT_MS,
        headers: { "User-Agent": "FinFlowStatusPinger/1.0" },
      }, (res) => {
        // Consume response data to free up memory
        res.resume();
        res.on("end", () => resolve(res.statusCode >= 200 && res.statusCode < 400));
      });

      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
      req.on("error", () => resolve(false));
    } catch {
      resolve(false);
    }
  });
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
    const isUp = lastCheck ? lastCheck.success : true; // no check yet → assume up

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
    // Check if some but not all are down
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

// Run initial check, then start interval
checkAllServices().then(() => {
  setInterval(checkAllServices, PING_INTERVAL_SEC * 1000);
});

app.listen(PORT, () => {
  console.log(`FinFlow Status Page running on port ${PORT}`);
});
