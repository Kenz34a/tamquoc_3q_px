export const HEROES = [
  {
    id: "guan",
    name: "Quan Vũ",
    title: "Võ Thánh",
    faction: "Thục",
    role: "Chiến sĩ",
    rarity: "SSR",
    color: "#81bca0",
    art: 0,
    base: 14600,
    skill: "Thanh Long Yển Nguyệt",
    description:
      "Thanh long thức tỉnh. Gây sát thương diện rộng lên toàn bộ quân địch.",
    quote: "Một đao định càn khôn.",
  },
  {
    id: "zhao",
    name: "Triệu Vân",
    title: "Thường Sơn Long Tướng",
    faction: "Thục",
    role: "Đột kích",
    rarity: "SSR",
    color: "#8bc7e0",
    art: 1,
    base: 14200,
    skill: "Thất Tiến Thất Xuất",
    description:
      "Long thương xuyên trận. Tấn công toàn bộ hàng ngũ đối phương.",
    quote: "Thường Sơn Triệu Tử Long, có mặt!",
  },
  {
    id: "lu",
    name: "Lữ Bố",
    title: "Vô Song Chiến Thần",
    faction: "Quần",
    role: "Bạo kích",
    rarity: "SSR",
    color: "#cf91bb",
    art: 2,
    base: 15400,
    skill: "Thiên Hạ Vô Song",
    description:
      "Phương thiên họa kích giáng xuống, gây sát thương cực lớn cho quân địch.",
    quote: "Thiên hạ, ai dám cùng ta quyết chiến?",
  },
  {
    id: "diao",
    name: "Điêu Thuyền",
    title: "Bế Nguyệt Mỹ Nhân",
    faction: "Quần",
    role: "Hỗ trợ",
    rarity: "SSR",
    color: "#d6a2d3",
    art: 3,
    base: 13500,
    skill: "Bế Nguyệt Liên Hoa",
    description:
      "Liên hoa nở rộ. Tấn công quân địch và hồi phục sinh lực cho đồng đội.",
    quote: "Một điệu múa, nghiêng cả giang sơn.",
  },
  {
    id: "zhuge",
    name: "Gia Cát Lượng",
    title: "Ngọa Long Tiên Sinh",
    faction: "Thục",
    role: "Mưu sĩ",
    rarity: "SSR",
    color: "#e5d4a2",
    art: 4,
    base: 14800,
    skill: "Bát Trận Đồ",
    description:
      "Triệu hồi bát quái trận, tung phong lôi vào toàn bộ quân địch.",
    quote: "Thiên thời, địa lợi, nhân hòa.",
  },
  {
    id: "sun",
    name: "Tôn Thượng Hương",
    title: "Cung Yêu Cơ",
    faction: "Ngô",
    role: "Xạ thủ",
    rarity: "SR",
    color: "#e8af7e",
    art: 5,
    base: 12800,
    skill: "Liệt Diễm Liên Tiễn",
    description:
      "Mưa tên lửa trút xuống chiến trường, thiêu đốt toàn bộ đối phương.",
    quote: "Nữ nhi cũng có chí tung hoành.",
  },
];

export const STAGES = [
  {
    name: "Loạn Khăn Vàng",
    place: "U Châu",
    subtitle: "Khởi đầu một huyền thoại",
    enemy: "Trương Giác",
    difficulty: "Dễ",
    gold: 4200,
    jade: 80,
  },
  {
    name: "Kết Nghĩa Đào Viên",
    place: "Trác Quận",
    subtitle: "Đồng tâm, cùng chí lớn",
    enemy: "Trình Viễn Chí",
    difficulty: "Dễ",
    gold: 5000,
    jade: 100,
  },
  {
    name: "Trận Hổ Lao Quan",
    place: "Hổ Lao",
    subtitle: "Tam anh chiến Lữ Bố",
    enemy: "Lữ Bố",
    difficulty: "Vừa",
    gold: 6500,
    jade: 120,
  },
  {
    name: "Lửa Cháy Lạc Dương",
    place: "Lạc Dương",
    subtitle: "Giữa tro tàn đế nghiệp",
    enemy: "Đổng Trác",
    difficulty: "Vừa",
    gold: 7200,
    jade: 140,
  },
  {
    name: "Đơn Kỵ Cứu Chúa",
    place: "Trường Bản",
    subtitle: "Một thương giữa vạn quân",
    enemy: "Hạ Hầu Đôn",
    difficulty: "Khó",
    gold: 8500,
    jade: 160,
  },
  {
    name: "Đại Chiến Xích Bích",
    place: "Xích Bích",
    subtitle: "Gió đông đổi vận mệnh",
    enemy: "Tào Tháo",
    difficulty: "Khó",
    gold: 10000,
    jade: 180,
  },
  {
    name: "Định Quân Sơn",
    place: "Hán Trung",
    subtitle: "Một trận định thiên hạ",
    enemy: "Hạ Hầu Uyên",
    difficulty: "Khó",
    gold: 12000,
    jade: 200,
  },
  {
    name: "Bắc Phạt Trung Nguyên",
    place: "Kỳ Sơn",
    subtitle: "Viết tiếp giấc mộng lớn",
    enemy: "Tư Mã Ý",
    difficulty: "Tinh anh",
    gold: 15000,
    jade: 300,
  },
];

HEROES.forEach((hero) =>
  Object.assign(hero, {
    hpBase: 10000,
    hpGrowth: 240,
    attackBase: 1400,
    attackGrowth: 64,
  }),
);
STAGES.forEach((stage, index) =>
  Object.assign(stage, { level: 12 + index * 8 }),
);
export const RULES = {
  dailyGold: 5000,
  dailyJade: 200,
  dailyScrolls: 5,
  battleStamina: 8,
  summonJade: 200,
  notice: "",
  maintenance: false,
};
export const defaultConfig = () => ({
  heroes: structuredClone(HEROES),
  stages: structuredClone(STAGES),
  rules: { ...RULES },
});
export function applyGameConfig(config) {
  HEROES.splice(0, HEROES.length, ...config.heroes);
  STAGES.splice(0, STAGES.length, ...config.stages);
  Object.assign(RULES, config.rules);
}
export const SAVE_KEY = "tamquoc-truyenky-v1";
export const COMBOS = [
  {
    id: "dragon",
    name: "Long Hồn Vô Song",
    pair: ["guan", "zhao"],
    color: "#7fe7c6",
    description: "Sát thương toàn trận, tiếp thêm 10 nộ cho đồng đội còn lại.",
  },
  {
    id: "moon",
    name: "Long Phụng Hòa Minh",
    pair: ["lu", "diao"],
    color: "#e4a4ee",
    description:
      "Sát thương toàn trận, hồi 18% sinh lực tối đa cho đồng đội còn sống.",
  },
  {
    id: "fire",
    name: "Phong Hỏa Liên Thành",
    pair: ["zhuge", "sun"],
    color: "#ffc18a",
    description:
      "Mượn gió đông, tung mưa tên lửa gây thêm 20% sát thương toàn trận.",
  },
];

export function readyCombos(match, enemy = false) {
  if (match.result) return [];
  const units = enemy ? match.enemies : match.allies;
  return COMBOS.filter((combo) =>
    combo.pair.every((id) =>
      units.some((u) => u.id === id && u.hp > 0 && u.energy >= 66),
    ),
  );
}

export function castCombo(previous, id, enemy = false) {
  const combo = readyCombos(previous, enemy).find((item) => item.id === id);
  if (!combo) return previous;
  const match = structuredClone(previous);
  const side = enemy ? "enemies" : "allies";
  const targetSide = enemy ? "allies" : "enemies";
  const partners = combo.pair.map((heroId) =>
    match[side].find((u) => u.id === heroId),
  );
  const damage = Math.round(
    partners.reduce((sum, u) => sum + u.attack, 0) * (id === "fire" ? 1.2 : 1),
  );
  partners.forEach((u) => {
    u.energy = 0;
  });
  const targets = match[targetSide].filter((u) => u.hp > 0);
  targets.forEach((u) => {
    u.hp = Math.max(0, u.hp - damage);
  });
  if (id === "moon")
    match[side].forEach((u) => {
      if (u.hp > 0) u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.18));
    });
  if (id === "dragon")
    match[side].forEach((u) => {
      if (u.hp > 0 && !combo.pair.includes(u.id))
        u.energy = Math.min(100, u.energy + 10);
    });
  match.event = {
    key: `combo-${match.turn}-${Date.now()}`,
    kind: "combo",
    actor: combo.pair[0],
    partners: combo.pair,
    actorSide: side,
    side: targetSide,
    targets: targets.map((u) => u.id),
    damage,
    label: combo.name,
    color: combo.color,
  };
  match.log = [
    `${partners.map((u) => heroById(u.id).name).join(" & ")} hợp kích: ${combo.name}!`,
    ...match.log,
  ].slice(0, 5);
  return resolveResult(match);
}
export const format = (n) =>
  new Intl.NumberFormat("vi-VN").format(Math.floor(n));
export const heroById = (id) => HEROES.find((h) => h.id === id);
export const heroPower = (hero, level) => hero.base + level * 420;
export const teamPower = (state) =>
  state.team.reduce(
    (sum, id) => sum + heroPower(heroById(id), state.levels[id]),
    0,
  );
export const upgradeCost = (level) => level * 180;
export const enemyLevel = (stage) => STAGES[stage].level;
export const heroStats = (id, level) => {
  const hero = heroById(id);
  return {
    hp: hero.hpBase + level * hero.hpGrowth,
    attack: hero.attackBase + level * hero.attackGrowth,
  };
};
export const portraitPosition = (art) =>
  `${(art % 3) * 50}% ${Math.floor(art / 3) * 100}%`;
export const freshState = () => ({
  version: 1,
  gold: 128450,
  jade: 2680,
  stamina: 120,
  scrolls: 10,
  levels: { guan: 25, zhao: 22, lu: 24, diao: 20, zhuge: 23, sun: 21 },
  shards: { guan: 0, zhao: 0, lu: 0, diao: 0, zhuge: 0, sun: 0 },
  team: ["guan", "zhao", "lu", "diao", "zhuge"],
  completed: 0,
  victories: 0,
  dailyDate: "",
  sound: false,
});

export function normalizeState(data) {
  const base = freshState();
  if (!data || data.version !== 1) return null;
  for (const key of [
    "gold",
    "jade",
    "stamina",
    "scrolls",
    "completed",
    "victories",
  ]) {
    if (
      !Number.isSafeInteger(data[key]) ||
      data[key] < 0 ||
      data[key] > 1000000000
    )
      return null;
  }
  if (data.completed > STAGES.length || data.stamina > 120) return null;
  if (
    !Array.isArray(data.team) ||
    data.team.length !== 5 ||
    new Set(data.team).size !== 5 ||
    data.team.some((id) => !heroById(id))
  )
    return null;
  if (
    HEROES.some(
      ({ id }) =>
        !Number.isInteger(data.levels?.[id]) ||
        data.levels[id] < 1 ||
        data.levels[id] > 60 ||
        !Number.isSafeInteger(data.shards?.[id]) ||
        data.shards[id] < 0 ||
        data.shards[id] > 1000000000,
    )
  )
    return null;
  return {
    ...base,
    ...Object.fromEntries(Object.keys(base).map((key) => [key, data[key]])),
    team: [...data.team],
    levels: Object.fromEntries(
      HEROES.map((hero) => [hero.id, data.levels[hero.id]]),
    ),
    shards: Object.fromEntries(
      HEROES.map((hero) => [hero.id, data.shards[hero.id]]),
    ),
    sound: data.sound === true,
    dailyDate:
      typeof data.dailyDate === "string" && data.dailyDate.length <= 10
        ? data.dailyDate
        : "",
  };
}
export function loadState(storage) {
  try {
    const source = storage ?? window.localStorage;
    return normalizeState(JSON.parse(source.getItem(SAVE_KEY))) ?? freshState();
  } catch {
    return freshState();
  }
}

export function summon(count, random = Math.random) {
  return Array.from({ length: count }, (_, i) => {
    const roll = random();
    // Each ten-pull guarantees an SSR on its final draw.
    const pool =
      (count === 10 && i === 9) || roll < 0.65
        ? HEROES.filter((h) => h.rarity === "SSR")
        : HEROES;
    return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  });
}

export function makeBattle(state, stage) {
  const unit = (id, slot, enemy) => {
    const level = enemy ? enemyLevel(stage) : state.levels[id];
    const stats = heroStats(id, level);
    const maxHp = enemy ? 9000 + level * 280 : stats.hp;
    return {
      id,
      slot,
      hp: maxHp,
      maxHp,
      attack: enemy ? 1000 + level * 70 : stats.attack,
      energy: enemy ? 0 : 30,
    };
  };
  return {
    allies: state.team.map((id, i) => unit(id, i, false)),
    enemies: ["sun", "lu", "guan", "zhao", "zhuge"].map((id, i) =>
      unit(id, i, true),
    ),
    turn: 0,
    result: null,
    event: null,
    log: ["Hai quân đã vào trận. Trận chiến bắt đầu!"],
    stage,
  };
}

function resolveResult(match) {
  if (match.enemies.every((u) => u.hp <= 0)) match.result = "win";
  else if (match.allies.every((u) => u.hp <= 0)) match.result = "lose";
  return match;
}

export function castSkill(previous, id, enemy = false) {
  if (previous.result) return previous;
  const match = structuredClone(previous);
  const side = enemy ? "enemies" : "allies";
  const targetSide = enemy ? "allies" : "enemies";
  const actor = match[side].find((u) => u.id === id);
  if (!actor || actor.hp <= 0 || actor.energy < 66) return previous;
  actor.energy = 0;
  const damage = Math.round(actor.attack * 1.35);
  const targets = match[targetSide].filter((u) => u.hp > 0);
  targets.forEach((u) => {
    u.hp = Math.max(0, u.hp - damage);
  });
  if (id === "diao")
    match[side].forEach((u) => {
      if (u.hp > 0) u.hp = Math.min(u.maxHp, u.hp + 2800);
    });
  match.event = {
    key: `${match.turn}-${Date.now()}-${id}`,
    kind: "skill",
    actor: id,
    actorSide: side,
    side: targetSide,
    targets: targets.map((u) => u.id),
    damage,
    label: heroById(id).skill,
  };
  match.log = [
    `${heroById(id).name} thi triển ${heroById(id).skill}!`,
    ...match.log,
  ].slice(0, 5);
  return resolveResult(match);
}

export function advanceBattle(previous, auto = true) {
  if (previous.result) return previous;
  const match = structuredClone(previous);
  const enemy = match.turn % 2 === 1;
  const side = enemy ? "enemies" : "allies";
  const targetSide = enemy ? "allies" : "enemies";
  const alive = match[side].filter((u) => u.hp > 0);
  const targets = match[targetSide].filter((u) => u.hp > 0);
  if (!alive.length || !targets.length) return resolveResult(match);
  const actor = alive[Math.floor(match.turn / 2) % alive.length];
  match.turn += 1;
  if (actor.energy >= 66 && (enemy || auto)) {
    const combo = readyCombos(match, enemy).find((item) =>
      item.pair.includes(actor.id),
    );
    return combo
      ? castCombo(match, combo.id, enemy)
      : castSkill(match, actor.id, enemy);
  }
  const frontLine = targets.filter((u) => u.slot < 2);
  const target = (frontLine.length ? frontLine : targets).reduce((a, b) =>
    a.hp < b.hp ? a : b,
  );
  const critical = match.turn % 7 === 0;
  const damage = Math.round(actor.attack * (critical ? 1.7 : 1));
  target.hp = Math.max(0, target.hp - damage);
  actor.energy = Math.min(100, actor.energy + 38);
  match.event = {
    key: `${match.turn}`,
    kind: critical ? "critical" : "attack",
    actor: actor.id,
    actorSide: side,
    side: targetSide,
    targets: [target.id],
    damage,
    label: critical ? "Bạo kích!" : "Công kích",
  };
  match.log = [
    `${heroById(actor.id).name} ${critical ? "bạo kích" : "tấn công"}, gây ${format(damage)} sát thương.`,
    ...match.log,
  ].slice(0, 5);
  return resolveResult(match);
}
