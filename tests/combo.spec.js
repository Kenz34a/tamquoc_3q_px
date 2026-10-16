import { test, expect } from "@playwright/test";
import { freshState, makeBattle, readyCombos, castCombo } from "../src/game.js";

test("a combo requires both living partners and consumes both energy bars", () => {
  const battle = makeBattle(freshState(), 0);
  expect(readyCombos(battle)).toHaveLength(0);
  expect(castCombo(battle, "dragon")).toBe(battle);
  battle.allies[0].energy = 66;
  battle.allies[1].energy = 66;
  expect(readyCombos(battle).map((c) => c.id)).toContain("dragon");
  const result = castCombo(battle, "dragon");
  expect(result.event.kind).toBe("combo");
  expect(result.allies[0].energy).toBe(0);
  expect(result.allies[1].energy).toBe(0);
  expect(result.allies[2].energy).toBe(40);
  expect(result.enemies.every((u) => u.hp < u.maxHp)).toBe(true);
  expect(battle.allies[0].energy).toBe(66);
  battle.allies[1].hp = 0;
  expect(readyCombos(battle)).toHaveLength(0);
  battle.allies[1].hp = 1;
  battle.allies[1].energy = 65;
  expect(readyCombos(battle)).toHaveLength(0);
  battle.allies = battle.allies.filter((u) => u.id !== "zhao");
  expect(readyCombos(battle)).toHaveLength(0);
});

test("support and fire combos apply distinct effects without reviving fallen troops", () => {
  const battle = makeBattle(freshState(), 0);
  battle.allies.forEach((u) => {
    u.energy = 100;
    u.hp -= 5000;
  });
  battle.allies[0].hp = 0;
  const result = castCombo(battle, "moon");
  expect(result.allies[0].hp).toBe(0);
  expect(result.allies[1].hp).toBe(
    battle.allies[1].hp + Math.round(battle.allies[1].maxHp * 0.18),
  );
  const fireState = freshState();
  fireState.team[0] = "sun";
  const fireBattle = makeBattle(fireState, 0);
  fireBattle.allies.forEach((u) => {
    u.energy = 100;
  });
  const attackers = fireBattle.allies.filter((u) =>
    ["sun", "zhuge"].includes(u.id),
  );
  expect(castCombo(fireBattle, "fire").event.damage).toBe(
    Math.round(attackers.reduce((sum, u) => sum + u.attack, 0) * 1.2),
  );
});

test("manual pair combo can be activated in a live battle", async ({
  page,
}) => {
  // Keep live attack timers from replacing the combo effect between assertions.
  await page.clock.install({ time: new Date("2026-10-16T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-16T01:00:00Z"));
  await page.goto("/");
  await page.getByRole("button", { name: "Xuất chinh", exact: true }).click();
  await expect(page.locator(".battle-portrait .chibi")).toHaveCount(10);
  await page.getByRole("button", { name: "Tự động", exact: true }).click();
  const combo = page.getByRole("button", {
    name: "Hợp kích Long Hồn Vô Song",
    exact: true,
  });
  await expect(combo).toBeDisabled();
  await page.clock.runFor(3100);
  await expect(combo).toBeEnabled();
  await combo.click();
  await expect(page.locator(".combo-announcement strong")).toHaveText(
    "Long Hồn Vô Song",
  );
  await expect(combo).toBeDisabled();
});

test("mobile city buildings are clickable and the showcased hero can change", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ngắm Triệu Vân", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Xem tướng thành chính Triệu Vân" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Chợ quân nhu/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Quân nhu tiếp viện" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await page.getByRole("button", { name: /Diễn Võ Trường/ }).click();
  await expect(
    page.getByRole("heading", { name: "Bày binh bố trận" }),
  ).toBeVisible();
  await expect(page.locator(".formation-unit .chibi")).toHaveCount(5);
});
