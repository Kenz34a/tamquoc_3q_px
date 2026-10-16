import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore, passwordMatches } from "../server/store.js";
import { SAVE_KEY, freshState, format } from "../src/game.js";

test.describe.configure({ mode: "serial" });
const password = () => process.env.GAME_TEST_PASSWORD;
const unique = (prefix) => prefix + randomBytes(5).toString("hex");
async function adminLogin(request) {
  const response = await request.post("/api/auth/login", {
    data: { username: "testadmin", password: password() },
  });
  expect(response.status()).toBe(200);
  return response.json();
}
async function uiLogin(page) {
  await page.goto("/admin");
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("testadmin");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password());
  await page.getByRole("button", { name: "Vào trang quản trị" }).click();
  await expect(
    page.getByRole("heading", { name: "Tổng quan", exact: true }),
  ).toBeVisible();
}

test("server enforces admin roles, session cookies, CSRF, and logout", async ({
  request,
}) => {
  expect((await request.get("/api/admin/overview")).status()).toBe(401);
  const response = await request.post("/api/auth/register", {
    data: { username: unique("role"), password: password(), role: "admin" },
  });
  expect(response.status()).toBe(200);
  expect(response.headers()["set-cookie"]).toContain("HttpOnly");
  expect(response.headers()["set-cookie"]).toContain("SameSite=Lax");
  const player = await response.json();
  expect(player.account.role).toBe("player");
  expect(player.account).not.toHaveProperty("password_hash");
  expect((await request.get("/api/admin/overview")).status()).toBe(403);
  expect(
    (
      await request.put("/api/player/state", {
        data: { state: freshState(), revision: 1 },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/auth/logout", {
        headers: {
          "x-csrf-token": player.csrf,
          Origin: "https://untrusted.example",
        },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/auth/logout", {
        headers: { "x-csrf-token": player.csrf },
        data: {},
      })
    ).status(),
  ).toBe(200);
  expect((await request.get("/api/player/state")).status()).toBe(401);
});

test("admin edits real player resources, rejects stale writes, and bans sessions", async ({
  request,
  playwright,
  baseURL,
}) => {
  const playerRequest = await playwright.request.newContext({ baseURL });
  try {
    const registration = await playerRequest.post("/api/auth/register", {
      data: { username: unique("player"), password: password() },
    });
    const player = await registration.json();
    const admin = await adminLogin(request);
    const target = `/api/admin/players/${player.account.id}`;
    expect(
      (
        await request.patch(target, { data: { gold: 99, revision: 1 } })
      ).status(),
    ).toBe(403);
    const changed = await request.patch(target, {
      headers: { "x-csrf-token": admin.csrf },
      data: { gold: 234567, jade: 888, revision: 1 },
    });
    expect(changed.status()).toBe(200);
    expect((await changed.json()).state.gold).toBe(234567);
    expect(
      (
        await request.patch(target, {
          headers: { "x-csrf-token": admin.csrf },
          data: { gold: 1, revision: 1 },
        })
      ).status(),
    ).toBe(409);
    const saved = await (await playerRequest.get("/api/player/state")).json();
    expect(saved.state.gold).toBe(234567);
    expect(
      (
        await playerRequest.put("/api/player/state", {
          headers: { "x-csrf-token": player.csrf },
          data: { state: freshState(), revision: 1 },
        })
      ).status(),
    ).toBe(409);
    const banned = await request.patch(target, {
      headers: { "x-csrf-token": admin.csrf },
      data: { banned: true, revision: saved.revision },
    });
    expect(banned.status()).toBe(200);
    expect((await playerRequest.get("/api/player/state")).status()).toBe(401);
    const bannedSave = await banned.json();
    expect(
      (
        await request.patch(target, {
          headers: { "x-csrf-token": admin.csrf },
          data: { banned: false, revision: bannedSave.revision },
        })
      ).status(),
    ).toBe(200);
    const login = await playerRequest.post("/api/auth/login", {
      data: { username: player.account.username, password: password() },
    });
    expect(login.status()).toBe(200);
    expect((await login.json()).save.state.gold).toBe(234567);
  } finally {
    await playerRequest.dispose();
  }
});

test("player registers from the game, syncs progress, and redeems an admin gift only once", async ({
  page,
  request,
}) => {
  const admin = await adminLogin(request);
  const code = unique("GIFT").toUpperCase();
  const created = await request.post("/api/admin/giftcodes", {
    headers: { "x-csrf-token": admin.csrf },
    data: {
      code,
      gold: 321,
      jade: 55,
      scrolls: 2,
      stamina: 0,
      maxUses: 1,
      expiresAt: null,
    },
  });
  expect(created.status()).toBe(201);
  await page.goto("/");
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
  const username = unique("ui");
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill(username);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password());
  await page.getByRole("button", { name: "Tạo tài khoản người chơi" }).click();
  await expect(
    page.getByRole("heading", { name: username, exact: true }),
  ).toBeVisible();
  await page.getByLabel("Nhập giftcode").fill(code);
  await page.getByRole("button", { name: "Nhận quà giftcode" }).click();
  await expect
    .poll(async () =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)).gold,
        SAVE_KEY,
      ),
    )
    .toBe(128771);
  await page.getByLabel("Nhập giftcode").fill(code);
  await page.getByRole("button", { name: "Nhận quà giftcode" }).click();
  await expect(page.getByRole("alert")).toContainText("đã nhận giftcode");
  await page.getByRole("button", { name: "Trở về game", exact: true }).click();
  await page
    .getByRole("button", { name: "Nhận quà ngay", exact: true })
    .click();
  await expect
    .poll(async () => {
      const response = await page.request.get("/api/player/state");
      return (await response.json()).state.gold;
    })
    .toBe(133771);
  await page.reload();
  await expect
    .poll(async () =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)).gold,
        SAVE_KEY,
      ),
    )
    .toBe(133771);
});

test("admin UI saves hero stats and game loads the new configuration", async ({
  page,
  request,
}) => {
  const admin = await adminLogin(request);
  const original = await (await request.get("/api/admin/config")).json();
  try {
    await uiLogin(page);
    await page.screenshot({
      path: "/tmp/tamquoc-admin-dashboard.png",
      fullPage: true,
    });
    await page
      .getByRole("navigation", { name: "Điều hướng quản trị" })
      .getByRole("button", { name: "Danh tướng", exact: true })
      .click();
    await page.getByLabel("Công kích cơ bản", { exact: true }).fill("1745");
    await page.getByRole("button", { name: "Lưu cấu hình tướng" }).click();
    await expect(page.getByRole("status")).toContainText("Đã lưu cấu hình");
    const configured = await (await request.get("/api/config")).json();
    expect(configured.config.heroes[0].attackBase).toBe(1745);
    expect(
      (
        await request.put("/api/admin/config", {
          headers: { "x-csrf-token": admin.csrf },
          data: original,
        })
      ).status(),
    ).toBe(409);
    await page.goto("/");
    await page
      .getByRole("button", { name: "Xem Quan Vũ", exact: true })
      .click();
    await expect(page.locator(".detail-stats")).toContainText(
      format(1745 + 25 * 64),
    );
  } finally {
    const latest = await (await request.get("/api/admin/config")).json();
    expect(
      (
        await request.put("/api/admin/config", {
          headers: { "x-csrf-token": admin.csrf },
          data: { config: original.config, revision: latest.revision },
        })
      ).status(),
    ).toBe(200);
  }
});

test("maintenance blocks game while admin stays available; invalid config is rejected", async ({
  request,
  page,
}) => {
  const admin = await adminLogin(request);
  const original = await (await request.get("/api/admin/config")).json();
  const invalid = structuredClone(original.config);
  invalid.heroes[0].attackBase = -1;
  expect(
    (
      await request.put("/api/admin/config", {
        headers: { "x-csrf-token": admin.csrf },
        data: { config: invalid, revision: original.revision },
      })
    ).status(),
  ).toBe(400);
  try {
    const config = structuredClone(original.config);
    config.rules.maintenance = true;
    config.rules.notice = "Máy chủ đang cập nhật thử nghiệm.";
    expect(
      (
        await request.put("/api/admin/config", {
          headers: { "x-csrf-token": admin.csrf },
          data: { config, revision: original.revision },
        })
      ).status(),
    ).toBe(200);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Thiên hạ đang bảo trì" }),
    ).toBeVisible();
    await expect(page.getByText(config.rules.notice)).toBeVisible();
    expect((await request.get("/api/admin/overview")).status()).toBe(200);
  } finally {
    const latest = await (await request.get("/api/admin/config")).json();
    expect(
      (
        await request.put("/api/admin/config", {
          headers: { "x-csrf-token": admin.csrf },
          data: { config: original.config, revision: latest.revision },
        })
      ).status(),
    ).toBe(200);
  }
});

test("admin pages fit mobile and record real audit entries", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await uiLogin(page);
  for (const label of [
    "Người chơi",
    "Danh tướng",
    "Chiến dịch",
    "Giftcode",
    "Cấu hình",
    "Nhật ký",
  ]) {
    await page
      .getByRole("navigation", { name: "Điều hướng quản trị" })
      .getByRole("button", { name: new RegExp(`^${label}`) })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      label,
    ).toBe(false);
  }
  await expect(page.locator(".adm-table")).toContainText("Đăng nhập admin");
  await expect(page.locator(".adm-table")).toContainText("Chỉnh tài nguyên");
  await page.screenshot({
    path: "/tmp/tamquoc-admin-mobile.png",
    fullPage: true,
  });
});

test("password changes invalidate old sessions and can be restored using the new password", async ({
  request,
}) => {
  const admin = await adminLogin(request);
  const nextPassword = randomBytes(24).toString("base64url");
  const change = await request.post("/api/admin/password", {
    headers: { "x-csrf-token": admin.csrf },
    data: { currentPassword: password(), newPassword: nextPassword },
  });
  expect(change.status()).toBe(200);
  expect((await request.get("/api/admin/overview")).status()).toBe(401);
  expect(
    (
      await request.post("/api/auth/login", {
        data: { username: "testadmin", password: password() },
      })
    ).status(),
  ).toBe(401);
  const login = await request.post("/api/auth/login", {
    data: { username: "testadmin", password: nextPassword },
  });
  expect(login.status()).toBe(200);
  const next = await login.json();
  expect(
    (
      await request.post("/api/admin/password", {
        headers: { "x-csrf-token": next.csrf },
        data: { currentPassword: nextPassword, newPassword: password() },
      })
    ).status(),
  ).toBe(200);
});

test("SQLite keeps hashed credentials, player progress, and configuration after reopening", () => {
  const directory = mkdtempSync(join(tmpdir(), "tamquoc-persist-"));
  const first = openStore(directory);
  const account = first.createAccount({
    username: "persisted_player",
    password: password(),
  });
  const hash = first.db
    .prepare("SELECT password_hash FROM accounts WHERE id=?")
    .get(account.id).password_hash;
  expect(hash).not.toBe(password());
  expect(passwordMatches(password(), hash)).toBe(true);
  const save = first.getSave(account.id);
  first.savePlayer(account.id, { ...save.state, gold: 987654 }, save.revision);
  const config = first.getConfig();
  config.config.rules.notice = "Dữ liệu được giữ sau khởi động lại.";
  first.db
    .prepare("UPDATE config SET data=?,revision=revision+1 WHERE id=1")
    .run(JSON.stringify(config.config));
  first.db.close();
  const second = openStore(directory);
  try {
    expect(second.getSave(account.id).state.gold).toBe(987654);
    expect(second.getConfig().config.rules.notice).toBe(
      config.config.rules.notice,
    );
  } finally {
    second.db.close();
  }
});
