import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gift,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  RefreshCw,
  Save,
  ScrollText,
  Search,
  Settings,
  Shield,
  Swords,
  Users,
  X,
} from "lucide-react";
import { api } from "./api.js";
import { format, portraitPosition } from "./game.js";
import "./admin.css";

const tabs = [
  { id: "overview", title: "Tổng quan", icon: LayoutDashboard },
  { id: "players", title: "Người chơi", icon: Users },
  { id: "heroes", title: "Danh tướng", icon: Swords },
  { id: "stages", title: "Chiến dịch", icon: ScrollText },
  { id: "gifts", title: "Giftcode", icon: Gift },
  { id: "settings", title: "Cấu hình", icon: Settings },
  { id: "audit", title: "Nhật ký", icon: Shield },
];
const actionNames = {
  "admin.create": "Tạo quản trị viên",
  "admin.login": "Đăng nhập admin",
  "admin.password": "Đổi mật khẩu admin",
  "admin.password.reset": "Khôi phục mật khẩu",
  "player.register": "Đăng ký người chơi",
  "player.resources": "Chỉnh tài nguyên",
  "player.status": "Đổi trạng thái tài khoản",
  "player.reset": "Đặt lại tiến trình",
  "config.update": "Lưu cấu hình game",
  "gift.create": "Tạo giftcode",
  "gift.status": "Đổi trạng thái giftcode",
  "gift.redeem": "Nhận quà giftcode",
};
const date = (value) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "Không hết hạn";
function Field({
  label,
  value,
  onChange,
  type = "text",
  min = 0,
  max = 1000000,
  ...props
}) {
  return (
    <label className="adm-field">
      {label}
      <input
        type={type}
        value={value}
        min={type === "number" ? min : undefined}
        max={type === "number" ? max : undefined}
        required
        onChange={(event) =>
          onChange(
            type === "number" && event.target.value !== ""
              ? Number(event.target.value)
              : event.target.value,
          )
        }
        {...props}
      />
    </label>
  );
}
function AuditTable({ entries }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th>Thời gian (VN)</th>
            <th>Người thực hiện</th>
            <th>Thao tác</th>
            <th>Chi tiết</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{date(entry.created_at)}</td>
              <td>{entry.actor}</td>
              <td>{actionNames[entry.action] || entry.action}</td>
              <td>
                <code title={entry.target}>{entry.target.slice(0, 18)}</code>
                {entry.details !== "{}" && <pre>{entry.details}</pre>}
              </td>
            </tr>
          ))}
          {!entries.length && (
            <tr>
              <td colSpan={4} className="adm-empty">
                Chưa có thao tác nào.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function Admin() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [config, setConfig] = useState(null);
  const [revision, setRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [players, setPlayers] = useState({ players: [], total: 0, page: 1 });
  const [query, setQuery] = useState("");
  const [codes, setCodes] = useState([]);
  const [audit, setAudit] = useState([]);
  const [selected, setSelected] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    document.title = "Quản trị — Tam Quốc Truyền Kỳ";
    api("/api/auth/session")
      .then((data) => {
        setConfigured(data.adminConfigured);
        if (data.account?.role === "admin") setSession(data);
      })
      .catch((failure) => setError(failure.message))
      .finally(() => setChecking(false));
  }, []);
  async function reload(currentSession = session) {
    const [summary, configuration, playerList, gifts, log] = await Promise.all([
      api("/api/admin/overview"),
      api("/api/admin/config"),
      api(`/api/admin/players?q=${encodeURIComponent(query)}`),
      api("/api/admin/giftcodes"),
      api("/api/admin/audit"),
    ]);
    if (!currentSession) return;
    setOverview(summary);
    setConfig(configuration.config);
    setRevision(configuration.revision);
    setPlayers(playerList);
    setCodes(gifts.codes);
    setAudit(log.entries);
    setDirty(false);
  }
  useEffect(() => {
    if (session)
      reload(session).catch((failure) => {
        setError(failure.message);
        if (failure.status === 401) setSession(null);
      });
  }, [session]);
  async function action(fn, success) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      setMessage(success);
    } catch (failure) {
      setError(failure.message);
      if (failure.status === 401) setSession(null);
    } finally {
      setBusy(false);
    }
  }
  async function login(event) {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget));
    await action(async () => {
      const result = await api("/api/auth/login", {
        method: "POST",
        body: input,
      });
      if (result.account.role !== "admin")
        throw new Error("Tài khoản này không có quyền quản trị.");
      setSession(result);
    }, "Đã đăng nhập quản trị.");
  }
  function update(section, key, value, index) {
    setConfig((old) => ({
      ...old,
      [section]:
        index === undefined
          ? { ...old[section], [key]: value }
          : old[section].map((item, i) =>
              i === index ? { ...item, [key]: value } : item,
            ),
    }));
    setDirty(true);
  }
  async function saveConfig(event) {
    event.preventDefault();
    await action(async () => {
      const data = await api(
        "/api/admin/config",
        { method: "PUT", body: { config, revision } },
        session.csrf,
      );
      setConfig(data.config);
      setRevision(data.revision);
      setDirty(false);
      const log = await api("/api/admin/audit");
      setAudit(log.entries);
    }, "Đã lưu cấu hình. Người chơi nhận cấu hình mới khi mở hoặc tải lại game.");
  }
  async function findPlayers(page = 1) {
    const data = await api(
      `/api/admin/players?q=${encodeURIComponent(query)}&page=${page}`,
    );
    setPlayers(data);
  }
  async function editPlayer(values) {
    const data = await api(
      `/api/admin/players/${selected.id}`,
      { method: "PATCH", body: { ...values, revision: selected.revision } },
      session.csrf,
    );
    setSelected({
      ...selected,
      ...data,
      ...(values.banned !== undefined ? { banned: values.banned } : {}),
    });
    await findPlayers(players.page);
    const summary = await api("/api/admin/overview");
    setOverview(summary);
  }
  function switchTab(id) {
    setTab(id);
    setError("");
    setMessage("");
    setSelected(null);
  }
  if (checking)
    return (
      <div className="adm-loading">
        <Shield size={30} />
        <p>Đang kiểm tra phiên quản trị…</p>
      </div>
    );
  if (!session)
    return (
      <div className="adm-login">
        <a className="adm-back" href="/">
          <ArrowLeft size={16} />
          Trở về game
        </a>
        <div className="adm-login-copy">
          <span>LONG THÀNH · TRUNG TÂM ĐIỀU HÀNH</span>
          <h1>
            Giữ vững giang sơn.
            <br />
            <em>Điều hành thiên hạ.</em>
          </h1>
          <p>
            Quản lý người chơi, danh tướng, chiến dịch và quà tặng trong cùng
            một nơi.
          </p>
        </div>
        <section className="adm-login-panel">
          <div className="adm-crest">
            <Crown size={31} />
          </div>
          <span className="eyebrow">TAM QUỐC TRUYỀN KỲ</span>
          <h2>Đăng nhập quản trị</h2>
          <p>Tài khoản admin do chủ máy chủ tạo riêng.</p>
          {error && (
            <div className="adm-alert error" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="adm-alert" role="status">
              {message}
            </div>
          )}
          {!configured && (
            <div className="adm-setup">
              <strong>Chưa có tài khoản admin</strong>
              <p>
                Chủ máy chủ chạy <code>npm run admin:create</code> trong
                terminal để đặt tên và mật khẩu. Không có mật khẩu mặc định.
              </p>
            </div>
          )}
          <form className="adm-login-form" onSubmit={login}>
            <label>
              Tên đăng nhập
              <input
                name="username"
                autoComplete="username"
                minLength={3}
                maxLength={32}
                required
              />
            </label>
            <label>
              Mật khẩu
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                minLength={12}
                maxLength={128}
                required
              />
            </label>
            <button disabled={busy || !configured} className="gold-button">
              <LockKeyhole size={16} />
              {busy ? "Đang đăng nhập…" : "Vào trang quản trị"}
            </button>
          </form>
          <span className="adm-login-note">
            <Shield size={13} />
            Phiên có thời hạn · Phân quyền tại máy chủ
          </span>
        </section>
      </div>
    );
  return (
    <div className="adm-app">
      <aside className="adm-sidebar">
        <a className="adm-brand" href="/admin">
          <Crown size={28} />
          <span>
            TAM QUỐC<small>TRUNG TÂM QUẢN TRỊ</small>
          </span>
        </a>
        <span className="adm-nav-label">ĐIỀU HÀNH GAME</span>
        <nav aria-label="Điều hướng quản trị">
          {tabs.map(({ id, title, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => switchTab(id)}
            >
              <Icon size={18} />
              {title}
              {id === "players" && overview && (
                <small>{overview.players}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="adm-sidebar-bottom">
          <span>
            <Shield size={15} />
            <strong>{session.account.username}</strong>
            <small>ADMIN</small>
          </span>
          <a href="/">
            <ArrowLeft size={15} />
            Về game
          </a>
          <button
            onClick={() =>
              action(async () => {
                await api(
                  "/api/auth/logout",
                  { method: "POST", body: {} },
                  session.csrf,
                );
                setSession(null);
              }, "Đã đăng xuất.")
            }
          >
            <LogOut size={15} />
            Đăng xuất
          </button>
        </div>
      </aside>
      <div className="adm-main">
        <header className="adm-topbar">
          <span>
            QUẢN TRỊ <ChevronRight size={12} />
            <strong>{tabs.find((t) => t.id === tab).title}</strong>
          </span>
          <button
            className="outline-button"
            disabled={busy}
            onClick={() => {
              if (
                dirty &&
                !window.confirm("Bỏ các thay đổi cấu hình chưa lưu và tải lại?")
              )
                return;
              action(() => reload(), "Đã tải dữ liệu mới nhất.");
            }}
          >
            <RefreshCw size={14} />
            Làm mới
          </button>
        </header>
        <main className="adm-content">
          <div className="adm-heading">
            <span className="eyebrow">DỮ LIỆU TỪ MÁY CHỦ</span>
            <h1>{tabs.find((t) => t.id === tab).title}</h1>
            <p>
              {tab === "overview"
                ? "Tình hình người chơi và các thao tác quản trị gần đây."
                : "Mọi thay đổi được kiểm tra quyền và ghi nhật ký trên máy chủ."}
            </p>
          </div>
          {error && (
            <div className="adm-alert error" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="adm-alert" role="status">
              <Check size={15} />
              {message}
            </div>
          )}
          {dirty && (
            <div className="adm-dirty">
              Có thay đổi cấu hình chưa lưu. Các tab tướng, ải và cấu hình dùng
              chung một bản nháp.
            </div>
          )}
          {tab === "overview" && overview && (
            <>
              <div className="adm-stats">
                {[
                  {
                    label: "Người chơi đăng ký",
                    value: overview.players,
                    icon: Users,
                  },
                  {
                    label: "Tài khoản bị khóa",
                    value: overview.banned,
                    icon: LockKeyhole,
                  },
                  {
                    label: "Giftcode đang bật",
                    value: overview.giftcodes,
                    icon: Gift,
                  },
                  {
                    label: "Phiên bản cấu hình",
                    value: overview.configRevision,
                    icon: Settings,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <article key={label}>
                    <span>
                      <Icon size={20} />
                      {label}
                    </span>
                    <strong>{format(value)}</strong>
                  </article>
                ))}
              </div>
              <section className="adm-card">
                <div className="adm-card-heading">
                  <h2>Thao tác gần đây</h2>
                  <button
                    className="text-button"
                    onClick={() => switchTab("audit")}
                  >
                    Xem nhật ký
                    <ChevronRight size={14} />
                  </button>
                </div>
                <AuditTable entries={overview.audit} />
              </section>
            </>
          )}
          {tab === "players" && (
            <>
              <form
                className="adm-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  action(() => findPlayers(), "Đã cập nhật danh sách.");
                }}
              >
                <Search size={17} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm tên đăng nhập…"
                  aria-label="Tìm người chơi"
                  maxLength={32}
                />
                <button className="outline-button" disabled={busy}>
                  Tìm kiếm
                </button>
              </form>
              <section className="adm-card">
                <div className="adm-card-heading">
                  <h2>Tài khoản người chơi</h2>
                  <span>{players.total} tài khoản</span>
                </div>
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Người chơi</th>
                        <th>Bạc</th>
                        <th>Ngọc</th>
                        <th>Ải đã qua</th>
                        <th>Trạng thái</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {players.players.map((player) => (
                        <tr key={player.id}>
                          <td>
                            <strong>{player.username}</strong>
                            <small>{date(player.updatedAt)}</small>
                          </td>
                          <td>{format(player.state.gold)}</td>
                          <td>{format(player.state.jade)}</td>
                          <td>{player.state.completed}/8</td>
                          <td>
                            <span
                              className={`adm-status ${player.banned ? "off" : ""}`}
                            >
                              {player.banned ? "Đã khóa" : "Hoạt động"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="outline-button"
                              onClick={() =>
                                setSelected(structuredClone(player))
                              }
                            >
                              Chỉnh
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!players.players.length && (
                        <tr>
                          <td colSpan={6} className="adm-empty">
                            Chưa có người chơi phù hợp. Đăng ký tài khoản từ mục
                            Cài đặt trong game.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="adm-pagination">
                  <button
                    disabled={players.page <= 1 || busy}
                    onClick={() =>
                      action(
                        () => findPlayers(players.page - 1),
                        "Đã chuyển trang.",
                      )
                    }
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span>
                    Trang {players.page} /{" "}
                    {Math.max(1, Math.ceil(players.total / 50))}
                  </span>
                  <button
                    disabled={players.page * 50 >= players.total || busy}
                    onClick={() =>
                      action(
                        () => findPlayers(players.page + 1),
                        "Đã chuyển trang.",
                      )
                    }
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </section>
              {selected && (
                <section className="adm-card adm-player-editor">
                  <div className="adm-card-heading">
                    <h2>Chỉnh người chơi: {selected.username}</h2>
                    <button
                      className="icon-button"
                      aria-label="Đóng chỉnh người chơi"
                      onClick={() => setSelected(null)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <form
                    className="adm-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const values = Object.fromEntries(
                        new FormData(e.currentTarget),
                      );
                      action(
                        () =>
                          editPlayer(
                            Object.fromEntries(
                              Object.entries(values).map(([k, v]) => [
                                k,
                                Number(v),
                              ]),
                            ),
                          ),
                        "Đã cập nhật tài nguyên người chơi.",
                      );
                    }}
                  >
                    <div className="adm-form-grid">
                      {[
                        { key: "gold", label: "Bạc", max: 1000000000 },
                        { key: "jade", label: "Ngọc", max: 1000000000 },
                        {
                          key: "scrolls",
                          label: "Chiêu mộ lệnh",
                          max: 1000000000,
                        },
                        { key: "stamina", label: "Thể lực", max: 120 },
                        { key: "completed", label: "Số ải đã vượt", max: 8 },
                      ].map((field) => (
                        <label className="adm-field" key={field.key}>
                          {field.label}
                          <input
                            name={field.key}
                            type="number"
                            min={0}
                            max={field.max}
                            required
                            key={`${selected.id}-${selected.revision}-${field.key}`}
                            defaultValue={selected.state[field.key]}
                          />
                        </label>
                      ))}
                    </div>
                    <button className="gold-button" disabled={busy}>
                      <Save size={15} />
                      Lưu tài nguyên
                    </button>
                  </form>
                  <div className="adm-danger-zone">
                    <button
                      className="danger-button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `${selected.banned ? "Mở khóa" : "Khóa"} tài khoản ${selected.username}?`,
                          )
                        )
                          action(
                            () => editPlayer({ banned: !selected.banned }),
                            "Đã cập nhật trạng thái tài khoản.",
                          );
                      }}
                    >
                      {selected.banned ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                    </button>
                    <button
                      className="danger-button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Xóa tiến trình của ${selected.username} và bắt đầu lại?`,
                          )
                        )
                          action(
                            () => editPlayer({ reset: true }),
                            "Đã đặt lại tiến trình người chơi.",
                          );
                      }}
                    >
                      Đặt lại tiến trình
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
          {tab === "heroes" && config && (
            <section className="adm-card">
              <form className="adm-form" onSubmit={saveConfig}>
                <label className="adm-field">
                  Chọn danh tướng
                  <select
                    value={heroIndex}
                    onChange={(e) => setHeroIndex(Number(e.target.value))}
                  >
                    {config.heroes.map((h, i) => (
                      <option key={h.id} value={i}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="adm-hero-preview">
                  <div
                    style={{
                      backgroundPosition: portraitPosition(
                        config.heroes[heroIndex].art,
                      ),
                    }}
                  />
                  <span>
                    <small>
                      {config.heroes[heroIndex].id.toUpperCase()} ·{" "}
                      {config.heroes[heroIndex].rarity}
                    </small>
                    <h2>{config.heroes[heroIndex].name}</h2>
                    <p>
                      Chỉ số sinh lực và công kích bên dưới được dùng trong trận
                      đấu.
                    </p>
                  </span>
                </div>
                <div className="adm-form-grid">
                  {[
                    { key: "name", label: "Tên tướng" },
                    { key: "title", label: "Danh hiệu" },
                    { key: "role", label: "Vai trò" },
                    { key: "skill", label: "Tên tuyệt kỹ" },
                    { key: "quote", label: "Lời thoại" },
                  ].map((f) => (
                    <Field
                      key={f.key}
                      label={f.label}
                      value={config.heroes[heroIndex][f.key]}
                      maxLength={100}
                      onChange={(value) =>
                        update("heroes", f.key, value, heroIndex)
                      }
                    />
                  ))}
                  <label className="adm-field">
                    Phe
                    <select
                      value={config.heroes[heroIndex].faction}
                      onChange={(e) =>
                        update("heroes", "faction", e.target.value, heroIndex)
                      }
                    >
                      {["Thục", "Ngô", "Quần"].map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </label>
                  <label className="adm-field">
                    Phẩm chất
                    <select
                      value={config.heroes[heroIndex].rarity}
                      onChange={(e) =>
                        update("heroes", "rarity", e.target.value, heroIndex)
                      }
                    >
                      <option>SSR</option>
                      <option>SR</option>
                    </select>
                  </label>
                  {[
                    { key: "base", label: "Lực chiến cơ bản" },
                    { key: "hpBase", label: "Sinh lực cơ bản" },
                    { key: "hpGrowth", label: "Sinh lực mỗi cấp" },
                    { key: "attackBase", label: "Công kích cơ bản" },
                    { key: "attackGrowth", label: "Công kích mỗi cấp" },
                  ].map((f) => (
                    <Field
                      key={f.key}
                      label={f.label}
                      type="number"
                      min={1}
                      value={config.heroes[heroIndex][f.key]}
                      onChange={(value) =>
                        update("heroes", f.key, value, heroIndex)
                      }
                    />
                  ))}
                </div>
                <label className="adm-field">
                  Mô tả tuyệt kỹ
                  <textarea
                    value={config.heroes[heroIndex].description}
                    maxLength={500}
                    required
                    onChange={(e) =>
                      update("heroes", "description", e.target.value, heroIndex)
                    }
                  />
                </label>
                <button className="gold-button" disabled={busy || !dirty}>
                  <Save size={15} />
                  Lưu cấu hình tướng
                </button>
              </form>
            </section>
          )}
          {tab === "stages" && config && (
            <section className="adm-card">
              <form className="adm-form" onSubmit={saveConfig}>
                <label className="adm-field">
                  Chọn ải
                  <select
                    value={stageIndex}
                    onChange={(e) => setStageIndex(Number(e.target.value))}
                  >
                    {config.stages.map((s, i) => (
                      <option key={i} value={i}>
                        {i + 1}. {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="adm-form-grid">
                  {[
                    { key: "name", label: "Tên ải" },
                    { key: "place", label: "Địa điểm" },
                    { key: "enemy", label: "Đối thủ" },
                    { key: "subtitle", label: "Mô tả ải" },
                  ].map((f) => (
                    <Field
                      key={f.key}
                      label={f.label}
                      maxLength={100}
                      value={config.stages[stageIndex][f.key]}
                      onChange={(value) =>
                        update("stages", f.key, value, stageIndex)
                      }
                    />
                  ))}
                  <label className="adm-field">
                    Độ khó
                    <select
                      value={config.stages[stageIndex].difficulty}
                      onChange={(e) =>
                        update(
                          "stages",
                          "difficulty",
                          e.target.value,
                          stageIndex,
                        )
                      }
                    >
                      {["Dễ", "Vừa", "Khó", "Tinh anh"].map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </label>
                  {[
                    { key: "level", label: "Cấp quân địch", min: 1, max: 200 },
                    { key: "gold", label: "Bạc thưởng", min: 0, max: 1000000 },
                    { key: "jade", label: "Ngọc thưởng", min: 0, max: 1000000 },
                  ].map((f) => (
                    <Field
                      key={f.key}
                      label={f.label}
                      type="number"
                      min={f.min}
                      max={f.max}
                      value={config.stages[stageIndex][f.key]}
                      onChange={(value) =>
                        update("stages", f.key, value, stageIndex)
                      }
                    />
                  ))}
                </div>
                <button className="gold-button" disabled={busy || !dirty}>
                  <Save size={15} />
                  Lưu cấu hình ải
                </button>
              </form>
            </section>
          )}
          {tab === "gifts" && (
            <>
              <section className="adm-card">
                <div className="adm-card-heading">
                  <h2>Tạo giftcode</h2>
                  <span>Mỗi tài khoản nhận một lần</span>
                </div>
                <form
                  className="adm-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const values = Object.fromEntries(new FormData(form));
                    action(async () => {
                      await api(
                        "/api/admin/giftcodes",
                        {
                          method: "POST",
                          body: {
                            code: values.code,
                            gold: Number(values.gold),
                            jade: Number(values.jade),
                            scrolls: Number(values.scrolls),
                            stamina: Number(values.stamina),
                            maxUses: Number(values.maxUses),
                            expiresAt: values.expiresAt
                              ? new Date(values.expiresAt).toISOString()
                              : null,
                          },
                        },
                        session.csrf,
                      );
                      form.reset();
                      const data = await api("/api/admin/giftcodes");
                      setCodes(data.codes);
                    }, "Đã tạo giftcode.");
                  }}
                >
                  <div className="adm-form-grid">
                    <label className="adm-field">
                      Mã quà tặng
                      <input
                        name="code"
                        required
                        pattern="[A-Za-z0-9_-]{4,32}"
                        minLength={4}
                        maxLength={32}
                        placeholder="Ví dụ: LONGTHANH2026"
                      />
                    </label>
                    <label className="adm-field">
                      Lượt nhận tối đa
                      <input
                        name="maxUses"
                        type="number"
                        min={1}
                        max={1000000}
                        defaultValue={100}
                        required
                      />
                    </label>
                    {[
                      {
                        key: "gold",
                        label: "Bạc tặng",
                        value: 5000,
                        max: 1000000,
                      },
                      {
                        key: "jade",
                        label: "Ngọc tặng",
                        value: 100,
                        max: 1000000,
                      },
                      {
                        key: "scrolls",
                        label: "Lệnh tặng",
                        value: 1,
                        max: 1000000,
                      },
                      {
                        key: "stamina",
                        label: "Thể lực tặng",
                        value: 0,
                        max: 120,
                      },
                    ].map((f) => (
                      <label className="adm-field" key={f.key}>
                        {f.label}
                        <input
                          name={f.key}
                          type="number"
                          min={0}
                          max={f.max}
                          defaultValue={f.value}
                          required
                        />
                      </label>
                    ))}
                    <label className="adm-field">
                      Hạn nhận (để trống nếu không hết hạn)
                      <input name="expiresAt" type="datetime-local" />
                    </label>
                  </div>
                  <button className="gold-button" disabled={busy}>
                    <Gift size={15} />
                    Tạo giftcode
                  </button>
                </form>
              </section>
              <section className="adm-card">
                <div className="adm-card-heading">
                  <h2>Mã đã tạo</h2>
                  <span>{codes.length} mã gần nhất</span>
                </div>
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Mã</th>
                        <th>Phần thưởng</th>
                        <th>Đã nhận</th>
                        <th>Hạn nhận</th>
                        <th>Trạng thái</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {codes.map((code) => (
                        <tr key={code.id}>
                          <td>
                            <strong>{code.code}</strong>
                          </td>
                          <td>
                            {format(code.gold)} bạc · {format(code.jade)} ngọc
                            <small>
                              {code.scrolls} lệnh · {code.stamina} thể lực
                            </small>
                          </td>
                          <td>
                            {code.uses}/{code.max_uses}
                          </td>
                          <td>{date(code.expires_at)}</td>
                          <td>
                            <span
                              className={`adm-status ${!code.enabled ? "off" : ""}`}
                            >
                              {code.enabled ? "Đang bật" : "Đã tắt"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="outline-button"
                              disabled={busy}
                              onClick={() =>
                                action(async () => {
                                  await api(
                                    `/api/admin/giftcodes/${code.id}`,
                                    {
                                      method: "PATCH",
                                      body: { enabled: !code.enabled },
                                    },
                                    session.csrf,
                                  );
                                  const data = await api(
                                    "/api/admin/giftcodes",
                                  );
                                  setCodes(data.codes);
                                }, "Đã cập nhật giftcode.")
                              }
                            >
                              {code.enabled ? "Tắt mã" : "Bật mã"}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!codes.length && (
                        <tr>
                          <td colSpan={6} className="adm-empty">
                            Chưa tạo giftcode nào.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          {tab === "settings" && config && (
            <>
              <section className="adm-card">
                <div className="adm-card-heading">
                  <h2>Cấu hình game</h2>
                  <span>Phiên bản {revision}</span>
                </div>
                <form className="adm-form" onSubmit={saveConfig}>
                  <div className="adm-form-grid">
                    {[
                      {
                        key: "dailyGold",
                        label: "Bạc quà ngày",
                        min: 0,
                        max: 1000000,
                      },
                      {
                        key: "dailyJade",
                        label: "Ngọc quà ngày",
                        min: 0,
                        max: 1000000,
                      },
                      {
                        key: "dailyScrolls",
                        label: "Lệnh quà ngày",
                        min: 0,
                        max: 1000000,
                      },
                      {
                        key: "battleStamina",
                        label: "Thể lực mỗi trận",
                        min: 1,
                        max: 120,
                      },
                      {
                        key: "summonJade",
                        label: "Ngọc mỗi lần chiêu mộ",
                        min: 1,
                        max: 1000000,
                      },
                    ].map((f) => (
                      <Field
                        key={f.key}
                        label={f.label}
                        type="number"
                        min={f.min}
                        max={f.max}
                        value={config.rules[f.key]}
                        onChange={(value) => update("rules", f.key, value)}
                      />
                    ))}
                  </div>
                  <label className="adm-field">
                    Thông báo trong game
                    <textarea
                      value={config.rules.notice}
                      maxLength={1000}
                      onChange={(e) =>
                        update("rules", "notice", e.target.value)
                      }
                      placeholder="Thông báo sự kiện, cập nhật hoặc lịch bảo trì…"
                    />
                  </label>
                  <label className="adm-checkbox">
                    <input
                      type="checkbox"
                      checked={config.rules.maintenance}
                      onChange={(e) =>
                        update("rules", "maintenance", e.target.checked)
                      }
                    />
                    <span>
                      Bật bảo trì
                      <small>
                        Game hiển thị màn bảo trì; admin vẫn truy cập được trang
                        quản trị.
                      </small>
                    </span>
                  </label>
                  <button className="gold-button" disabled={busy || !dirty}>
                    <Save size={15} />
                    Lưu cấu hình game
                  </button>
                </form>
              </section>
              <section className="adm-card">
                <div className="adm-card-heading">
                  <h2>Đổi mật khẩu quản trị</h2>
                  <span>Đăng xuất mọi phiên sau khi đổi</span>
                </div>
                <form
                  className="adm-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const values = Object.fromEntries(
                      new FormData(event.currentTarget),
                    );
                    if (values.newPassword !== values.confirmPassword) {
                      setError("Hai mật khẩu mới không khớp.");
                      return;
                    }
                    action(async () => {
                      await api(
                        "/api/admin/password",
                        {
                          method: "POST",
                          body: {
                            currentPassword: values.currentPassword,
                            newPassword: values.newPassword,
                          },
                        },
                        session.csrf,
                      );
                      setSession(null);
                    }, "Đã đổi mật khẩu. Đăng nhập lại bằng mật khẩu mới.");
                  }}
                >
                  <div className="adm-form-grid">
                    {[
                      {
                        name: "currentPassword",
                        label: "Mật khẩu hiện tại",
                        auto: "current-password",
                      },
                      {
                        name: "newPassword",
                        label: "Mật khẩu mới",
                        auto: "new-password",
                      },
                      {
                        name: "confirmPassword",
                        label: "Nhập lại mật khẩu mới",
                        auto: "new-password",
                      },
                    ].map((f) => (
                      <label key={f.name} className="adm-field">
                        {f.label}
                        <input
                          name={f.name}
                          type="password"
                          autoComplete={f.auto}
                          minLength={12}
                          maxLength={128}
                          required
                        />
                      </label>
                    ))}
                  </div>
                  <button className="outline-button" disabled={busy}>
                    <LockKeyhole size={14} />
                    Đổi mật khẩu
                  </button>
                </form>
              </section>
            </>
          )}
          {tab === "audit" && (
            <section className="adm-card">
              <div className="adm-card-heading">
                <h2>Nhật ký quản trị</h2>
                <span>200 thao tác gần nhất</span>
              </div>
              <AuditTable entries={audit} />
            </section>
          )}
          {!overview && !error && (
            <p className="adm-empty">Đang tải dữ liệu quản trị…</p>
          )}
        </main>
      </div>
    </div>
  );
}
