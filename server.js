const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { Resend } = require("resend");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Resend SDK (email provider) ──
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@app.sadabmunshi.online";

app.use(cors());
app.use(express.json());
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
    url: "https://wa.sadabmunshi.online/",
  },
  {
    id: "telegram",
    displayName: "FinFlow Telegram",
    url: "https://https://tg.sadabmunshi.online//",
  },
];

const HISTORY_RETENTION_DAYS = 90;
const PING_INTERVAL_SEC = 180;

// ── In-memory store ──
const serviceState = SERVICES.map((svc) => ({
  ...svc,
  history: [],
  lastStatus: null,
}));

// ── Persistent subscriber storage ──
const SUBSCRIBERS_FILE = path.join(__dirname, "subscribers.json");

function loadSubscribers() {
  try {
    if (fs.existsSync(SUBSCRIBERS_FILE)) {
      const data = fs.readFileSync(SUBSCRIBERS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("Failed to load subscribers.json:", err.message);
  }
  return [];
}

function saveSubscribers() {
  try {
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save subscribers.json:", err.message);
  }
}

const subscribers = loadSubscribers();

function isValidEmail(email) {
  if (typeof email !== "string" || email.length > 254) return false;
  // Simpler regex to avoid ReDoS - checks basic structure only
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length > 64 || !domain) return false;
  return /^[^\s@]+$/.test(local) && /^[^\s.][^\s@]*\.[^\s@]+$/.test(domain);
}

// ── Helper to extract email from subscriber entry ──
function getSubscriberEmail(subscriber) {
  return typeof subscriber === "string" ? subscriber : subscriber.email;
}

// ── Send status alert email to all subscribers ──
async function sendStatusAlert(serviceName, serviceUrl, newStatus) {
  if (subscribers.length === 0) return;

  const isUp = newStatus === true;
  const subject = isUp
    ? `✅ UP: ${serviceName} has recovered`
    : `🚨 DOWN: ${serviceName} is down`;
  const statusText = isUp ? "Recovered (UP)" : "Down (DOWN)";
  const statusColor = isUp ? "#16a34a" : "#dc2626";
  const statusBg = isUp ? "#f0fdf4" : "#fef2f2";
  const statusBadgeBg = isUp ? "#dcfce7" : "#fee2e2";
  const statusEmoji = isUp ? "✅" : "🚨";
  const statusIcon = isUp ? "🟢" : "🔴";
  const timestamp = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }) + " IST";

  const statusPageUrl = process.env.STATUS_PAGE_URL || "https://status.app.sadabmunshi.online";

  for (const subscriber of subscribers) {
    const email = getSubscriberEmail(subscriber);
    if (!email) continue;

    const unsubscribeUrl = `${statusPageUrl.replace(/\/$/, "")}/api/unsubscribe?email=${encodeURIComponent(email)}`;

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject,
        html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <!-- Header -->
        <tr>
          <td style="background-color:${statusColor};padding:24px 32px;text-align:center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="text-align:center;font-size:40px;line-height:1">${statusEmoji}</td></tr>
              <tr><td style="text-align:center;padding-top:12px;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px">
                FinFlow Status Alert
              </td></tr>
            </table>
          </td>
        </tr>
        <!-- Status Badge -->
        <tr>
          <td style="padding:28px 32px 0;text-align:center">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto">
              <tr><td style="background-color:${statusBadgeBg};color:${statusColor};font-size:14px;font-weight:700;padding:6px 18px;border-radius:20px;letter-spacing:0.3px;text-transform:uppercase">
                ${statusIcon} ${isUp ? "Service Recovered" : "Service Down"}
              </td></tr>
            </table>
          </td>
        </tr>
        <!-- Service Name -->
        <tr>
          <td style="padding:20px 32px 0;text-align:center">
            <span style="font-size:24px;font-weight:700;color:#18181b">${serviceName}</span>
          </td>
        </tr>
        <!-- Divider -->
        <tr><td style="padding:20px 32px 0"><hr style="border:none;border-top:1px solid #e4e4e7;margin:0"></td></tr>
        <!-- Details Table -->
        <tr>
          <td style="padding:20px 32px 0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${statusBg};border-radius:8px;padding:16px">
              <tr>
                <td style="padding:8px 16px;color:#71717a;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:110px;vertical-align:top">Status</td>
                <td style="padding:8px 16px;color:${statusColor};font-size:15px;font-weight:700">${statusText}</td>
              </tr>
              <tr><td colspan="2" style="padding:0 16px"><hr style="border:none;border-top:1px solid #e4e4e7;margin:0"></td></tr>
              <tr>
                <td style="padding:8px 16px;color:#71717a;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:110px;vertical-align:top">Service</td>
                <td style="padding:8px 16px;color:#18181b;font-size:15px">${serviceName}</td>
              </tr>
              <tr><td colspan="2" style="padding:0 16px"><hr style="border:none;border-top:1px solid #e4e4e7;margin:0"></td></tr>
              <tr>
                <td style="padding:8px 16px;color:#71717a;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:110px;vertical-align:top">Detected</td>
                <td style="padding:8px 16px;color:#18181b;font-size:15px">${timestamp}</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- CTA Button -->
        <tr>
          <td style="padding:28px 32px 0;text-align:center">
            <a href="${statusPageUrl}" target="_blank" style="display:inline-block;background-color:${statusColor};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px">
              View Status Page
            </a>
          </td>
        </tr>
        <!-- Divider -->
        <tr><td style="padding:28px 32px 0"><hr style="border:none;border-top:1px solid #e4e4e7;margin:0"></td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px 28px;text-align:center">
            <p style="margin:0 0 12px;font-size:12px;color:#a1a1aa;line-height:1.5">
              You are receiving this because you subscribed to FinFlow status alerts.
            </p>
            <a href="${unsubscribeUrl}" target="_blank" style="display:inline-block;font-size:12px;color:#71717a;text-decoration:none;padding:6px 16px;border:1px solid #d4d4d8;border-radius:6px">
              Unsubscribe
            </a>
            <p style="margin:16px 0 0;font-size:11px;color:#d4d4d8">&copy; FinFlow Status</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
        `,
      });
    } catch (err) {
      console.error("Failed to send email to %s: %s", email, err.message);
    }
  }
}

// ── Robust ping ──
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
    return response.status >= 200 && response.status < 404;
  } catch {
    clearTimeout(timeout);
    return false;
  }
}

// ── 24-hour bar buckets ──
function get24hBars(history) {
  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000;
  const slotMs = windowMs / 30;
  const bars = [];
  const partialPcts = [];

  for (let i = 29; i >= 0; i--) {
    const slotEnd = now - i * slotMs;
    const slotStart = slotEnd - slotMs;

    const checksInSlot = history.filter(h => {
      const t = new Date(h.timestamp).getTime();
      return t >= slotStart && t < slotEnd;
    });

    if (checksInSlot.length === 0) {
      bars.push("unknown");
      partialPcts.push(null);
    } else {
      const upPct = checksInSlot.filter(h => h.success).length / checksInSlot.length;
      if (upPct === 1) {
        bars.push("up");
        partialPcts.push(null);
      } else if (upPct >= 0.5) {
        bars.push("partial");
        partialPcts.push(Math.round(upPct * 100));
      } else {
        bars.push("down");
        partialPcts.push(null);
      }
    }
  }
  return { bars, partialPcts };
}

// ── Last 24h checks helper ──
function getLast24hChecks(history) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return history.filter(h => new Date(h.timestamp).getTime() > cutoff);
}

async function checkAllServices() {
  for (const svc of serviceState) {
    const success = await pingService(svc.url);
    const entry = { timestamp: new Date().toISOString(), success };
    const prevStatus = svc.lastStatus;

    svc.history.push(entry);
    svc.lastStatus = success;

    // ── Bi-directional status change detection ──
    if (prevStatus !== null && prevStatus !== success) {
      const stateText = success ? "recovered to UP" : "changed to DOWN";
      console.log(
        `ALERT: ${svc.displayName} ${stateText} — notifying ${subscribers.length} subscriber(s)`
      );
      sendStatusAlert(svc.displayName, svc.url, success).catch((err) => {
        console.error(`Error sending status alerts for ${svc.displayName}:`, err.message);
      });
    }
  }
}

// ── Build API response (URLs never exposed) ──
function buildStatusResponse() {
  const services = serviceState.map((svc) => {
    const last24h = getLast24hChecks(svc.history);
    const total = last24h.length;
    const up = last24h.filter((h) => h.success).length;
    const uptimePercent = total > 0 ? ((up / total) * 100).toFixed(3) : "100.000";

    const history30 = svc.history.slice(-30);
    const { bars, partialPcts } = get24hBars(svc.history);

    const lastCheck = svc.history[svc.history.length - 1];
    const isUp = lastCheck ? lastCheck.success : true;

    return {
      name: svc.displayName,
      status: isUp ? "operational" : "down",
      uptimePercent,
      bars24h: bars,
      _barPcts: partialPcts,
      history: history30,
    };
  });

  const anyDown = services.some((s) => s.status === "down");
  const allDown = services.every((s) => s.status === "down");
  const allUnchecked = services.every((s) => s.history.length === 0);

  let overall;
  if (allUnchecked) {
    overall = "operational";
  } else if (allDown) {
    overall = "down";
  } else if (anyDown) {
    overall = "degraded";
  } else {
    overall = "operational";
  }

  return {
    lastUpdated: new Date().toISOString(),
    overall,
    services,
  };
}

// ── 90-day daily history ──
function buildDailyHistory(serviceState) {
  const totalDays = HISTORY_RETENTION_DAYS;
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const todayStart = new Date(now).setHours(0, 0, 0, 0);
  const days = [];

  for (let i = 0; i < totalDays; i++) {
    const dayStart = todayStart - i * dayMs;
    const dayEnd = dayStart + dayMs;

    const checksInDay = serviceState.history.filter(h => {
      const t = new Date(h.timestamp).getTime();
      return t >= dayStart && t < dayEnd;
    });

    const successChecks = checksInDay.filter(h => h.success).length;
    const totalChecks = checksInDay.length;
    const uptimePct = totalChecks > 0 ? ((successChecks / totalChecks) * 100).toFixed(3) : "100.000";

    days.push({
      date: new Date(dayStart).toISOString().slice(0, 10),
      totalChecks,
      successChecks,
      uptimePct,
      hasOutage: totalChecks > 0 && successChecks < totalChecks,
    });
  }

  return days;
}

// ── Hourly cleanup: prune checks older than 90 days ──
setInterval(() => {
  const cutoff = Date.now() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  serviceState.forEach(svc => {
    svc.history = svc.history.filter(
      h => new Date(h.timestamp).getTime() > cutoff
    );
  });
}, 3600000);

// ── Routes ──
app.get("/api/status", (_req, res) => {
  res.json(buildStatusResponse());
});

app.get("/history", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "history.html"));
});

app.get("/api/history", (req, res) => {
  const serviceName = req.query.service;
  if (!serviceName) {
    return res.status(400).json({ error: "Missing ?service= query parameter" });
  }

  const svc = serviceState.find(
    s => s.displayName.toLowerCase() === serviceName.toLowerCase()
  );
  if (!svc) {
    return res.status(404).json({ error: "Service not found" });
  }

  res.json(buildDailyHistory(svc));
});

app.get("/api/subscribers/count", (_req, res) => {
  res.json({ count: subscribers.length });
});

app.post("/api/subscribe", (req, res) => {
  const { email } = req.body || {};
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: "Invalid email address" });
  }
  const normalizedEmail = email.toLowerCase().trim();
  const exists = subscribers.some(
    (s) => getSubscriberEmail(s).toLowerCase() === normalizedEmail
  );
  if (exists) {
    return res.status(409).json({ success: false, message: "Already subscribed" });
  }
  subscribers.push({ email: normalizedEmail, services: "all", date: new Date().toISOString() });
  saveSubscribers();
  return res.json({ success: true, message: "Subscribed successfully" });
});

app.delete("/api/unsubscribe", (req, res) => {
  const { email } = req.body || {};
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: "Invalid email address" });
  }
  const normalizedEmail = email.toLowerCase().trim();
  const index = subscribers.findIndex(
    (s) => getSubscriberEmail(s).toLowerCase() === normalizedEmail
  );
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Email not found" });
  }
  subscribers.splice(index, 1);
  saveSubscribers();
  return res.json({ success: true, message: "Unsubscribed successfully" });
});

// Support GET-based unsubscribe from email links
app.get("/api/unsubscribe", (req, res) => {
  const email = req.query.email;
  if (!email || !isValidEmail(email)) {
    return res.status(400).send("Invalid email address");
  }
  const normalizedEmail = email.toLowerCase().trim();
  const index = subscribers.findIndex(
    (s) => getSubscriberEmail(s).toLowerCase() === normalizedEmail
  );
  if (index === -1) {
    return res.send("Email not found or already unsubscribed.");
  }
  subscribers.splice(index, 1);
  saveSubscribers();
  return res.send("You have been unsubscribed from FinFlow status alerts.");
});

// Initial check, then recurring interval
checkAllServices().then(() => {
  setInterval(checkAllServices, PING_INTERVAL_SEC * 1000);
});

app.listen(PORT, () => {
  console.log(`FinFlow Status Page running on port ${PORT}`);
});
