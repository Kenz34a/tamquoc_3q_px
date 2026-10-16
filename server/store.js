import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { defaultConfig, freshState } from "../src/game.js";
import {
  credentials,
  gameState,
  HttpError,
  integer,
  text,
} from "./validation.js";

export const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");
export function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function passwordMatches(password, hash) {
  const [salt, expected] = hash.split(":");
  const actual = scryptSync(password, salt, 64);
  const stored = Buffer.from(expected, "hex");
  return actual.length === stored.length && timingSafeEqual(actual, stored);
}
export const publicAccount = (row) => ({
  id: row.id,
  username: row.username,
  role: row.role,
  banned: !!row.banned,
});

export function openStore(
  directory = process.env.GAME_DATA_DIR || join(process.cwd(), ".data"),
) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(join(directory, "game.sqlite"));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, username TEXT UNIQUE COLLATE NOCASE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','player')), banned INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS saves (account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE, data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS config (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS gift_codes (id TEXT PRIMARY KEY, code TEXT UNIQUE COLLATE NOCASE NOT NULL, gold INTEGER NOT NULL, jade INTEGER NOT NULL, scrolls INTEGER NOT NULL, stamina INTEGER NOT NULL, max_uses INTEGER NOT NULL, uses INTEGER NOT NULL DEFAULT 0, expires_at INTEGER, enabled INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS redemptions (code_id TEXT NOT NULL REFERENCES gift_codes(id), account_id TEXT NOT NULL REFERENCES accounts(id), created_at INTEGER NOT NULL, PRIMARY KEY(code_id, account_id));
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, details TEXT NOT NULL, created_at INTEGER NOT NULL);
  `);
  db.prepare(
    "INSERT OR IGNORE INTO config(id,data,updated_at) VALUES(1,?,?)",
  ).run(JSON.stringify(defaultConfig()), Date.now());
  const transaction = (fn) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      db.exec("COMMIT");
      return value;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
  const audit = (actor, action, target, details = {}) =>
    db
      .prepare(
        "INSERT INTO audit(actor,action,target,details,created_at) VALUES(?,?,?,?,?)",
      )
      .run(actor, action, target, JSON.stringify(details), Date.now());
  const getConfig = () => {
    const row = db
      .prepare("SELECT data,revision,updated_at FROM config WHERE id=1")
      .get();
    return {
      config: JSON.parse(row.data),
      revision: row.revision,
      updatedAt: row.updated_at,
    };
  };
  function createAccount(body, role = "player") {
    const { username, password } = credentials(body);
    if (db.prepare("SELECT id FROM accounts WHERE username=?").get(username))
      throw new HttpError(409, "Tên đăng nhập đã tồn tại.");
    const id = randomUUID();
    const initial = body.initialState
      ? gameState(body.initialState)
      : freshState();
    transaction(() => {
      db.prepare(
        "INSERT INTO accounts(id,username,password_hash,role,created_at) VALUES(?,?,?,?,?)",
      ).run(id, username, passwordHash(password), role, Date.now());
      db.prepare(
        "INSERT INTO saves(account_id,data,updated_at) VALUES(?,?,?)",
      ).run(id, JSON.stringify(initial), Date.now());
      audit(
        username,
        role === "admin" ? "admin.create" : "player.register",
        id,
      );
    });
    return { id, username, role, banned: false };
  }
  function getSave(id) {
    const row = db
      .prepare("SELECT data,revision,updated_at FROM saves WHERE account_id=?")
      .get(id);
    if (!row) throw new HttpError(404, "Không tìm thấy người chơi.");
    return {
      state: JSON.parse(row.data),
      revision: row.revision,
      updatedAt: row.updated_at,
    };
  }
  function savePlayer(id, state, revision) {
    const clean = gameState(state);
    integer(revision, 1, Number.MAX_SAFE_INTEGER, "Phiên bản tiến trình");
    const result = db
      .prepare(
        "UPDATE saves SET data=?,revision=revision+1,updated_at=? WHERE account_id=? AND revision=?",
      )
      .run(JSON.stringify(clean), Date.now(), id, revision);
    if (!result.changes)
      throw new HttpError(409, "Tiến trình đã được cập nhật ở phiên khác.", {
        save: getSave(id),
      });
    return getSave(id);
  }
  function newSession(account) {
    db.prepare("DELETE FROM sessions WHERE expires_at<?").run(Date.now());
    const token = randomBytes(32).toString("base64url");
    const csrf = randomBytes(24).toString("base64url");
    db.prepare("INSERT INTO sessions VALUES(?,?,?,?)").run(
      hashToken(token),
      account.id,
      csrf,
      Date.now() + 8 * 60 * 60 * 1000,
    );
    return { token, csrf, account: publicAccount(account) };
  }
  function redeem(id, input) {
    const code = text(input, 32, "Giftcode").toUpperCase();
    return transaction(() => {
      const row = db.prepare("SELECT * FROM gift_codes WHERE code=?").get(code);
      if (!row || !row.enabled)
        throw new HttpError(404, "Giftcode không tồn tại hoặc đã bị tắt.");
      if (row.expires_at && row.expires_at <= Date.now())
        throw new HttpError(400, "Giftcode đã hết hạn.");
      if (
        db
          .prepare("SELECT 1 FROM redemptions WHERE code_id=? AND account_id=?")
          .get(row.id, id)
      )
        throw new HttpError(409, "Bạn đã nhận giftcode này.");
      if (row.uses >= row.max_uses)
        throw new HttpError(400, "Giftcode đã hết lượt nhận.");
      const save = getSave(id);
      for (const key of ["gold", "jade", "scrolls"])
        save.state[key] = Math.min(1000000000, save.state[key] + row[key]);
      save.state.stamina = Math.min(120, save.state.stamina + row.stamina);
      db.prepare("INSERT INTO redemptions VALUES(?,?,?)").run(
        row.id,
        id,
        Date.now(),
      );
      db.prepare("UPDATE gift_codes SET uses=uses+1 WHERE id=?").run(row.id);
      const updated = savePlayer(id, save.state, save.revision);
      audit(id, "gift.redeem", row.id);
      return updated;
    });
  }
  return {
    db,
    transaction,
    audit,
    getConfig,
    createAccount,
    getSave,
    savePlayer,
    newSession,
    redeem,
  };
}
