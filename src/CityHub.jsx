import React, { useState } from "react";
import {
  ArrowRight,
  Crown,
  Flame,
  Gift,
  Map,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Users,
  Zap,
} from "lucide-react";
import {
  COMBOS,
  format,
  heroById,
  portraitPosition,
  STAGES,
  teamPower,
} from "./game.js";

export function Chibi({ hero, className = "", ...props }) {
  return (
    <div
      className={`chibi ${className}`}
      style={{
        backgroundPosition: portraitPosition(hero.art),
        "--hero-color": hero.color,
      }}
      {...props}
    />
  );
}

export default function CityHub({
  state,
  onNavigate,
  onHero,
  onBattle,
  onSupplies,
  onDaily,
  dailyClaimed,
}) {
  const [selected, setSelected] = useState(state.team[0]);
  const hero = heroById(
    state.team.includes(selected) ? selected : state.team[0],
  );
  const stage = STAGES[Math.min(state.completed, STAGES.length - 1)];
  const pairs = COMBOS.filter((c) =>
    c.pair.every((id) => state.team.includes(id)),
  );
  return (
    <section className="city-hub" aria-label="Thành chính Long Thành">
      <div className="city-scenery" />
      <div className="city-haze" />
      <div className="city-player">
        <div
          className="city-player-avatar"
          style={{ backgroundPosition: portraitPosition(1) }}
        />
        <div>
          <span className="city-player-rank">
            <Crown size={12} /> CHÚA CÔNG · CẤP 18
          </span>
          <h1>Chào mừng, Chúa Công</h1>
          <strong>
            <Swords size={14} />
            {format(teamPower(state))}
            <small>LỰC CHIẾN</small>
          </strong>
        </div>
      </div>
      <div className="city-title">
        <span>S1 · ANH HÙNG HỘI TỤ</span>
        <h2>Long Thành</h2>
        <small>Thiên hạ trong tay · Hào kiệt dưới trướng</small>
      </div>
      <div className="city-events">
        <button onClick={onDaily} aria-label="Quà đăng nhập thành chính">
          <span>
            <Gift size={25} />
          </span>
          <strong>{dailyClaimed ? "Đã nhận quà" : "Quà mỗi ngày"}</strong>
          {!dailyClaimed && <i />}
        </button>
        <button onClick={() => onNavigate("summon")}>
          <span>
            <ScrollText size={25} />
          </span>
          <strong>Chiêu mộ x10</strong>
          <small>{state.scrolls} lệnh sẵn có</small>
        </button>
      </div>
      <button
        className="city-hotspot hotspot-summon"
        onClick={() => onNavigate("summon")}
      >
        <span className="hotspot-emblem">
          <Sparkles size={18} />
        </span>
        <strong>Chiêu Hiền Các</strong>
        <small>Danh tướng hội tụ</small>
        <i />
      </button>
      <button
        className="city-hotspot hotspot-campaign"
        onClick={() => onNavigate("campaign")}
      >
        <span className="hotspot-emblem">
          <Map size={18} />
        </span>
        <strong>Chinh chiến thiên hạ</strong>
        <small>Chương I · {state.completed}/8 ải</small>
        <i />
      </button>
      <button className="city-hotspot hotspot-supplies" onClick={onSupplies}>
        <span className="hotspot-emblem">
          <Gift size={18} />
        </span>
        <strong>Chợ quân nhu</strong>
        <small>Tiếp tế hành quân</small>
        <i />
      </button>
      <button
        className="city-hotspot hotspot-formation"
        onClick={() => onNavigate("formation")}
      >
        <span className="hotspot-emblem">
          <Shield size={18} />
        </span>
        <strong>Diễn Võ Trường</strong>
        <small>Bày binh bố trận</small>
        <i />
      </button>
      <div className="city-hero">
        <div className="city-hero-aura" />
        <button
          className="city-hero-character"
          onClick={() => onHero(hero.id)}
          aria-label={`Xem tướng thành chính ${hero.name}`}
        >
          <Chibi hero={hero} />
        </button>
        <span className="city-hero-caption">
          <small>{hero.title}</small>
          <strong>{hero.name}</strong>
          <span>
            Lv.{state.levels[hero.id]} · {hero.faction}
          </span>
        </span>
      </div>
      <div className="city-quest">
        <span className="quest-kicker">
          <Flame size={12} />
          NHIỆM VỤ CHÍNH TUYẾN
        </span>
        <h3>{stage.name}</h3>
        <p>{stage.subtitle}</p>
        <button onClick={() => onNavigate("campaign")}>
          Xem chiến dịch
          <ArrowRight size={13} />
        </button>
      </div>
      <div className="city-sortie">
        <span>
          ẢI {String(Math.min(state.completed + 1, 8)).padStart(2, "0")} ·{" "}
          {stage.place}
        </span>
        <button className="sortie-button" onClick={onBattle}>
          <Swords size={24} />
          <strong>Xuất chinh</strong>
          <ArrowRight size={18} />
        </button>
        <small>
          <Zap size={11} />8 thể lực · {stage.difficulty}
        </small>
      </div>
      <div className="city-team">
        <div className="city-team-heading">
          <span>
            <Users size={13} />
            ĐỘI HÌNH XUẤT CHIẾN
          </span>
          <button onClick={() => onNavigate("formation")}>
            Đổi đội hình
            <ArrowRight size={12} />
          </button>
        </div>
        <div className="city-team-portraits">
          {state.team.map((id) => {
            const h = heroById(id);
            return (
              <button
                key={id}
                aria-label={`Ngắm ${h.name}`}
                className={hero.id === id ? "active" : ""}
                onClick={() => setSelected(id)}
              >
                <span style={{ backgroundPosition: portraitPosition(h.art) }} />
                <small>{h.name}</small>
                <i>Lv.{state.levels[id]}</i>
              </button>
            );
          })}
        </div>
        <div className="city-bonds">
          <Sparkles size={11} />
          {pairs.length
            ? `${pairs.length} duyên phận hợp kích đã kích hoạt`
            : "Ghép cặp danh tướng để mở hợp kích"}
        </div>
      </div>
      <div className="city-petals" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} style={{ "--i": i }} />
        ))}
      </div>
    </section>
  );
}
