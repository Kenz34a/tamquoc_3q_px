import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/playfair-display/wght-italic.css";
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Coins,
  Crown,
  Diamond,
  Flame,
  Flag,
  Gift,
  Heart,
  Home,
  Layers3,
  LockKeyhole,
  Map,
  Medal,
  Menu,
  Plus,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  Star,
  Swords,
  Target,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import {
  HEROES,
  COMBOS,
  readyCombos,
  castCombo,
  STAGES,
  SAVE_KEY,
  format,
  heroById,
  heroPower,
  teamPower,
  upgradeCost,
  enemyLevel,
  portraitPosition,
  loadState,
  freshState,
  summon,
  makeBattle,
  advanceBattle,
  castSkill,
} from "./game.js";
import CityHub, { Chibi } from "./CityHub.jsx";
import "./style.css";
import "./game-feel.css";

const NAV = [
  { id: "home", label: "Đại sảnh", icon: Home },
  { id: "heroes", label: "Tướng lĩnh", icon: Users, badge: "06" },
  { id: "formation", label: "Đội hình", icon: Shield },
  { id: "campaign", label: "Chiến dịch", icon: Map },
  { id: "summon", label: "Chiêu mộ", icon: ScrollText, badge: "MỚI" },
];
const today = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(
    new Date(),
  );

function Portrait({ hero, className = "", children, style = {}, ...props }) {
  return (
    <div
      className={`portrait ${className}`}
      style={{
        backgroundPosition: portraitPosition(hero.art),
        "--hero-color": hero.color,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
function Ornament({ className = "" }) {
  return (
    <span className={`ornament ${className}`} aria-hidden="true">
      ◆
    </span>
  );
}
function Stars({ count = 5 }) {
  return (
    <div className="stars" aria-label={`${count} sao`}>
      {Array.from({ length: count }, (_, i) => (
        <Star key={i} size={11} fill="currentColor" />
      ))}
    </div>
  );
}
function GoldButton({ children, className = "", ...props }) {
  return (
    <button className={`gold-button ${className}`} {...props}>
      {children}
    </button>
  );
}

function Modal({
  children,
  onClose,
  title,
  className = "",
  hideHeader = false,
}) {
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const old = document.activeElement;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const key = (e) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key !== "Tab") return;
      const items = panel.current?.querySelectorAll(
        'button:not(:disabled), [href], input, select, [tabindex="0"]',
      );
      if (!items?.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panel.current)
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = scroll;
      document.removeEventListener("keydown", key);
      old?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={panel}
        tabIndex={-1}
        className={`modal-panel ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {!hideHeader && (
          <header className="modal-header">
            <div>
              <span className="eyebrow">TAM QUỐC TRUYỀN KỲ</span>
              <h2>{title}</h2>
            </div>
            <button className="icon-button" aria-label="Đóng" onClick={onClose}>
              <X size={20} />
            </button>
          </header>
        )}
        {children}
      </section>
    </div>
  );
}

function HeroCard({ hero, state, onClick, compact = false, selected = false }) {
  return (
    <button
      className={`hero-card ${compact ? "compact" : ""} ${selected ? "selected" : ""}`}
      onClick={onClick}
      aria-label={`Xem ${hero.name}`}
    >
      <Portrait hero={hero}>
        <div className="hero-card-top">
          <span className={`rarity ${hero.rarity.toLowerCase()}`}>
            {hero.rarity}
          </span>
          <span className="faction">{hero.faction}</span>
        </div>
        {state.team.includes(hero.id) && (
          <span className="deployed">
            <span /> Ra trận
          </span>
        )}
        <div className="hero-card-info">
          <Stars />
          <h3>{hero.name}</h3>
          <div>
            <span>{hero.role}</span>
            <span>Lv.{state.levels[hero.id]}</span>
          </div>
        </div>
      </Portrait>
      {!compact && (
        <div className="hero-card-footer">
          <Swords size={13} />
          <span>{format(heroPower(hero, state.levels[hero.id]))}</span>
          <ChevronRight size={14} />
        </div>
      )}
    </button>
  );
}

function App() {
  const [state, setState] = useState(loadState);
  const [page, setPage] = useState("home");
  const [heroId, setHeroId] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeBattle, setActiveBattle] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [filter, setFilter] = useState("Tất cả");
  const [summonResults, setSummonResults] = useState(null);
  const [summoning, setSummoning] = useState(false);
  const [formationSlot, setFormationSlot] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const notify = useCallback(
    (message) => setToast({ message, key: Date.now() }),
    [],
  );
  const sound = useCallback(
    (kind = "tap") => {
      if (!state.sound) return;
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        audioRef.current ||= new Audio();
        const ctx = audioRef.current;
        ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = kind === "hit" ? "triangle" : "sine";
        osc.frequency.setValueAtTime(
          kind === "skill" ? 180 : kind === "hit" ? 120 : 620,
          ctx.currentTime,
        );
        osc.frequency.exponentialRampToValueAtTime(
          kind === "skill" ? 920 : 80,
          ctx.currentTime + 0.2,
        );
        gain.gain.setValueAtTime(0.045, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch {
        /* Audio is optional; gameplay remains available. */
      }
    },
    [state.sound],
  );
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    }
  }, [state]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3400);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => () => clearTimeout(timerRef.current), []);
  const go = (id) => {
    setPage(id);
    setMobileNav(false);
    setFilter("Tất cả");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const dailyClaimed = state.dailyDate === today();
  const stageIndex = Math.min(state.completed, STAGES.length - 1);
  const stage = STAGES[stageIndex];
  const power = teamPower(state);

  const upgrade = (id) => {
    const level = state.levels[id];
    const cost = upgradeCost(level);
    if (level >= 60) return notify("Tướng đã đạt cấp tối đa 60.");
    if (state.gold < cost)
      return notify("Chưa đủ bạc. Hãy vượt ải để nhận thêm!");
    setState((s) => ({
      ...s,
      gold: s.gold - cost,
      levels: { ...s.levels, [id]: level + 1 },
    }));
    sound("skill");
    notify(`${heroById(id).name} đã lên cấp ${level + 1}!`);
  };
  const breakthrough = (id) => {
    if (state.shards[id] < 40)
      return notify("Cần 40 mảnh tướng. Chiêu mộ để thu thập thêm.");
    if (state.levels[id] >= 60) return notify("Tướng đã đạt cấp tối đa 60.");
    setState((s) => ({
      ...s,
      shards: { ...s.shards, [id]: s.shards[id] - 40 },
      levels: { ...s.levels, [id]: Math.min(60, s.levels[id] + 3) },
    }));
    sound("skill");
    notify(`Đột phá thành công! ${heroById(id).name} tăng 3 cấp.`);
  };
  const claimDaily = () => {
    if (dailyClaimed)
      return notify("Bạn đã nhận lễ hôm nay. Hẹn gặp vào ngày mai!");
    setState((s) => ({
      ...s,
      gold: s.gold + 5000,
      jade: s.jade + 200,
      scrolls: s.scrolls + 5,
      dailyDate: today(),
    }));
    notify("Đã nhận 5.000 bạc, 200 ngọc và 5 chiêu mộ lệnh!");
    sound("skill");
  };
  const startBattle = (index) => {
    if (index > state.completed)
      return notify("Hãy hoàn thành ải trước để mở khóa.");
    if (state.stamina < 8) {
      setModal("supplies");
      return notify("Cần 8 thể lực để xuất chinh.");
    }
    setState((s) => ({ ...s, stamina: s.stamina - 8 }));
    setActiveBattle({ stage: index, snapshot: structuredClone(state) });
  };
  const finishBattle = (result, index) => {
    if (result === "win") {
      const reward = STAGES[index];
      setState((s) => ({
        ...s,
        gold: s.gold + reward.gold,
        jade: s.jade + reward.jade,
        completed: Math.max(s.completed, index + 1),
        victories: s.victories + 1,
      }));
      notify(`Khải hoàn! +${format(reward.gold)} bạc · +${reward.jade} ngọc`);
    }
    setActiveBattle(null);
  };
  const doSummon = (count) => {
    if (summoning) return;
    const scrollCost = Math.min(state.scrolls, count);
    const jadeCost = (count - scrollCost) * 200;
    if (state.jade < jadeCost)
      return notify(
        "Chưa đủ ngọc hoặc chiêu mộ lệnh. Hãy vượt ải và nhận lễ mỗi ngày.",
      );
    const results = summon(count);
    const shards = { ...state.shards };
    results.forEach((h) => {
      shards[h.id] += 20;
    });
    setState((s) => ({
      ...s,
      jade: s.jade - jadeCost,
      scrolls: s.scrolls - scrollCost,
      shards,
    }));
    setSummoning(true);
    sound("skill");
    // Results and costs are committed together before the reveal animation.
    setSummonResults(results);
    timerRef.current = setTimeout(() => setSummoning(false), 1400);
  };
  const changeFormation = (id) => {
    const team = [...state.team];
    const existing = team.indexOf(id);
    if (existing === formationSlot) return;
    if (existing !== -1)
      [team[formationSlot], team[existing]] = [
        team[existing],
        team[formationSlot],
      ];
    else team[formationSlot] = id;
    setState((s) => ({ ...s, team }));
    notify("Đã cập nhật đội hình xuất chiến.");
  };
  const buy = (kind) => {
    const cost = kind === "gold" ? 100 : kind === "stamina" ? 80 : 200;
    if (state.jade < cost)
      return notify("Chưa đủ ngọc. Hãy vượt ải để nhận thêm.");
    if (kind === "stamina" && state.stamina >= 120)
      return notify("Thể lực đã đầy 120/120.");
    setState((s) => ({
      ...s,
      jade: s.jade - cost,
      ...(kind === "gold"
        ? { gold: s.gold + 10000 }
        : kind === "stamina"
          ? { stamina: Math.min(120, s.stamina + 60) }
          : { scrolls: s.scrolls + 1 }),
    }));
    notify("Đổi vật phẩm thành công!");
  };

  return (
    <div
      className="app-shell"
      onClick={(e) => {
        if (e.target.closest("button")) sound();
      }}
    >
      <div className="ambient-grain" aria-hidden="true" />
      {mobileNav && (
        <div className="sidebar-scrim" onClick={() => setMobileNav(false)} />
      )}
      <aside className={`sidebar ${mobileNav ? "is-open" : ""}`}>
        <button
          className="brand"
          onClick={() => go("home")}
          aria-label="Tam Quốc Truyền Kỳ - Đại sảnh"
        >
          <div className="brand-mark">
            <Crown strokeWidth={1.2} size={31} />
          </div>
          <span>
            TAM QUỐC<small>TRUYỀN KỲ</small>
          </span>
        </button>
        <div className="sidebar-rule">
          <i />
          <Ornament />
          <i />
        </div>
        <span className="nav-caption">KHÁM PHÁ THIÊN HẠ</span>
        <nav aria-label="Điều hướng chính">
          {NAV.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              className={`nav-link ${page === id ? "active" : ""}`}
              aria-current={page === id ? "page" : undefined}
              onClick={() => go(id)}
            >
              <Icon size={19} strokeWidth={1.5} />
              <span>{label}</span>
              {badge && (
                <small className={id === "summon" ? "new-badge" : ""}>
                  {badge}
                </small>
              )}
              {page === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-event">
          <div className="event-symbol">
            <Gift size={23} strokeWidth={1.4} />
          </div>
          <span>HÀNH TRÌNH MỚI</span>
          <h3>Lễ tân chúa công</h3>
          <p>Mỗi ngày một bất ngờ</p>
          <button onClick={claimDaily}>
            {dailyClaimed ? "Đã nhận hôm nay" : "Nhận quà ngay"}
            <ArrowRight size={13} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button className="help-link" onClick={() => setModal("guide")}>
            <CircleHelp size={16} /> Cẩm nang chúa công
            <ChevronRight size={14} />
          </button>
          <div className="profile">
            <Portrait hero={HEROES[1]} className="profile-avatar" />
            <div>
              <strong>
                Chúa Công<em>Lv.18</em>
              </strong>
              <span>
                <i /> S1 · Long Thành
              </span>
            </div>
            <button
              className="icon-button"
              aria-label="Cài đặt"
              onClick={() => setModal("settings")}
            >
              <Settings size={17} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Mở menu"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={21} />
            </button>
            <span>THIÊN HẠ</span>
            <ChevronRight size={12} />
            <strong>{NAV.find((n) => n.id === page)?.label}</strong>
          </div>
          <div className="resources">
            <button
              className="resource"
              aria-label={`Bạc ${format(state.gold)}, đổi tài nguyên`}
              onClick={() => setModal("supplies")}
            >
              <span className="resource-icon gold">
                <Coins size={17} />
              </span>
              <strong>{format(state.gold)}</strong>
              <Plus size={12} />
            </button>
            <button
              className="resource"
              aria-label={`Ngọc ${format(state.jade)}, đổi tài nguyên`}
              onClick={() => setModal("supplies")}
            >
              <span className="resource-icon jade">
                <Diamond size={17} />
              </span>
              <strong>{format(state.jade)}</strong>
              <Plus size={12} />
            </button>
            <button
              className="resource stamina"
              aria-label={`Thể lực ${state.stamina} trên 120`}
              onClick={() => setModal("supplies")}
            >
              <Zap size={17} fill="currentColor" />
              <strong>
                {state.stamina}
                <small>/120</small>
              </strong>
              <Plus size={12} />
            </button>
            <span className="topbar-divider" />
            <button
              className="icon-button sound-control"
              aria-label={state.sound ? "Tắt âm thanh" : "Bật âm thanh"}
              onClick={() => setState((s) => ({ ...s, sound: !s.sound }))}
            >
              {state.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              className="icon-button notification"
              aria-label="Mở hộp thư"
              onClick={() => setModal("inbox")}
            >
              <Bell size={18} />
              {!dailyClaimed && <i />}
            </button>
          </div>
        </header>

        <main className={`main-content page-${page}`}>
          {saveFailed && (
            <div className="save-warning">
              Trình duyệt không cho phép lưu tiến trình. Hãy bật bộ nhớ trang để
              giữ kết quả sau khi tải lại.
            </div>
          )}
          {page === "home" && (
            <>
              <CityHub
                state={state}
                onNavigate={go}
                onHero={setHeroId}
                onBattle={() => startBattle(stageIndex)}
                onSupplies={() => setModal("supplies")}
                onDaily={claimDaily}
                dailyClaimed={dailyClaimed}
              />
              <section className="city-roster generals-section">
                <div className="section-heading">
                  <div>
                    <span className="section-index">武</span>
                    <h2>Danh tướng dưới trướng</h2>
                    <span className="subtle-pill">HÀO KIỆT HỘI TỤ</span>
                  </div>
                  <button className="text-button" onClick={() => go("heroes")}>
                    Bồi dưỡng tướng
                    <ArrowRight size={15} />
                  </button>
                </div>
                <div className="hero-grid home-heroes">
                  {HEROES.map((hero) => (
                    <HeroCard
                      key={hero.id}
                      hero={hero}
                      state={state}
                      onClick={() => setHeroId(hero.id)}
                    />
                  ))}
                </div>
              </section>
            </>
          )}

          {page === "heroes" && (
            <>
              <PageHeading
                kicker="ANH HÙNG HỘI TỤ"
                title="Danh tướng"
                description="Mỗi danh tướng, một huyền thoại. Cùng bạn viết nên thiên hạ."
              />
              <div className="collection-toolbar">
                <div className="tabs">
                  {["Tất cả", "Thục", "Ngô", "Quần"].map((f) => (
                    <button
                      key={f}
                      className={filter === f ? "active" : ""}
                      onClick={() => setFilter(f)}
                    >
                      {f}
                      {f === "Tất cả" && <small>06</small>}
                    </button>
                  ))}
                </div>
                <span>
                  <ArrowDownUp size={14} /> Sắp theo phẩm chất
                </span>
              </div>
              <div className="hero-grid collection-grid">
                {HEROES.filter(
                  (h) => filter === "Tất cả" || h.faction === filter,
                ).map((hero) => (
                  <HeroCard
                    key={hero.id}
                    hero={hero}
                    state={state}
                    onClick={() => setHeroId(hero.id)}
                  />
                ))}
              </div>
              <div className="info-note">
                <Sparkles size={17} />
                <span>
                  Chọn một danh tướng để xem tuyệt kỹ, nâng cấp và đột phá. Mảnh
                  tướng nhận được qua Chiêu mộ.
                </span>
              </div>
            </>
          )}

          {page === "formation" && (
            <>
              <PageHeading
                kicker="DỤNG BINH NHƯ THẦN"
                title="Bày binh bố trận"
                description="Năm danh tướng. Một ý chí. Hàng trước bảo vệ đồng đội khỏi đòn đánh thường."
              />
              <div className="formation-layout">
                <section className="formation-board">
                  <div className="board-top">
                    <span>
                      <Shield size={16} /> ĐỘI HÌNH XUẤT CHIẾN
                    </span>
                    <strong>
                      <Swords size={15} />
                      {format(power)}
                    </strong>
                  </div>
                  <div className="formation-slots">
                    {state.team.map((id, i) => (
                      <button
                        key={i}
                        className={`formation-unit slot-${i} ${formationSlot === i ? "selected" : ""}`}
                        onClick={() => setFormationSlot(i)}
                        aria-label={`Vị trí ${i + 1}: ${heroById(id).name}`}
                      >
                        <span className="slot-index">0{i + 1}</span>
                        <Chibi hero={heroById(id)} />
                        <span className="formation-unit-name">
                          {heroById(id).name}
                          <small>Lv.{state.levels[id]}</small>
                        </span>
                        <span className="unit-base" />
                      </button>
                    ))}
                  </div>
                  <div className="board-bottom">
                    <span>
                      <i /> Hàng trước: vị trí 01 – 02
                    </span>
                    <span>
                      Hàng sau: vị trí 03 – 05 <i />
                    </span>
                  </div>
                </section>
                <aside className="formation-selector">
                  <span className="eyebrow">VỊ TRÍ 0{formationSlot + 1}</span>
                  <h3>Chọn danh tướng</h3>
                  <p>
                    Tướng trong đội sẽ đổi chỗ. Tướng dự bị sẽ thay vào vị trí
                    đã chọn.
                  </p>
                  {HEROES.map((h) => (
                    <button
                      className={`formation-option ${state.team[formationSlot] === h.id ? "active" : ""}`}
                      key={h.id}
                      onClick={() => changeFormation(h.id)}
                    >
                      <Portrait hero={h} />
                      <div>
                        <strong>{h.name}</strong>
                        <span>
                          {h.role} · Lv.{state.levels[h.id]}
                        </span>
                      </div>
                      {state.team[formationSlot] === h.id ? (
                        <Check size={16} />
                      ) : (
                        <ArrowDownUp size={15} />
                      )}
                    </button>
                  ))}
                </aside>
              </div>
              <div className="formation-footer">
                <div>
                  <Sparkles size={20} />
                  <span>
                    <strong>Thục quốc đồng tâm</strong>
                    <small>
                      {
                        state.team.filter(
                          (id) => heroById(id).faction === "Thục",
                        ).length
                      }{" "}
                      tướng Thục trong đội · Lực chiến tăng khi nâng cấp danh
                      tướng
                    </small>
                  </span>
                </div>
                <GoldButton onClick={() => startBattle(stageIndex)}>
                  Đội hình sẵn sàng
                  <Swords size={17} />
                </GoldButton>
              </div>
            </>
          )}

          {page === "campaign" && (
            <>
              <PageHeading
                kicker="VẠN DẶM CHINH ĐỒ"
                title="Chinh phục thiên hạ"
                description="Từ ngọn lửa Khăn Vàng đến giấc mộng Trung Nguyên. Vận mệnh nằm trong tay bạn."
              />
              <section className="campaign-chapter">
                <div>
                  <span className="eyebrow">CHƯƠNG I</span>
                  <h2>Quần hùng khởi nghĩa</h2>
                  <p>Năm 184. Hán thất suy vi, quần hùng trỗi dậy.</p>
                </div>
                <div className="chapter-progress">
                  <strong>
                    {state.completed}
                    <small>/ 8</small>
                  </strong>
                  <span>ẢI ĐÃ VƯỢT QUA</span>
                  <div className="progress-track">
                    <i style={{ width: `${(state.completed / 8) * 100}%` }} />
                  </div>
                </div>
              </section>
              <div className="stage-grid">
                {STAGES.map((s, i) => {
                  const locked = i > state.completed;
                  const done = i < state.completed;
                  return (
                    <article
                      key={s.name}
                      className={`stage-card ${locked ? "locked" : ""} ${done ? "completed" : ""}`}
                    >
                      <div className="stage-card-header">
                        <span>ẢI {String(i + 1).padStart(2, "0")}</span>
                        {locked ? (
                          <LockKeyhole size={17} />
                        ) : done ? (
                          <CheckCheck size={18} />
                        ) : (
                          <span className="current-stage">ĐANG CHINH PHỤC</span>
                        )}
                      </div>
                      <span className="stage-place">{s.place}</span>
                      <h3>{s.name}</h3>
                      <p>{s.subtitle}</p>
                      <div className="stage-enemy">
                        <Swords size={13} /> Đối thủ: {s.enemy}
                        <span>{s.difficulty}</span>
                      </div>
                      <div className="stage-rewards">
                        <span>
                          <Coins size={15} />
                          {format(s.gold)}
                        </span>
                        <span>
                          <Diamond size={14} />
                          {s.jade}
                        </span>
                      </div>
                      <button
                        className={`stage-action ${locked ? "" : "available"}`}
                        disabled={locked}
                        onClick={() => startBattle(i)}
                      >
                        {locked
                          ? "Chưa mở khóa"
                          : done
                            ? "Khiêu chiến lại"
                            : "Xuất chinh"}
                        {!locked && (
                          <>
                            <span>
                              <Zap size={12} />8
                            </span>
                            <ArrowRight size={15} />
                          </>
                        )}
                      </button>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          {page === "summon" && (
            <>
              <PageHeading
                kicker="QUẦN ANH TỀ TỰU"
                title="Chiêu Hiền Các"
                description="Hữu duyên thiên lý năng tương ngộ. Một lần chiêu mộ, một tri kỷ đồng hành."
              />
              <section
                className={`summon-sanctuary ${summoning ? "is-summoning" : ""}`}
              >
                <div className="summon-lantern left" />
                <div className="summon-lantern right" />
                <div className="summon-circle">
                  <div className="summon-ring" />
                  <div className="summon-ring second" />
                  <Sparkles size={42} strokeWidth={1} />
                  <span>招</span>
                  <small>HIỀN TÀI HỘI TỤ</small>
                </div>
                <Portrait
                  hero={HEROES[0]}
                  className="summon-character character-left"
                />
                <Portrait
                  hero={HEROES[2]}
                  className="summon-character character-right"
                />
                <div className="summon-title">
                  <span className="eyebrow">DANH TƯỚNG TRUYỀN KỲ</span>
                  <h2>Chiêu mộ anh hùng</h2>
                  <p>
                    Mỗi lượt nhận 20 mảnh danh tướng.
                    <br />
                    Thập liên bảo đảm ít nhất một tướng SSR.
                  </p>
                  <span className="summon-scrolls">
                    <ScrollText size={16} />
                    Đang có <strong>{state.scrolls}</strong> chiêu mộ lệnh
                  </span>
                </div>
                <div className="summon-actions">
                  <button
                    className="outline-button"
                    disabled={summoning}
                    onClick={() => doSummon(1)}
                  >
                    <span>Chiêu mộ 1 lần</span>
                    <small>
                      <ScrollText size={13} />
                      {Math.min(state.scrolls, 1)}
                      {state.scrolls < 1 && (
                        <>
                          <Diamond size={12} />
                          200
                        </>
                      )}
                    </small>
                  </button>
                  <GoldButton disabled={summoning} onClick={() => doSummon(10)}>
                    <span>
                      {summoning ? "Đang chiêu mộ…" : "Chiêu mộ 10 lần"}
                    </span>
                    <small>
                      <ScrollText size={13} />
                      {Math.min(state.scrolls, 10)}
                      {state.scrolls < 10 && (
                        <>
                          <Diamond size={12} />
                          {format((10 - state.scrolls) * 200)}
                        </>
                      )}
                    </small>
                  </GoldButton>
                </div>
              </section>
              <div className="summon-guarantee">
                <Shield size={19} />
                <span>
                  Ưu tiên dùng chiêu mộ lệnh; mỗi lượt còn thiếu tốn 200 ngọc.
                  Tướng đã sở hữu được đổi thành mảnh để đột phá.
                </span>
              </div>
            </>
          )}

          <footer className="page-footer">
            <span>TAM QUỐC TRUYỀN KỲ</span>
            <Ornament />
            <span>MỘT THỜI LOẠN THẾ · MỘT ĐỜI ANH HÙNG</span>
            <button onClick={() => setModal("guide")}>
              Cẩm nang
              <ArrowRight size={11} />
            </button>
          </footer>
        </main>
      </div>

      {heroId &&
        (() => {
          const h = heroById(heroId);
          const level = state.levels[heroId];
          return (
            <Modal
              title={h.name}
              onClose={() => setHeroId(null)}
              className="hero-detail"
              hideHeader
            >
              <div className="detail-art">
                <Portrait hero={h} />
                <span className="rarity ssr">{h.rarity}</span>
                <div className="detail-art-title">
                  <Stars />
                  <span>{h.title}</span>
                  <h2>{h.name}</h2>
                  <p>“{h.quote}”</p>
                </div>
              </div>
              <div className="detail-body">
                <button
                  className="icon-button detail-close"
                  aria-label="Đóng"
                  onClick={() => setHeroId(null)}
                >
                  <X size={20} />
                </button>
                <span className="eyebrow">
                  {h.faction} QUỐC · {h.role}
                </span>
                <h3>Hào khí danh tướng</h3>
                <div className="detail-power">
                  <Swords size={20} />
                  <strong>{format(heroPower(h, level))}</strong>
                  <span>LỰC CHIẾN</span>
                </div>
                <div className="detail-stats">
                  <div>
                    <Heart size={15} />
                    <span>Sinh lực</span>
                    <strong>{format(10000 + level * 240)}</strong>
                  </div>
                  <div>
                    <Swords size={15} />
                    <span>Công kích</span>
                    <strong>{format(1400 + level * 64)}</strong>
                  </div>
                  <div>
                    <Medal size={15} />
                    <span>Cấp độ</span>
                    <strong>
                      {level}
                      <small> / 60</small>
                    </strong>
                  </div>
                </div>
                <div className="skill-info">
                  <span className="skill-icon">
                    <Flame size={23} />
                  </span>
                  <div>
                    <small>TUYỆT KỸ · 66 NỘ KHÍ</small>
                    <h4>{h.skill}</h4>
                    <p>{h.description}</p>
                  </div>
                </div>
                <GoldButton
                  onClick={() => upgrade(h.id)}
                  disabled={level >= 60}
                >
                  <Sparkles size={16} />
                  {level >= 60 ? "Đã đạt cấp tối đa" : "Nâng cấp tướng"}
                  <span>
                    <Coins size={14} />
                    {format(upgradeCost(level))}
                  </span>
                </GoldButton>
                <button
                  className="outline-button breakthrough-button"
                  onClick={() => breakthrough(h.id)}
                  disabled={level >= 60}
                >
                  Đột phá +3 cấp<span>{state.shards[h.id]} / 40 mảnh</span>
                </button>
                <span className="detail-footnote">
                  Nâng cấp tăng 420 lực chiến mỗi cấp.
                </span>
              </div>
            </Modal>
          );
        })()}

      {summonResults && (
        <Modal
          title="Danh tướng giáng lâm"
          onClose={() => {
            if (!summoning) setSummonResults(null);
          }}
          className={`summon-results ${summoning ? "revealing" : ""}`}
        >
          <p className="result-description">
            {summoning
              ? "Tinh tú chuyển mình, anh hùng hội tụ…"
              : "Hữu duyên tương ngộ. Cùng viết tiếp huyền thoại."}
          </p>
          <div
            className={`summon-result-grid ${summonResults.length === 1 ? "single" : ""}`}
          >
            {summonResults.map((h, i) => (
              <div
                className="summon-result-card"
                key={i}
                style={{ "--delay": `${i * 75}ms` }}
              >
                <Portrait hero={h}>
                  <span className={`rarity ${h.rarity.toLowerCase()}`}>
                    {h.rarity}
                  </span>
                  <div>
                    <Stars />
                    <h3>{h.name}</h3>
                    <span>+20 mảnh tướng</span>
                  </div>
                </Portrait>
              </div>
            ))}
          </div>
          <div className="result-buttons">
            <button
              className="outline-button"
              disabled={summoning}
              onClick={() => setSummonResults(null)}
            >
              Tiếp tục hành trình
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}

      {activeBattle && (
        <Battle
          state={activeBattle.snapshot}
          stage={activeBattle.stage}
          onFinish={finishBattle}
          sound={sound}
        />
      )}

      {modal && (
        <Modal
          title={
            {
              supplies: "Quân nhu tiếp viện",
              inbox: "Thư từ thiên hạ",
              guide: "Cẩm nang chúa công",
              settings: "Cài đặt",
            }[modal]
          }
          onClose={() => setModal(null)}
          className="utility-modal"
        >
          {modal === "supplies" && (
            <>
              <p className="modal-intro">
                Dùng ngọc nhận từ chiến dịch để tiếp tế cho hành trình.
              </p>
              <div className="supply-items">
                {[
                  {
                    kind: "gold",
                    name: "Rương bạc",
                    amount: "+10.000 bạc",
                    cost: 100,
                    icon: Coins,
                  },
                  {
                    kind: "stamina",
                    name: "Tiệc quân lương",
                    amount: "+60 thể lực · tối đa 120",
                    cost: 80,
                    icon: Zap,
                  },
                  {
                    kind: "scroll",
                    name: "Chiêu mộ lệnh",
                    amount: "+1 chiêu mộ lệnh",
                    cost: 200,
                    icon: ScrollText,
                  },
                ].map(({ kind, name, amount, cost, icon: Icon }) => (
                  <div className="supply-item" key={kind}>
                    <span className="supply-icon">
                      <Icon size={26} />
                    </span>
                    <div>
                      <h3>{name}</h3>
                      <p>{amount}</p>
                    </div>
                    <button
                      className="outline-button"
                      onClick={() => buy(kind)}
                    >
                      <Diamond size={13} />
                      {cost}
                    </button>
                  </div>
                ))}
              </div>
              <span className="detail-footnote">
                Ngọc hiện có: {format(state.jade)} · Không có giao dịch tiền
                thật.
              </span>
            </>
          )}
          {modal === "inbox" && (
            <div className="inbox-letter">
              <span className="letter-seal">
                <Crown size={30} />
              </span>
              <span className="eyebrow">GỬI TỚI TÂN CHÚA CÔNG</span>
              <h3>Thiên hạ đang chờ người!</h3>
              <p>
                Sáu danh tướng đã sẵn sàng phò tá. Nhận lễ đăng nhập, chọn đội
                hình và bắt đầu cuộc chinh phục của riêng mình.
              </p>
              <div className="letter-rewards">
                <span>
                  <Coins size={20} />
                  5.000
                </span>
                <span>
                  <Diamond size={20} />
                  200
                </span>
                <span>
                  <ScrollText size={20} />5
                </span>
              </div>
              <GoldButton onClick={claimDaily} disabled={dailyClaimed}>
                {dailyClaimed ? (
                  <>
                    <Check size={16} />
                    Đã nhận lễ hôm nay
                  </>
                ) : (
                  <>
                    <Gift size={17} />
                    Nhận lễ chào mừng
                  </>
                )}
              </GoldButton>
            </div>
          )}
          {modal === "guide" && (
            <div className="guide-steps">
              {[
                {
                  icon: Users,
                  title: "01. Chiêu hiền đãi sĩ",
                  text: "Bạn bắt đầu với 6 danh tướng. Vào Tướng lĩnh để xem kỹ năng và dùng bạc nâng cấp. Mỗi 40 mảnh tướng giúp đột phá thêm 3 cấp.",
                },
                {
                  icon: Shield,
                  title: "02. Bày binh bố trận",
                  text: "Chọn một trong 5 vị trí, sau đó chọn danh tướng để thay vào hoặc đổi chỗ. Tất cả tướng trong đội sẽ cùng xuất chiến.",
                },
                {
                  icon: Swords,
                  title: "03. Xuất chinh thiên hạ",
                  text: "Mỗi trận tốn 8 thể lực. Tướng tự công kích và tích nộ. Đủ 66 nộ có thể dùng tuyệt kỹ. Khi cả hai tướng trong một cặp đều còn sống và đủ 66 nộ, có thể dùng Hợp kích. Tự động ưu tiên hợp kích; tắt Tự động để tự chọn thời điểm.",
                },
                {
                  icon: Trophy,
                  title: "04. Khải hoàn và trưởng thành",
                  text: "Chiến thắng và nhận thưởng để mở ải tiếp theo. Dùng bạc nâng cấp, ngọc để chiêu mộ hoặc tiếp tế. Tiến trình tự lưu trên trình duyệt này.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title}>
                  <span>
                    <Icon size={21} />
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {modal === "settings" && (
            <div className="settings-content">
              <div className="setting-row">
                <span>
                  <strong>Âm thanh hiệu ứng</strong>
                  <small>Tiếng tương tác, giao chiến và tuyệt kỹ</small>
                </span>
                <button
                  className={`toggle ${state.sound ? "on" : ""}`}
                  role="switch"
                  aria-checked={state.sound}
                  aria-label="Âm thanh hiệu ứng"
                  onClick={() => setState((s) => ({ ...s, sound: !s.sound }))}
                >
                  <span />
                </button>
              </div>
              <div className="setting-row">
                <span>
                  <strong>Tiến trình của bạn</strong>
                  <small>
                    Tự động lưu trên trình duyệt · {state.victories} trận thắng
                  </small>
                </span>
                <Check size={19} />
              </div>
              <div className="settings-warning">
                <p>
                  Bắt đầu lại sẽ xóa toàn bộ tiến trình của game trên trình
                  duyệt này.
                </p>
                <button
                  className="danger-button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Bạn muốn xóa tiến trình và bắt đầu một hành trình mới?",
                      )
                    ) {
                      setState(freshState());
                      setModal(null);
                      go("home");
                      notify("Hành trình mới đã bắt đầu.");
                    }
                  }}
                >
                  Bắt đầu lại hành trình
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
      {toast && (
        <div className="toast" key={toast.key} role="status">
          <span>
            <Check size={16} />
          </span>
          {toast.message}
          <button
            className="icon-button"
            aria-label="Đóng thông báo"
            onClick={() => setToast(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function PageHeading({ kicker, title, description }) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{kicker}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <Ornament className="heading-ornament" />
    </div>
  );
}

function Battle({ state, stage, onFinish, sound }) {
  const [match, setMatch] = useState(() => makeBattle(state, stage));
  const [speed, setSpeed] = useState(1);
  const [auto, setAuto] = useState(true);
  const [paused, setPaused] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [settled, setSettled] = useState(false);
  const fieldRef = useRef(null);
  const [visual, setVisual] = useState(null);
  const battle = STAGES[stage];
  useLayoutEffect(() => {
    if (!match.event || !fieldRef.current) return;
    const event = match.event;
    const field = fieldRef.current;
    const rect = field.getBoundingClientRect();
    const point = (side, id) => {
      const unit = field.querySelector(
        `[data-unit="${side}-${id}"] .battle-portrait`,
      );
      const box = unit?.getBoundingClientRect();
      return box
        ? {
            x: box.left - rect.left + box.width / 2,
            y: box.top - rect.top + box.height / 2,
          }
        : null;
    };
    const origin = point(event.actorSide, event.actor);
    const targets = event.targets
      .map((id) => point(event.side, id))
      .filter(Boolean);
    if (origin)
      setVisual({
        key: event.key,
        kind: event.kind,
        enemy: event.actorSide === "enemies",
        origin,
        targets,
        width: rect.width,
        height: rect.height,
      });
  }, [match.event?.key]);
  useEffect(() => {
    if (match.result || paused || confirmExit) return;
    const timer = setInterval(
      () => setMatch((m) => advanceBattle(m, auto)),
      950 / speed,
    );
    return () => clearInterval(timer);
  }, [speed, auto, paused, confirmExit, match.result]);
  useEffect(() => {
    if (match.event)
      sound(["skill", "combo"].includes(match.event.kind) ? "skill" : "hit");
  }, [match.event?.key, sound]);
  const close = () => {
    if (match.result) return;
    setConfirmExit(true);
  };
  const settle = () => {
    if (settled) return;
    setSettled(true);
    onFinish(match.result, stage);
  };
  return (
    <Modal
      title={`Trận chiến: ${battle.name}`}
      onClose={close}
      className="battle-modal"
      hideHeader
    >
      <header className="battle-header">
        <button className="icon-button" aria-label="Rời trận" onClick={close}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <span className="eyebrow">
            CHƯƠNG I · ẢI {String(stage + 1).padStart(2, "0")}
          </span>
          <h2>{battle.name}</h2>
        </div>
        <div className="battle-round">
          <span>GIAO TRANH</span>
          <strong>
            {String(Math.floor(match.turn / 10) + 1).padStart(2, "0")}
          </strong>
        </div>
      </header>
      <div
        ref={fieldRef}
        className={`battlefield ${["skill", "combo"].includes(match.event?.kind) ? "skill-impact" : ""}`}
      >
        <div className="battle-sky" />
        <div className="battlefield-grid" />
        <div className="battle-versus">
          <span>
            CHÚA CÔNG<small>{format(teamPower(state))} LỰC CHIẾN</small>
          </span>
          <Swords size={28} />
          <span>
            QUÂN {battle.enemy.toUpperCase()}
            <small>
              Lv.{enemyLevel(stage)} · {battle.difficulty.toUpperCase()}
            </small>
          </span>
        </div>
        <div className="armies">
          {["allies", "enemies"].map((side) => (
            <div className={`army ${side}`} key={side}>
              {match[side].map((unit) => {
                const hero = heroById(unit.id);
                const hit =
                  match.event?.side === side &&
                  match.event.targets.includes(unit.id);
                const attacking =
                  match.event?.actorSide === side &&
                  match.event.actor === unit.id;
                return (
                  <div
                    key={unit.id}
                    data-unit={`${side}-${unit.id}`}
                    className={`battle-unit battle-slot-${unit.slot} ${unit.hp <= 0 ? "fallen" : ""} ${hit ? "taking-hit" : ""} ${attacking ? "attacking" : ""}`}
                  >
                    <div className="battle-unit-label">
                      <span>{hero.name}</span>
                      <small>
                        Lv.
                        {side === "allies"
                          ? state.levels[unit.id]
                          : enemyLevel(stage)}
                      </small>
                    </div>
                    <div className="hp-bar">
                      <i
                        style={{
                          width: `${Math.max(0, (unit.hp / unit.maxHp) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="battle-portrait">
                      <Chibi hero={hero} />
                      <span className="unit-faction">{hero.faction}</span>
                      {hit && unit.hp >= 0 && (
                        <span
                          key={match.event.key}
                          className={`damage-number ${match.event.kind === "critical" ? "critical" : ""}`}
                        >
                          {match.event.kind === "critical" && (
                            <small>BẠO KÍCH</small>
                          )}
                          -{format(match.event.damage)}
                        </span>
                      )}
                      {unit.hp <= 0 && (
                        <div className="fallen-cover">
                          <X size={27} />
                        </div>
                      )}
                    </div>
                    <div className="energy-bar">
                      <i style={{ width: `${unit.energy}%` }} />
                    </div>
                    <div className="battle-unit-shadow" />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {visual && (
          <svg
            key={visual.key}
            className={`combat-vfx ${visual.enemy ? "enemy-vfx" : ""} ${["skill", "combo"].includes(visual.kind) ? "ultimate-vfx" : ""}`}
            viewBox={`0 0 ${visual.width} ${visual.height}`}
            aria-hidden="true"
          >
            <defs>
              <filter id="combat-glow">
                <feGaussianBlur stdDeviation="3" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {visual.targets.map((target, i) => (
              <g key={i}>
                <path
                  className="attack-trail"
                  d={`M ${visual.origin.x} ${visual.origin.y} Q ${(visual.origin.x + target.x) / 2} ${Math.min(visual.origin.y, target.y) - 50} ${target.x} ${target.y}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={["skill", "combo"].includes(visual.kind) ? 4 : 2}
                  pathLength="100"
                  filter="url(#combat-glow)"
                />
                <g transform={`translate(${target.x} ${target.y})`}>
                  <circle
                    className="impact-ring"
                    r={["skill", "combo"].includes(visual.kind) ? 38 : 17}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    className="impact-star"
                    d="M -28 0 H 28 M 0 -28 V 28 M -16 -16 16 16 M -16 16 16 -16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    filter="url(#combat-glow)"
                  />
                </g>
              </g>
            ))}
          </svg>
        )}
        {["skill", "combo"].includes(match.event?.kind) && (
          <div
            className={`skill-announcement skill-${match.event.actor} ${match.event.kind === "combo" ? "combo-announcement" : ""}`}
            key={match.event.key}
          >
            <div className="skill-slash" />
            <Sparkles size={24} />
            <span>
              {match.event.kind === "combo"
                ? "HỢP KÍCH · " +
                  match.event.partners
                    .map((id) => heroById(id).name)
                    .join(" & ")
                : heroById(match.event.actor).name}
            </span>
            <strong>{match.event.label}</strong>
            <div className="skill-particles">
              {Array.from({ length: 12 }, (_, i) => (
                <i key={i} style={{ "--i": i }} />
              ))}
            </div>
          </div>
        )}
        <div className="battle-log" aria-live="off">
          {match.log.slice(0, 2).map((line, i) => (
            <p key={`${match.turn}-${i}`}>{line}</p>
          ))}
        </div>
        {paused && !confirmExit && (
          <div className="battle-paused">
            <span>Trận chiến tạm dừng</span>
            <GoldButton onClick={() => setPaused(false)}>
              Tiếp tục chiến đấu
            </GoldButton>
          </div>
        )}
        {confirmExit && (
          <div className="battle-paused">
            <span>Rút lui khỏi trận chiến?</span>
            <p>8 thể lực đã dùng sẽ không được hoàn lại.</p>
            <div>
              <button
                className="outline-button"
                onClick={() => {
                  setConfirmExit(false);
                  setPaused(false);
                }}
              >
                Tiếp tục chiến đấu
              </button>
              <button
                className="danger-button"
                onClick={() => onFinish("retreat", stage)}
              >
                Rút lui
              </button>
            </div>
          </div>
        )}
        {match.result && (
          <div className={`battle-result ${match.result}`}>
            <div className="victory-emblem">
              {match.result === "win" ? (
                <Trophy size={45} strokeWidth={1.2} />
              ) : (
                <Shield size={45} strokeWidth={1.2} />
              )}
            </div>
            <span className="eyebrow">
              {match.result === "win"
                ? "KHẢI HOÀN TRỞ VỀ"
                : "THẮNG BẠI LÀ CHUYỆN BINH GIA"}
            </span>
            <h2>{match.result === "win" ? "Đại thắng!" : "Bại trận"}</h2>
            <p>
              {match.result === "win"
                ? `Đã đánh bại quân ${battle.enemy}. Thiên hạ ghi danh chúa công!`
                : "Hãy nâng cấp danh tướng và điều chỉnh đội hình để trở lại."}
            </p>
            {match.result === "win" && (
              <>
                <Stars />
                <div className="victory-rewards">
                  <span>
                    <Coins size={21} />
                    <strong>+{format(battle.gold)}</strong>
                    <small>BẠC</small>
                  </span>
                  <span>
                    <Diamond size={21} />
                    <strong>+{battle.jade}</strong>
                    <small>NGỌC</small>
                  </span>
                </div>
              </>
            )}
            <GoldButton onClick={settle} disabled={settled}>
              {match.result === "win" ? "Nhận thưởng" : "Trở về luyện tướng"}
              <ArrowRight size={17} />
            </GoldButton>
          </div>
        )}
      </div>
      <div className="combo-controls">
        <div className="combo-controls-label">
          <Flame size={16} />
          <span>
            HỢP KÍCH<small>Mỗi tướng cần 66 nộ</small>
          </span>
        </div>
        <div className="combo-actions">
          {COMBOS.filter((combo) =>
            combo.pair.every((id) => state.team.includes(id)),
          ).map((combo) => {
            const ready = readyCombos(match).some(
              (item) => item.id === combo.id,
            );
            return (
              <button
                key={combo.id}
                className={`combo-button ${ready ? "ready" : ""}`}
                disabled={!ready || paused || confirmExit}
                onClick={() => setMatch((m) => castCombo(m, combo.id))}
                title={combo.description}
                aria-label={`Hợp kích ${combo.name}`}
                style={{ "--combo-color": combo.color }}
              >
                <span className="combo-pair">
                  {combo.pair.map((id) => (
                    <Portrait key={id} hero={heroById(id)} />
                  ))}
                </span>
                <span>
                  <strong>{combo.name}</strong>
                  <small>
                    {ready
                      ? "Sẵn sàng hợp kích!"
                      : combo.pair.map((id) => heroById(id).name).join(" + ")}
                  </small>
                </span>
                <Zap size={14} />
              </button>
            );
          })}
        </div>
      </div>
      <footer className="battle-controls">
        <div className="skill-buttons">
          {match.allies.map((u) => {
            const h = heroById(u.id);
            return (
              <button
                key={u.id}
                className={`skill-button ${u.energy >= 66 ? "ready" : ""}`}
                disabled={
                  u.energy < 66 ||
                  u.hp <= 0 ||
                  !!match.result ||
                  paused ||
                  confirmExit
                }
                onClick={() => setMatch((m) => castSkill(m, u.id))}
                aria-label={`Tuyệt kỹ ${h.name}`}
              >
                <Portrait hero={h} />
                <span>
                  {u.energy >= 66 ? <Flame size={12} /> : <Zap size={11} />}
                  {u.energy >= 66 ? "Tuyệt kỹ" : `${u.energy}%`}
                </span>
              </button>
            );
          })}
        </div>
        <div className="battle-toggles">
          <button
            className={auto ? "active" : ""}
            aria-pressed={auto}
            onClick={() => setAuto(!auto)}
          >
            <WandSparkles size={16} />
            <span>Tự động</span>
          </button>
          <button
            onClick={() => setSpeed(speed === 1 ? 2 : 1)}
            aria-label={`Tốc độ ${speed} lần`}
          >
            ×{speed}
          </button>
          <button
            className={paused ? "active" : ""}
            aria-label={paused ? "Tiếp tục" : "Tạm dừng"}
            onClick={() => setPaused(!paused)}
            disabled={!!match.result}
          >
            {paused ? "▶" : "Ⅱ"}
          </button>
        </div>
      </footer>
    </Modal>
  );
}

createRoot(document.getElementById("root")).render(<App />);
