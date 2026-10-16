import { defaultConfig, normalizeState } from "../src/game.js";

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}
export function integer(value, min = 0, max = 1000000000, label = "Giá trị") {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new HttpError(
      400,
      `${label} phải là số nguyên từ ${min} đến ${max}.`,
    );
  return value;
}
export function text(value, max = 200, label = "Nội dung", allowEmpty = false) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!allowEmpty && !value.trim())
  )
    throw new HttpError(400, `${label} không hợp lệ (tối đa ${max} ký tự).`);
  return value.trim();
}
export function credentials(body) {
  const username = text(body.username, 32, "Tên đăng nhập");
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(username))
    throw new HttpError(
      400,
      "Tên đăng nhập gồm 3–32 chữ cái, số hoặc dấu gạch dưới.",
    );
  if (
    typeof body.password !== "string" ||
    body.password.length < 12 ||
    body.password.length > 128
  )
    throw new HttpError(400, "Mật khẩu cần từ 12 đến 128 ký tự.");
  return { username, password: body.password };
}
export function gameState(data) {
  const clean = normalizeState(data);
  if (!clean) throw new HttpError(400, "Dữ liệu tiến trình không hợp lệ.");
  return clean;
}
export function configData(data) {
  const defaults = defaultConfig();
  if (
    !data ||
    !Array.isArray(data.heroes) ||
    data.heroes.length !== defaults.heroes.length ||
    !Array.isArray(data.stages) ||
    data.stages.length !== defaults.stages.length
  )
    throw new HttpError(400, "Cấu hình phải có đủ 6 tướng và 8 ải.");
  const heroes = defaults.heroes.map((base) => {
    const hero = data.heroes.find((h) => h?.id === base.id);
    if (!hero || data.heroes.filter((h) => h?.id === base.id).length !== 1)
      throw new HttpError(400, "Mã tướng không hợp lệ hoặc bị trùng.");
    if (
      !["Thục", "Ngô", "Quần"].includes(hero.faction) ||
      !["SSR", "SR"].includes(hero.rarity)
    )
      throw new HttpError(400, "Phe hoặc phẩm chất không hợp lệ.");
    const out = { ...base, faction: hero.faction, rarity: hero.rarity };
    for (const key of ["name", "title", "role", "skill", "quote"])
      out[key] = text(hero[key], 100, key);
    out.description = text(hero.description, 500, "Mô tả kỹ năng");
    for (const key of [
      "base",
      "hpBase",
      "hpGrowth",
      "attackBase",
      "attackGrowth",
    ])
      out[key] = integer(hero[key], 1, 1000000, key);
    return out;
  });
  const stages = data.stages.map((stage, index) => {
    const out = { ...defaults.stages[index] };
    for (const key of ["name", "place", "subtitle", "enemy"])
      out[key] = text(stage?.[key], 100, key);
    if (!["Dễ", "Vừa", "Khó", "Tinh anh"].includes(stage.difficulty))
      throw new HttpError(400, "Độ khó không hợp lệ.");
    out.difficulty = stage.difficulty;
    out.level = integer(stage.level, 1, 200, "Cấp quân địch");
    for (const key of ["gold", "jade"])
      out[key] = integer(stage[key], 0, 1000000, key);
    return out;
  });
  const rules = {};
  for (const key of ["dailyGold", "dailyJade", "dailyScrolls"])
    rules[key] = integer(data.rules?.[key], 0, 1000000, key);
  rules.battleStamina = integer(
    data.rules?.battleStamina,
    1,
    120,
    "Thể lực mỗi trận",
  );
  rules.summonJade = integer(
    data.rules?.summonJade,
    1,
    1000000,
    "Ngọc mỗi lần chiêu mộ",
  );
  rules.notice = text(data.rules?.notice, 1000, "Thông báo", true);
  if (typeof data.rules?.maintenance !== "boolean")
    throw new HttpError(400, "Trạng thái bảo trì không hợp lệ.");
  rules.maintenance = data.rules.maintenance;
  return { heroes, stages, rules };
}
