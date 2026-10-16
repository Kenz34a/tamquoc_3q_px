import { test, expect } from "@playwright/test";
import {
  HEROES,
  freshState,
  loadState,
  makeBattle,
  advanceBattle,
  castSkill,
  summon,
  SAVE_KEY,
} from "../src/game.js";

test("invalid saved data safely falls back to a fresh game", () => {
  const broken = {
    ...freshState(),
    team: ["guan", "guan", "lu", "diao", "zhuge"],
  };
  expect(loadState({ getItem: () => JSON.stringify(broken) })).toEqual(
    freshState(),
  );
  expect(loadState({ getItem: () => "{broken" })).toEqual(freshState());
  const valid = { ...freshState(), gold: 88 };
  expect(loadState({ getItem: () => JSON.stringify(valid) }).gold).toBe(88);
});

test("combat resolves with real damage, defeated troops, and an unmodified input", () => {
  let battle = makeBattle(freshState(), 0);
  const original = structuredClone(battle);
  battle = advanceBattle(battle);
  expect(original.enemies[0].hp).toBe(original.enemies[0].maxHp);
  expect(battle.enemies.some((u) => u.hp < u.maxHp)).toBe(true);
  for (let i = 0; i < 500 && !battle.result; i++)
    battle = advanceBattle(battle);
  expect(battle.result).toBe("win");
  expect(battle.enemies.every((u) => u.hp === 0)).toBe(true);
  expect([...battle.allies, ...battle.enemies].every((u) => u.hp >= 0)).toBe(
    true,
  );
});

test("skills require energy and the healer restores living allies", () => {
  const battle = makeBattle(freshState(), 0);
  expect(castSkill(battle, "guan")).toBe(battle);
  battle.allies.find((u) => u.id === "diao").energy = 100;
  battle.allies[0].hp -= 4000;
  battle.allies[1].hp = 0;
  const next = castSkill(battle, "diao");
  expect(next.allies[0].hp).toBe(battle.allies[0].hp + 2800);
  expect(next.allies[1].hp).toBe(0);
  expect(next.allies.find((u) => u.id === "diao").energy).toBe(0);
  expect(next.enemies.every((u) => u.hp < u.maxHp)).toBe(true);
});

test("ten summons guarantee SSR even with the least favorable random rolls", () => {
  const results = summon(10, () => 0.999);
  expect(results).toHaveLength(10);
  expect(results[9].rarity).toBe("SSR");
  expect(results.every((h) => HEROES.some((known) => known.id === h.id))).toBe(
    true,
  );
});

test("front-line troops protect the rear and late stages require progression", () => {
  const first = advanceBattle(makeBattle(freshState(), 0), false);
  expect(first.enemies.slice(2).every((u) => u.hp === u.maxHp)).toBe(true);
  const fight = (state) => {
    let battle = makeBattle(state, 7);
    for (let turn = 0; turn < 500 && !battle.result; turn++)
      battle = advanceBattle(battle);
    return battle.result;
  };
  expect(fight(freshState())).toBe("lose");
  const trained = freshState();
  trained.levels = Object.fromEntries(HEROES.map((hero) => [hero.id, 60]));
  expect(fight(trained)).toBe("win");
});

const readSave = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
async function navigate(page, label) {
  const menu = page.getByRole("button", { name: "Mở menu", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: label })
    .click();
}

test("daily rewards can be claimed once and progress survives reload", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Chào mừng/ })).toBeVisible();
  await page.getByRole("button", { name: "Nhận quà ngay" }).click();
  const claimed = await readSave(page);
  expect(claimed.gold).toBe(133450);
  expect(claimed.jade).toBe(2880);
  expect(claimed.scrolls).toBe(15);
  await page
    .getByRole("button", { name: "Đã nhận hôm nay", exact: true })
    .click();
  expect((await readSave(page)).gold).toBe(133450);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Đã nhận hôm nay", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("upgrade, formation swaps, filters, and summon results work together", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Xem Quan Vũ", exact: true }).click();
  await page.getByRole("button", { name: /Nâng cấp tướng/ }).click();
  expect((await readSave(page)).levels.guan).toBe(26);
  expect((await readSave(page)).gold).toBe(123950);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await navigate(page, "Tướng lĩnh");
  await page.getByRole("button", { name: "Ngô", exact: true }).click();
  await expect(page.locator(".collection-grid .hero-card")).toHaveCount(1);
  await navigate(page, "Đội hình");
  await page.getByRole("button", { name: "Vị trí 1: Quan Vũ" }).click();
  await page
    .locator(".formation-option")
    .filter({ hasText: "Tôn Thượng Hương" })
    .click();
  expect((await readSave(page)).team[0]).toBe("sun");
  expect(new Set((await readSave(page)).team).size).toBe(5);
  await navigate(page, "Chiêu mộ");
  await page.getByRole("button", { name: /Chiêu mộ 10 lần/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Danh tướng giáng lâm" }),
  ).toBeVisible();
  await expect(page.locator(".summon-result-card")).toHaveCount(10);
  expect((await readSave(page)).scrolls).toBe(0);
  expect(
    Object.values((await readSave(page)).shards).reduce((a, b) => a + b),
  ).toBe(200);
  await page.getByRole("button", { name: "Tiếp tục hành trình" }).click();
  expect((await readSave(page)).jade).toBe(2680);
});

test("complete a battle, claim exactly one reward, and unlock the next stage", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Xuất chinh", exact: true }).click();
  await expect(page.getByRole("dialog", { name: /Trận chiến/ })).toBeVisible();
  expect((await readSave(page)).stamina).toBe(112);
  await page.getByRole("button", { name: "Tốc độ 1 lần" }).click();
  await page.clock.runFor(45000);
  await expect(page.getByRole("heading", { name: "Đại thắng!" })).toBeVisible();
  await page.getByRole("button", { name: "Nhận thưởng", exact: true }).click();
  const saved = await readSave(page);
  expect(saved.completed).toBe(1);
  expect(saved.victories).toBe(1);
  expect(saved.gold).toBe(132650);
  expect(saved.jade).toBe(2760);
  await navigate(page, "Chiến dịch");
  const stages = page.locator(".stage-card");
  await expect(stages.nth(0).getByRole("button")).toBeEnabled();
  await expect(stages.nth(1).getByRole("button")).toBeEnabled();
  await expect(stages.nth(2).getByRole("button")).toBeDisabled();
});

test("mobile navigation and all screens fit without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  for (const label of [
    "Tướng lĩnh",
    "Đội hình",
    "Chiến dịch",
    "Chiêu mộ",
    "Đại sảnh",
  ]) {
    await navigate(page, label);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow, `${label} should fit the mobile viewport`).toBe(false);
  }
  await page.getByRole("button", { name: "Xuất chinh", exact: true }).click();
  const viewport = await page.locator(".battle-modal").boundingBox();
  expect(viewport.x).toBeGreaterThanOrEqual(0);
  expect(viewport.x + viewport.width).toBeLessThanOrEqual(390);
  await expect(
    page.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
});

test("a browser that blocks local storage can still play with an honest warning", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage blocked", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Chào mừng/ })).toBeVisible();
  await expect(page.locator(".save-warning")).toContainText(
    "không cho phép lưu tiến trình",
  );
  await page.getByRole("button", { name: "Xuất chinh", exact: true }).click();
  await expect(page.getByRole("dialog", { name: /Trận chiến/ })).toBeVisible();
});

test("insufficient resources do not charge a summon or refill full stamina", async ({
  page,
}) => {
  const initial = { ...freshState(), jade: 199, scrolls: 0 };
  await page.addInitScript(
    ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    { key: SAVE_KEY, data: initial },
  );
  await page.goto("/");
  await navigate(page, "Chiêu mộ");
  await page.getByRole("button", { name: /Chiêu mộ 1 lần/ }).click();
  await expect(page.getByRole("status")).toContainText("Chưa đủ ngọc");
  await expect(page.locator(".summon-result-card")).toHaveCount(0);
  expect((await readSave(page)).jade).toBe(199);
  await page
    .getByRole("button", { name: "Thể lực 120 trên 120", exact: true })
    .click();
  await page
    .locator(".supply-item")
    .filter({ hasText: "Tiệc quân lương" })
    .getByRole("button")
    .click();
  expect((await readSave(page)).jade).toBe(199);
  await expect(page.getByRole("status")).toContainText("Thể lực đã đầy");
});

test("retreat asks first and never grants a victory reward", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Xuất chinh", exact: true }).click();
  await page.getByRole("button", { name: "Rời trận", exact: true }).click();
  await expect(
    page.getByText("Rút lui khỏi trận chiến?", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Rút lui", exact: true }).click();
  expect((await readSave(page)).stamina).toBe(112);
  expect((await readSave(page)).victories).toBe(0);
  expect((await readSave(page)).gold).toBe(128450);
});
