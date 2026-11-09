"use strict";

const http = require("node:http");

const fs = require("node:fs");

const fsp = require("node:fs/promises");

const path = require("node:path");

const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 3e3);

const PUBLIC_DIR = path.join(__dirname, "public");

const CONFIG_FILE = process.env.CONFIG_FILE || "/config/registry.json";

const DATA_DIR = process.env.DATA_DIR || "/data";

const STATE_FILE = path.join(DATA_DIR, "state.json");

const BACKUP_DIR = path.join(DATA_DIR, "backups");

const SECRET_FILE = path.join(DATA_DIR, "secret.key");

const KEEP_BACKUPS = 168;

const SESSION_DAYS = 180;

const MAX_TRIES = 5;

const LOCK_MINUTES = 15;

const GLOBAL_FAIL_LIMIT = 60;

const GLOBAL_PAUSE_MINUTES = 30;

const log = (...a) => console.log((new Date).toISOString(), ...a);

fs.mkdirSync(BACKUP_DIR, {
  recursive: true
});

let SECRET;

try {
  SECRET = fs.readFileSync(SECRET_FILE);
} catch {
  SECRET = crypto.randomBytes(32);
  fs.writeFileSync(SECRET_FILE, SECRET, {
    mode: 384
  });
  log("Created a new session secret");
}

let CONFIG = null;

function validateConfig(c) {
  if (!/^\d{4,10}$/.test(String(c.accessCode || ""))) throw new Error('"accessCode" must be 4 to 10 digits, in quotes');
  if (!Array.isArray(c.items)) throw new Error('"items" must be a list');
  const ids = new Set;
  for (const it of c.items) {
    if (!it.id || typeof it.id !== "string") throw new Error(`An item is missing its "id": ${JSON.stringify(it).slice(0, 80)}`);
    if (ids.has(it.id)) throw new Error(`Two items share the id "${it.id}". Every id must be different.`);
    ids.add(it.id);
    if (it.unlimited !== true && (!Number.isInteger(it.qty) || it.qty < 1)) throw new Error(`Item "${it.id}" needs a whole-number "qty" of 1 or more (or "unlimited": true)`);
  }
  if (!Array.isArray(c.games)) throw new Error('"games" must be a list');
  return c;
}

function loadConfig(reason) {
  try {
    const next = validateConfig(JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")));
    CONFIG = next;
    log(`Settings loaded (${reason}): ${next.items.length} items, ${next.games.length} games`);
  } catch (err) {
    if (!CONFIG) {
      console.error(`Can't start: problem in ${CONFIG_FILE}\n  ${err.message}`);
      process.exit(1);
    }
    console.error(`Ignored a change to ${CONFIG_FILE} because it has a problem. Still using the previous settings.\n  ${err.message}`);
  }
}

loadConfig("startup");

fs.watchFile(CONFIG_FILE, {
  interval: 2e3
}, (cur, prev) => {
  if (cur.mtimeMs !== prev.mtimeMs) loadConfig("file changed");
});

const EMPTY_STATE = () => ({
  version: 1,
  purchases: [],
  votes: [],
  donations: [],
  scores: [],
  players: {},
  extras: []
});

let STATE;

function restoreNewestBackup(why) {
  const latest = newestBackup();
  if (!latest) return null;
  log(`${why}. Restoring from backup ${latest}`);
  const restored = {
    ...EMPTY_STATE(),
    ...JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, latest), "utf8"))
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(restored, null, 1));
  return restored;
}

function readState() {
  if (!fs.existsSync(STATE_FILE)) {
    const restored = restoreNewestBackup("state.json is missing");
    if (restored) return restored;
    log("No saved data yet, starting fresh");
    return EMPTY_STATE();
  }
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    return {
      ...EMPTY_STATE(),
      ...s
    };
  } catch (err) {
    const aside = `${STATE_FILE}.unreadable-${Date.now()}`;
    fs.renameSync(STATE_FILE, aside);
    console.error(`state.json couldn't be read (${err.message}). Moved it to ${aside}`);
    return restoreNewestBackup("state.json was damaged") || EMPTY_STATE();
  }
}

const listBackups = () => fs.readdirSync(BACKUP_DIR).filter(f => /^state-.*\.json$/.test(f)).sort();

const newestBackup = () => listBackups().map(f => ({
  f: f,
  t: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs
})).sort((a, b) => a.t - b.t).map(x => x.f).pop();

STATE = readState();

const RENAMED_OPTIONS = [ {
  gameId: "looks",
  from: "potato",
  to: "jellybean"
} ];

function dedupeVotes() {
  const newest = new Map;
  for (const v of STATE.votes) {
    const k = `${v.gameId}|${String(v.name || "").replace(/\s+/g, " ").trim().toLowerCase()}`;
    const cur = newest.get(k);
    if (!cur || String(v.at || "") >= String(cur.at || "")) newest.set(k, v);
  }
  const before = STATE.votes.length;
  const keep = new Set(newest.values());
  STATE.votes = STATE.votes.filter(v => keep.has(v));
  return before - STATE.votes.length;
}

const deduped = dedupeVotes();

if (deduped) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(STATE, null, 1));
  log(`Removed ${deduped} duplicate guess(es) made under the same name`);
}

let renamed = 0;

for (const r of RENAMED_OPTIONS) for (const v of STATE.votes) if (v.gameId === r.gameId && v.value === r.from) {
  v.value = r.to;
  renamed++;
}

if (renamed) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(STATE, null, 1));
  log(`Updated ${renamed} guess(es) to renamed options`);
}

log(`Data loaded: ${STATE.purchases.length} purchases, ${STATE.votes.length} guesses, ${STATE.donations.length} donations, ${STATE.scores.length} high scores`);

let saving = Promise.resolve();

let lastBackupHour = "";

function save() {
  const snapshot = JSON.stringify(STATE, null, 1);
  saving = saving.then(async () => {
    const tmp = `${STATE_FILE}.tmp`;
    const fh = await fsp.open(tmp, "w");
    try {
      await fh.writeFile(snapshot);
      await fh.sync();
    } finally {
      await fh.close();
    }
    await fsp.rename(tmp, STATE_FILE);
    const hour = (new Date).toISOString().slice(0, 13).replace("T", "_");
    await fsp.copyFile(STATE_FILE, path.join(BACKUP_DIR, `state-${hour}.json`));
    if (hour !== lastBackupHour) {
      lastBackupHour = hour;
      for (const old of listBackups().slice(0, -KEEP_BACKUPS)) await fsp.unlink(path.join(BACKUP_DIR, old)).catch(() => {});
    }
  }).catch(err => console.error("SAVE FAILED:", err));
  return saving;
}

if (fs.existsSync(STATE_FILE)) fs.copyFileSync(STATE_FILE, path.join(BACKUP_DIR, `state-${(new Date).toISOString().slice(0, 13).replace("T", "_")}-start.json`));

const newId = p => p + crypto.randomBytes(6).toString("hex");

const hash = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 32);

const cleanText = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

const isFullName = v => v.split(" ").filter(w => /\p{L}/u.test(w)).length >= 2;

const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T00:00:00Z"));

function clientIp(req) {
  return String(req.headers["cf-connecting-ip"] || (req.headers["x-forwarded-for"] || "").split(",")[0] || req.socket.remoteAddress || "").trim();
}

function isHttps(req) {
  return req.headers["x-forwarded-proto"] === "https" || /"scheme":"https"/.test(req.headers["cf-visitor"] || "");
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${crypto.createHmac("sha256", SECRET).update(body).digest("base64url")}`;
}

function verify(token, days = SESSION_DAYS) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const good = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!p.d || Date.now() - p.t > days * 864e5) return null;
    return p;
  } catch {
    return null;
  }
}

function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function setSession(req, res, payload) {
  const secure = isHttps(req) ? "; Secure" : "";
  const value = payload ? sign(payload) : "";
  const age = payload ? SESSION_DAYS * 86400 : 0;
  const out = [ `reg=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure}` ];
  if (payload) out.push(`dev=${sign({
    d: payload.d,
    t: Date.now()
  })}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${2 * 365 * 86400}${secure}`);
  res.setHeader("Set-Cookie", out);
}

function knownDevice(req) {
  const c = cookies(req);
  for (const name of [ "dev", "reg" ]) {
    const v = verify(c[name], name === "dev" ? 730 : SESSION_DAYS);
    if (v) return v.d;
  }
  return null;
}

const deviceOf = req => {
  const s = verify(cookies(req).reg);
  return s ? hash(s.d) : null;
};

const failsByIp = new Map;

let globalFails = [];

let globalPauseUntil = 0;

function lockedFor(ip) {
  const now = Date.now();
  if (globalPauseUntil > now) return Math.ceil((globalPauseUntil - now) / 1e3);
  const f = failsByIp.get(ip);
  return f && f.until > now ? Math.ceil((f.until - now) / 1e3) : 0;
}

function recordFail(ip) {
  const now = Date.now();
  const f = failsByIp.get(ip) || {
    count: 0,
    until: 0
  };
  f.count += 1;
  if (f.count >= MAX_TRIES) {
    f.until = now + LOCK_MINUTES * 6e4;
    f.count = 0;
  }
  failsByIp.set(ip, f);
  globalFails = globalFails.filter(t => now - t < 36e5);
  globalFails.push(now);
  if (globalFails.length >= GLOBAL_FAIL_LIMIT) {
    globalPauseUntil = now + GLOBAL_PAUSE_MINUTES * 6e4;
    globalFails = [];
    log(`Lots of wrong codes in the last hour. Code entry paused for ${GLOBAL_PAUSE_MINUTES} minutes.`);
  }
  return f.until > now ? 0 : MAX_TRIES - f.count;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, f] of failsByIp) if (f.until < now && f.count === 0) failsByIp.delete(ip);
}, 6e5).unref();

const writesByDevice = new Map;

function tooManyWrites(device) {
  const now = Date.now();
  const list = (writesByDevice.get(device) || []).filter(t => now - t < 6e5);
  list.push(now);
  writesByDevice.set(device, list);
  return list.length > 80;
}

const BOARD_SIZE = 30;

const MAX_PLAYERS = 1e3;

const nameKey = n => cleanText(n, 60).toLowerCase();

const sortScores = () => STATE.scores.sort((a, b) => b.score - a.score || a.at.localeCompare(b.at));

const allResultsIn = () => CONFIG.games.length > 0 && CONFIG.games.every(hasAnswer);

function miniGameBonus() {
  const done = allResultsIn();
  if (done && STATE.miniFrozen) return {
    ...STATE.miniFrozen,
    frozen: true
  };
  const guessers = new Set(STATE.votes.map(v => nameKey(v.name)));
  const played = Object.entries(STATE.players).filter(([k]) => guessers.has(k)).map(([, p]) => p.name);
  const top = STATE.scores[0];
  return {
    played: played,
    champion: top && top.name ? top.name : null,
    frozen: done
  };
}

const gameTokens = new Map;

function publicConfig() {
  const {accessCode: accessCode, ...rest} = CONFIG;
  return rest;
}

function stateFor(device) {
  const liveItems = new Set(CONFIG.items.map(i => i.id));
  const liveGames = new Set(CONFIG.games.map(g => g.id));
  return {
    config: publicConfig(),
    purchases: STATE.purchases.filter(p => liveItems.has(p.itemId)).map(p => ({
      id: p.id,
      itemId: p.itemId,
      name: p.name,
      qty: p.qty,
      at: p.at,
      mine: p.device === device
    })),
    votes: STATE.votes.filter(v => liveGames.has(v.gameId)).map(v => ({
      id: v.id,
      gameId: v.gameId,
      name: v.name,
      value: v.value,
      mine: v.device === device
    })),
    donations: STATE.donations.map(d => ({
      id: d.id,
      name: d.name,
      amount: d.amount,
      at: d.at,
      mine: d.device === device
    })),
    scores: STATE.scores.map(x => ({
      id: x.id,
      name: x.name,
      score: x.score,
      at: x.at,
      mine: x.device === device
    })),
    extras: STATE.extras.map(x => ({
      id: x.id,
      what: x.what,
      name: x.name,
      at: x.at,
      mine: x.device === device
    })),
    miniGame: miniGameBonus()
  };
}

function cleanGuess(game, raw) {
  if (game.type === "choice") {
    const v = String(raw);
    return (game.options || []).some(o => o.v === v) ? v : null;
  }
  if (game.type === "date") {
    const v = String(raw);
    return isDate(v) && v >= game.min && v <= game.max ? v : null;
  }
  if (game.type === "number") {
    const n = Math.round(Number(raw) * 100) / 100;
    return Number.isFinite(n) && n >= game.min && n <= game.max ? n : null;
  }
  if (game.type === "time") {
    const v = String(raw);
    return /^([01]\d|2[0-3]):(00|30)$/.test(v) ? v : null;
  }
  return null;
}

const filledVal = v => v != null && v !== "";

const hasAnswer = g => !!CONFIG.results && (g.nameFor ? filledVal(CONFIG.results.name) && filledVal(CONFIG.results.sex) : filledVal(CONFIG.results[g.id]));

function send(res, status, data, extra = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extra
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", c => {
      size += c.length;
      if (size > 16e3) {
        reject(Object.assign(new Error("Too big"), {
          status: 413
        }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
      } catch {
        reject(Object.assign(new Error("Bad request"), {
          status: 400
        }));
      }
    });
    req.on("error", reject);
  });
}

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": [ "default-src 'self'", "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data: https:", "connect-src 'self'", "frame-ancestors 'none'", "base-uri 'none'", "form-action 'self'" ].join("; ")
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

async function serveStatic(req, res, urlPath) {
  const rel = urlPath === "/" ? "index.html" : decodeURIComponent(urlPath).replace(/^\/+/, "");
  const file = path.resolve(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(404);
    return res.end("Not found");
  }
  try {
    const data = await fsp.readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
      ...SECURITY_HEADERS
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404, SECURITY_HEADERS);
    res.end("Not found");
  }
}

const PHOTO_DIR = path.join(path.dirname(CONFIG_FILE), "photos");

async function servePhoto(req, res, urlPath) {
  if (!deviceOf(req)) {
    res.writeHead(401, SECURITY_HEADERS);
    return res.end("Please enter the code.");
  }
  const m = urlPath.match(/^\/photos\/(thumb|full)\/([\w.-]+\.(jpe?g|png|webp))$/i);
  if (!m) {
    res.writeHead(404, SECURITY_HEADERS);
    return res.end("Not found");
  }
  try {
    const file = path.join(PHOTO_DIR, m[1], m[2]);
    const st = await fsp.stat(file);
    const etag = `"${st.size.toString(36)}-${Math.round(st.mtimeMs).toString(36)}"`;
    const headers = {
      "Cache-Control": "private, no-cache",
      ETag: etag,
      ...SECURITY_HEADERS
    };
    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304, headers);
      return res.end();
    }
    const data = await fsp.readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME["." + m[3].toLowerCase()] || "image/jpeg",
      ...headers
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404, SECURITY_HEADERS);
    res.end("Not found");
  }
}

async function handleApi(req, res, url) {
  const route = `${req.method} ${url.pathname}`;
  const ip = clientIp(req);
  if (route === "GET /api/gate") return send(res, 200, {
    digits: String(CONFIG.accessCode).length
  });
  if (route === "POST /api/unlock") {
    const wait = lockedFor(ip);
    if (wait) return send(res, 429, {
      error: "Too many wrong tries.",
      retryAfter: wait
    });
    const {code: code} = await readJson(req);
    const real = Buffer.from(String(CONFIG.accessCode));
    const given = Buffer.from(String(code || "").padEnd(real.length).slice(0, real.length));
    if (String(code || "").length === real.length && /^\d+$/.test(String(code)) && crypto.timingSafeEqual(given, real)) {
      failsByIp.delete(ip);
      setSession(req, res, {
        d: knownDevice(req) || crypto.randomBytes(16).toString("hex"),
        t: Date.now()
      });
      return send(res, 200, {
        ok: true
      });
    }
    const left = recordFail(ip);
    const wait2 = lockedFor(ip);
    if (wait2) return send(res, 429, {
      error: "Too many wrong tries.",
      retryAfter: wait2
    });
    return send(res, 401, {
      error: "That code didn't match.",
      triesLeft: left
    });
  }
  if (route === "POST /api/lock") {
    setSession(req, res, null);
    return send(res, 200, {
      ok: true
    });
  }
  const device = deviceOf(req);
  if (!device) return send(res, 401, {
    error: "Please enter the code."
  });
  if (route === "GET /api/state") return send(res, 200, stateFor(device));
  if (req.method !== "GET" && tooManyWrites(device)) return send(res, 429, {
    error: "Slow down a little and try again in a few minutes."
  });
  if (route === "POST /api/purchases") {
    const body = await readJson(req);
    const item = CONFIG.items.find(i => i.id === body.itemId);
    if (!item) return send(res, 404, {
      error: "That item isn't on the list any more."
    });
    const qty = Number(body.qty);
    const bought = STATE.purchases.filter(p => p.itemId === item.id).reduce((s, p) => s + p.qty, 0);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return send(res, 400, {
      error: "Pick how many you bought."
    });
    if (item.unlimited !== true) {
      const left = item.qty - bought;
      if (left <= 0) return send(res, 409, {
        error: `Someone has just bought the last "${item.name}". The list has been refreshed.`,
        state: stateFor(device)
      });
      if (qty > left) return send(res, 409, {
        error: `Someone else just bought some too, so there's only room for ${left} more now. The list has been refreshed.`,
        state: stateFor(device)
      });
    }
    STATE.purchases.push({
      id: newId("p"),
      itemId: item.id,
      name: cleanText(body.name, 60),
      qty: qty,
      at: (new Date).toISOString(),
      device: device
    });
    await save();
    log(`Purchase: ${item.id} x${qty}`);
    return send(res, 200, stateFor(device));
  }
  let m = url.pathname.match(/^\/api\/purchases\/([\w-]+)$/);
  if (m && req.method === "DELETE") {
    const p = STATE.purchases.find(x => x.id === m[1]);
    if (!p) return send(res, 404, {
      error: "Already removed.",
      state: stateFor(device)
    });
    if (p.device !== device) return send(res, 403, {
      error: "You can only undo your own purchases."
    });
    STATE.purchases = STATE.purchases.filter(x => x.id !== p.id);
    await save();
    log(`Purchase undone: ${p.itemId}`);
    return send(res, 200, stateFor(device));
  }
  m = url.pathname.match(/^\/api\/votes\/([\w-]+)$/);
  if (m && req.method === "PUT") {
    const game = CONFIG.games.find(g => g.id === m[1]);
    if (!game) return send(res, 404, {
      error: "That game doesn't exist."
    });
    if (hasAnswer(game)) return send(res, 409, {
      error: "Guessing has closed for this one.",
      state: stateFor(device)
    });
    const body = await readJson(req);
    const name = cleanText(body.name, 60);
    if (!isFullName(name)) return send(res, 400, {
      error: "Please use your first and last name."
    });
    const value = cleanGuess(game, body.value);
    if (value === null) return send(res, 400, {
      error: "That guess isn't one of the options."
    });
    const key = name.toLowerCase();
    let vote = STATE.votes.find(v => v.gameId === game.id && String(v.name || "").replace(/\s+/g, " ").trim().toLowerCase() === key);
    if (vote) Object.assign(vote, {
      name: name,
      value: value,
      at: (new Date).toISOString(),
      device: device
    }); else STATE.votes.push(vote = {
      id: newId("v"),
      gameId: game.id,
      name: name,
      value: value,
      at: (new Date).toISOString(),
      device: device
    });
    dedupeVotes();
    await save();
    return send(res, 200, stateFor(device));
  }
  if (route === "POST /api/donations") {
    const body = await readJson(req);
    const amount = Math.round(Number(body.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount < 1 || amount > 1e5) return send(res, 400, {
      error: "Type how much you donated (at least $1)."
    });
    STATE.donations.push({
      id: newId("d"),
      name: cleanText(body.name, 60),
      amount: amount,
      at: (new Date).toISOString(),
      device: device
    });
    await save();
    log(`Donation logged: $${amount}`);
    return send(res, 200, stateFor(device));
  }
  m = url.pathname.match(/^\/api\/donations\/([\w-]+)$/);
  if (m && req.method === "DELETE") {
    const d = STATE.donations.find(x => x.id === m[1]);
    if (!d) return send(res, 404, {
      error: "Already removed.",
      state: stateFor(device)
    });
    if (d.device !== device) return send(res, 403, {
      error: "You can only remove your own donations."
    });
    STATE.donations = STATE.donations.filter(x => x.id !== d.id);
    await save();
    return send(res, 200, stateFor(device));
  }
  if (route === "POST /api/extras") {
    const body = await readJson(req);
    const what = cleanText(body.what, 120);
    if (!what) return send(res, 400, {
      error: "Tell us what you bought."
    });
    STATE.extras.push({
      id: newId("x"),
      what: what,
      name: cleanText(body.name, 60),
      at: (new Date).toISOString(),
      device: device
    });
    await save();
    log("Something else bought");
    return send(res, 200, stateFor(device));
  }
  m = url.pathname.match(/^\/api\/extras\/([\w-]+)$/);
  if (m && req.method === "DELETE") {
    const x = STATE.extras.find(e => e.id === m[1]);
    if (!x) return send(res, 404, {
      error: "Already removed.",
      state: stateFor(device)
    });
    if (x.device !== device) return send(res, 403, {
      error: "You can only remove your own entries."
    });
    STATE.extras = STATE.extras.filter(e => e.id !== x.id);
    await save();
    return send(res, 200, stateFor(device));
  }
  if (route === "POST /api/minigame/start") {
    const t = Date.now();
    gameTokens.set(device, t);
    return send(res, 200, {
      token: sign({
        d: device,
        t: t,
        n: crypto.randomBytes(4).toString("hex")
      })
    });
  }
  if (route === "POST /api/scores") {
    const body = await readJson(req);
    const ticket = verify(body.token, 1);
    if (!ticket || ticket.d !== device || gameTokens.get(device) !== ticket.t) return send(res, 400, {
      error: "That game couldn't be saved (it may already have been). Have another go!"
    });
    gameTokens.delete(device);
    const score = Number(body.score);
    const seconds = (Date.now() - ticket.t) / 1e3;
    if (!Number.isInteger(score) || score < 1 || score > seconds * 70 + 100) return send(res, 400, {
      error: "That score didn't add up, sorry."
    });
    const name = cleanText(body.name, 60);
    const key = name ? nameKey(name) : "";
    if (allResultsIn()) {
      if (!STATE.miniFrozen) {
        const b = miniGameBonus();
        STATE.miniFrozen = {
          played: b.played,
          champion: b.champion
        };
      }
    } else delete STATE.miniFrozen;
    if (key && !allResultsIn()) {
      const p = STATE.players[key];
      if (p) {
        p.name = name;
        p.best = Math.max(p.best, score);
      } else if (Object.keys(STATE.players).length < MAX_PLAYERS) STATE.players[key] = {
        name: name,
        best: score
      };
    }
    const at = (new Date).toISOString();
    const same = key ? STATE.scores.find(x => x.name && nameKey(x.name) === key) : null;
    let entry;
    if (same) {
      if (score > same.score) Object.assign(same, {
        score: score,
        at: at,
        device: device,
        name: name
      });
      entry = same;
    } else STATE.scores.push(entry = {
      id: newId("s"),
      name: name,
      score: score,
      at: at,
      device: device
    });
    sortScores();
    STATE.scores = STATE.scores.slice(0, BOARD_SIZE);
    const rank = STATE.scores.indexOf(entry) + 1;
    await save();
    log(`Mini game score: ${score}${rank ? ` (#${rank})` : " (not in the top 30)"}`);
    return send(res, 200, {
      ...stateFor(device),
      saved: {
        rank: rank,
        score: score,
        kept: same && same.score > score ? same.score : null
      }
    });
  }
  return send(res, 404, {
    error: "Not found"
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname === "/healthz") {
      res.writeHead(200, {
        "Content-Type": "text/plain"
      });
      return res.end("ok");
    }
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    if (url.pathname.startsWith("/photos/")) return await servePhoto(req, res, url.pathname);
    if (req.method === "GET" || req.method === "HEAD") return await serveStatic(req, res, url.pathname);
    res.writeHead(405);
    res.end();
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    if (!res.headersSent) send(res, status, {
      error: status === 500 ? "Something went wrong on our end. Please try again." : err.message
    }); else res.end();
  }
});

server.headersTimeout = 15e3;

server.requestTimeout = 3e4;

server.listen(PORT, () => log(`Baby registry running on port ${PORT}`));

async function shutdown(sig) {
  log(`${sig} received, finishing saves and stopping`);
  server.close();
  await saving;
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("SIGINT", () => shutdown("SIGINT"));
