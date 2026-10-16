import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { freshState } from "../src/game.js";
import {
  openStore,
  hashToken,
  passwordMatches,
  passwordHash,
  publicAccount,
} from "./store.js";
import {
  HttpError,
  credentials,
  integer,
  text,
  configData,
} from "./validation.js";

export function createApplication({
  directory,
  secureCookies = process.env.COOKIE_SECURE === "true",
} = {}) {
  const store = openStore(directory);
  const { db, audit, transaction, getConfig, getSave, savePlayer } = store;
  if (
    process.env.ADMIN_USERNAME &&
    process.env.ADMIN_PASSWORD &&
    !db.prepare("SELECT 1 FROM accounts WHERE role='admin'").get()
  )
    store.createAccount(
      {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      },
      "admin",
    );
  const attempts = new Map();
  const cookie = (token) =>
    `tq_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? 28800 : 0}${secureCookies ? "; Secure" : ""}`;
  const send = (res, status, data) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(data));
  };
  async function body(req) {
    if (!req.headers["content-type"]?.startsWith("application/json"))
      throw new HttpError(415, "Yêu cầu phải dùng application/json.");
    if (Number(req.headers["content-length"]) > 65536)
      throw new HttpError(413, "Dữ liệu gửi lên quá lớn.");
    let bytes = 0;
    const chunks = [];
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 65536) throw new HttpError(413, "Dữ liệu gửi lên quá lớn.");
      chunks.push(chunk);
    }
    try {
      const value = JSON.parse(Buffer.concat(chunks).toString());
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error();
      return value;
    } catch {
      throw new HttpError(400, "JSON không hợp lệ.");
    }
  }
  const sessionFor = (req) => {
    const token = (req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("tq_session="))
      ?.slice(11);
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const row = db
      .prepare(
        "SELECT a.id,a.username,a.role,a.banned,s.csrf,s.token_hash FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?",
      )
      .get(hashToken(token), Date.now());
    return row && !row.banned ? row : null;
  };
  const rateLimit = (req) => {
    const key = req.socket.remoteAddress;
    const current = attempts.get(key);
    const bucket =
      current && current.until > Date.now()
        ? current
        : { count: 0, until: Date.now() + 10 * 60 * 1000 };
    bucket.count++;
    attempts.set(key, bucket);
    if (attempts.size > 10000)
      for (const [ip, entry] of attempts)
        if (entry.until < Date.now()) attempts.delete(ip);
    if (bucket.count > 15)
      throw new HttpError(
        429,
        "Quá nhiều lần thử. Hãy chờ 10 phút rồi thử lại.",
      );
  };
  const originCheck = (req) => {
    if (req.headers.origin) {
      let origin;
      try {
        origin = new URL(req.headers.origin);
      } catch {
        throw new HttpError(403, "Nguồn yêu cầu không hợp lệ.");
      }
      if (origin.host !== req.headers.host)
        throw new HttpError(403, "Nguồn yêu cầu không hợp lệ.");
    }
  };
  async function api(req, res, url) {
    const path = url.pathname,
      method = req.method;
    if (!["GET", "HEAD"].includes(method)) originCheck(req);
    if (method === "GET" && path === "/api/health")
      return send(res, 200, { status: "ok" });
    if (method === "GET" && path === "/api/config")
      return send(res, 200, getConfig());
    if (method === "GET" && path === "/api/auth/session") {
      const session = sessionFor(req);
      return send(res, 200, {
        account: session ? publicAccount(session) : null,
        csrf: session?.csrf,
        adminConfigured: !!db
          .prepare("SELECT 1 FROM accounts WHERE role='admin'")
          .get(),
      });
    }
    if (
      method === "POST" &&
      ["/api/auth/login", "/api/auth/register"].includes(path)
    ) {
      rateLimit(req);
      const input = await body(req);
      let account;
      if (path.endsWith("register")) {
        if (getConfig().config.rules.maintenance)
          throw new HttpError(503, "Máy chủ đang bảo trì.");
        account = store.createAccount(input);
      } else {
        const value = credentials(input);
        account = db
          .prepare("SELECT * FROM accounts WHERE username=?")
          .get(value.username);
        const valid = passwordMatches(
          value.password,
          account?.password_hash ||
            "00000000000000000000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        );
        if (!account || !valid || account.banned)
          throw new HttpError(
            401,
            "Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa.",
          );
      }
      const old = sessionFor(req);
      if (old)
        db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
          old.token_hash,
        );
      const session = store.newSession(account);
      res.setHeader("Set-Cookie", cookie(session.token));
      if (account.role === "admin")
        audit(account.username, "admin.login", account.id);
      return send(res, 200, {
        account: publicAccount(account),
        csrf: session.csrf,
        save: getSave(account.id),
      });
    }
    const session = sessionFor(req);
    if (!session)
      throw new HttpError(
        401,
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      );
    if (
      !["GET", "HEAD"].includes(method) &&
      req.headers["x-csrf-token"] !== session.csrf
    )
      throw new HttpError(
        403,
        "Mã bảo vệ phiên không hợp lệ. Hãy tải lại trang.",
      );
    if (method === "POST" && path === "/api/auth/logout") {
      db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
        session.token_hash,
      );
      res.setHeader("Set-Cookie", cookie(""));
      return send(res, 200, { ok: true });
    }
    if (path.startsWith("/api/player/")) {
      if (getConfig().config.rules.maintenance && session.role !== "admin")
        throw new HttpError(503, "Máy chủ đang bảo trì.");
      if (method === "GET" && path === "/api/player/state")
        return send(res, 200, getSave(session.id));
      if (method === "PUT" && path === "/api/player/state") {
        const input = await body(req);
        return send(
          res,
          200,
          savePlayer(session.id, input.state, input.revision),
        );
      }
      if (method === "POST" && path === "/api/player/redeem")
        return send(res, 200, store.redeem(session.id, (await body(req)).code));
    }
    if (!path.startsWith("/api/admin/"))
      throw new HttpError(404, "Không tìm thấy chức năng.");
    if (session.role !== "admin")
      throw new HttpError(403, "Tài khoản không có quyền quản trị.");
    if (method === "GET" && path === "/api/admin/overview")
      return send(res, 200, {
        players: db
          .prepare("SELECT count(*) AS n FROM accounts WHERE role='player'")
          .get().n,
        banned: db
          .prepare(
            "SELECT count(*) AS n FROM accounts WHERE role='player' AND banned=1",
          )
          .get().n,
        giftcodes: db
          .prepare("SELECT count(*) AS n FROM gift_codes WHERE enabled=1")
          .get().n,
        configRevision: getConfig().revision,
        audit: db
          .prepare("SELECT * FROM audit ORDER BY id DESC LIMIT 10")
          .all(),
      });
    if (method === "GET" && path === "/api/admin/config")
      return send(res, 200, getConfig());
    if (method === "PUT" && path === "/api/admin/config") {
      const input = await body(req);
      const config = configData(input.config);
      integer(input.revision, 1, Number.MAX_SAFE_INTEGER);
      const result = db
        .prepare(
          "UPDATE config SET data=?,revision=revision+1,updated_at=? WHERE id=1 AND revision=?",
        )
        .run(JSON.stringify(config), Date.now(), input.revision);
      if (!result.changes)
        throw new HttpError(
          409,
          "Cấu hình đã thay đổi. Tải lại dữ liệu trước khi lưu.",
        );
      audit(session.username, "config.update", "game", {
        revision: input.revision + 1,
      });
      return send(res, 200, getConfig());
    }
    if (method === "GET" && path === "/api/admin/players") {
      const query = (url.searchParams.get("q") || "").slice(0, 32);
      const page = Math.max(
        1,
        Math.min(1000000, Number(url.searchParams.get("page")) || 1),
      );
      const rows = db
        .prepare(
          "SELECT a.id,a.username,a.banned,a.created_at,s.data,s.revision,s.updated_at FROM accounts a JOIN saves s ON s.account_id=a.id WHERE a.role='player' AND instr(lower(a.username),lower(?))>0 ORDER BY a.created_at DESC LIMIT 50 OFFSET ?",
        )
        .all(query, (page - 1) * 50);
      const total = db
        .prepare(
          "SELECT count(*) AS n FROM accounts WHERE role='player' AND instr(lower(username),lower(?))>0",
        )
        .get(query).n;
      return send(res, 200, {
        players: rows.map((row) => ({
          id: row.id,
          username: row.username,
          banned: !!row.banned,
          state: JSON.parse(row.data),
          revision: row.revision,
          updatedAt: row.updated_at,
        })),
        total,
        page,
      });
    }
    const playerPath = path.match(/^\/api\/admin\/players\/([a-f0-9-]+)$/);
    if (method === "PATCH" && playerPath) {
      const target = db
        .prepare("SELECT id,role FROM accounts WHERE id=?")
        .get(playerPath[1]);
      if (!target || target.role !== "player")
        throw new HttpError(404, "Không tìm thấy người chơi.");
      const input = await body(req);
      const old = getSave(target.id);
      integer(
        input.revision,
        1,
        Number.MAX_SAFE_INTEGER,
        "Phiên bản tiến trình",
      );
      if (input.banned !== undefined && typeof input.banned !== "boolean")
        throw new HttpError(400, "Trạng thái khóa không hợp lệ.");
      const next =
        input.reset === true ? freshState() : structuredClone(old.state);
      for (const key of ["gold", "jade", "scrolls", "stamina", "completed"])
        if (input[key] !== undefined)
          next[key] = integer(
            input[key],
            0,
            key === "stamina" ? 120 : key === "completed" ? 8 : 1000000000,
            key,
          );
      const result = transaction(() => {
        const saved = savePlayer(target.id, next, input.revision);
        if (input.banned !== undefined) {
          db.prepare("UPDATE accounts SET banned=? WHERE id=?").run(
            input.banned ? 1 : 0,
            target.id,
          );
          if (input.banned)
            db.prepare("DELETE FROM sessions WHERE account_id=?").run(
              target.id,
            );
        }
        audit(
          session.username,
          input.reset
            ? "player.reset"
            : input.banned !== undefined
              ? "player.status"
              : "player.resources",
          target.id,
          {
            gold: next.gold,
            jade: next.jade,
            scrolls: next.scrolls,
            stamina: next.stamina,
            completed: next.completed,
            ...(input.banned !== undefined ? { banned: input.banned } : {}),
          },
        );
        return saved;
      });
      return send(res, 200, result);
    }
    if (method === "GET" && path === "/api/admin/giftcodes")
      return send(res, 200, {
        codes: db
          .prepare(
            "SELECT * FROM gift_codes ORDER BY created_at DESC LIMIT 200",
          )
          .all(),
      });
    if (method === "POST" && path === "/api/admin/giftcodes") {
      const input = await body(req);
      const code = text(input.code, 32, "Giftcode").toUpperCase();
      if (!/^[A-Z0-9_-]{4,32}$/.test(code))
        throw new HttpError(
          400,
          "Giftcode gồm 4–32 chữ, số, gạch ngang hoặc gạch dưới.",
        );
      const rewards = ["gold", "jade", "scrolls", "stamina"].map((key) =>
        integer(input[key], 0, key === "stamina" ? 120 : 1000000, key),
      );
      if (!rewards.some(Boolean))
        throw new HttpError(400, "Giftcode cần ít nhất một phần thưởng.");
      const maxUses = integer(input.maxUses, 1, 1000000, "Lượt nhận tối đa");
      const expires = input.expiresAt ? Date.parse(input.expiresAt) : null;
      if (
        input.expiresAt &&
        (!Number.isFinite(expires) || expires <= Date.now())
      )
        throw new HttpError(400, "Hạn nhận phải ở trong tương lai.");
      if (db.prepare("SELECT id FROM gift_codes WHERE code=?").get(code))
        throw new HttpError(409, "Giftcode đã tồn tại.");
      const id = crypto.randomUUID();
      db.prepare(
        "INSERT INTO gift_codes(id,code,gold,jade,scrolls,stamina,max_uses,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
      ).run(id, code, ...rewards, maxUses, expires, Date.now());
      audit(session.username, "gift.create", id, { code });
      return send(res, 201, { id, code });
    }
    const giftPath = path.match(/^\/api\/admin\/giftcodes\/([a-f0-9-]+)$/);
    if (method === "PATCH" && giftPath) {
      const input = await body(req);
      if (typeof input.enabled !== "boolean")
        throw new HttpError(400, "Trạng thái không hợp lệ.");
      const result = db
        .prepare("UPDATE gift_codes SET enabled=? WHERE id=?")
        .run(input.enabled ? 1 : 0, giftPath[1]);
      if (!result.changes) throw new HttpError(404, "Không tìm thấy mã.");
      audit(session.username, "gift.status", giftPath[1], {
        enabled: input.enabled,
      });
      return send(res, 200, { ok: true });
    }
    if (method === "GET" && path === "/api/admin/audit")
      return send(res, 200, {
        entries: db
          .prepare("SELECT * FROM audit ORDER BY id DESC LIMIT 200")
          .all(),
      });
    if (method === "POST" && path === "/api/admin/password") {
      const input = await body(req);
      credentials({ username: session.username, password: input.newPassword });
      const row = db
        .prepare("SELECT password_hash FROM accounts WHERE id=?")
        .get(session.id);
      if (
        typeof input.currentPassword !== "string" ||
        input.currentPassword.length > 128 ||
        !passwordMatches(input.currentPassword, row.password_hash)
      )
        throw new HttpError(400, "Mật khẩu hiện tại không đúng.");
      transaction(() => {
        db.prepare("UPDATE accounts SET password_hash=? WHERE id=?").run(
          passwordHash(input.newPassword),
          session.id,
        );
        db.prepare("DELETE FROM sessions WHERE account_id=?").run(session.id);
        audit(session.username, "admin.password", session.id);
      });
      res.setHeader("Set-Cookie", cookie(""));
      return send(res, 200, { ok: true });
    }
    throw new HttpError(404, "Không tìm thấy chức năng.");
  }
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname.startsWith("/api/")) return await api(req, res, url);
      if (!["GET", "HEAD"].includes(req.method))
        throw new HttpError(405, "Phương thức không được hỗ trợ.");
      const root = resolve("dist");
      const filename = resolve(root, "." + decodeURIComponent(url.pathname));
      if (!filename.startsWith(root + sep) && filename !== root)
        throw new HttpError(404, "Không tìm thấy trang.");
      const file =
        existsSync(filename) && statSync(filename).isFile()
          ? filename
          : extname(url.pathname)
            ? null
            : resolve(root, "index.html");
      if (!file || !existsSync(file))
        throw new HttpError(
          404,
          "Chưa có bản build. Chạy npm run build trước.",
        );
      const mime =
        {
          ".html": "text/html; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".css": "text/css",
          ".svg": "image/svg+xml",
          ".png": "image/png",
          ".woff": "font/woff",
          ".woff2": "font/woff2",
        }[extname(file)] || "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": mime,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      });
      if (req.method === "HEAD") res.end();
      else createReadStream(file).pipe(res);
    } catch (error) {
      if (!res.headersSent)
        send(res, error.status || 500, {
          error: error.status
            ? error.message
            : "Lỗi máy chủ. Vui lòng thử lại.",
          ...(error.extra || {}),
        });
      else res.end();
    }
  });
  server.requestTimeout = 15000;
  return { server, store };
}
