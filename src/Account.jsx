import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Cloud,
  Gift,
  LogIn,
  LogOut,
  Shield,
  UserPlus,
} from "lucide-react";
import { api } from "./api.js";
import { normalizeState } from "./game.js";

export function useAccount(state, setState, notify, battleActive) {
  const [session, setSession] = useState(null);
  const [syncStatus, setSyncStatus] = useState("guest");
  const saved = useRef({ revision: 0, json: "" });
  const epoch = useRef(0);
  const pending = useRef(0);
  const queue = useRef(Promise.resolve());
  const flush = useRef(() => queue.current);
  const latestState = useRef(state);
  latestState.current = state;
  const timerPending = useRef(false);
  const applySave = useCallback(
    (save) => {
      const clean = normalizeState(save.state);
      if (!clean) throw new Error("Tiến trình từ máy chủ không hợp lệ.");
      saved.current = { revision: save.revision, json: JSON.stringify(clean) };
      setState(clean);
      setSyncStatus("synced");
    },
    [setState],
  );
  const accept = useCallback(
    (data) => {
      epoch.current++;
      applySave(data.save);
      setSession({ account: data.account, csrf: data.csrf });
    },
    [applySave],
  );
  useEffect(() => {
    let active = true;
    api("/api/auth/session")
      .then(async (result) => {
        if (!result.account) return;
        const save = await api("/api/player/state");
        if (active) accept({ ...result, save });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [accept]);
  useEffect(() => {
    if (!session || JSON.stringify(state) === saved.current.json) return;
    const snapshot = structuredClone(state);
    const generation = epoch.current;
    timerPending.current = true;
    setSyncStatus("saving");
    let enqueued = false;
    const enqueue = () => {
      if (enqueued) return queue.current;
      enqueued = true;
      clearTimeout(timer);
      timerPending.current = false;
      pending.current++;
      queue.current = queue.current
        .catch(() => {})
        .then(async () => {
          if (epoch.current !== generation) return;
          try {
            const result = await api(
              "/api/player/state",
              {
                method: "PUT",
                body: { state: snapshot, revision: saved.current.revision },
              },
              session.csrf,
            );
            if (epoch.current === generation) {
              saved.current = {
                revision: result.revision,
                json: JSON.stringify(result.state),
              };
              setSyncStatus(
                JSON.stringify(latestState.current) === saved.current.json
                  ? "synced"
                  : "saving",
              );
            }
          } catch (error) {
            if (epoch.current !== generation) return;
            if (error.status === 409 && error.data.save) {
              epoch.current++;
              applySave(error.data.save);
              notify(
                "Tiến trình đã được cập nhật ở phiên khác hoặc bởi quản trị viên.",
              );
            } else {
              setSyncStatus("error");
              if (error.status === 401) {
                epoch.current++;
                setSession(null);
                notify("Phiên đăng nhập đã hết hạn hoặc tài khoản đã bị khóa.");
              }
            }
          }
        })
        .finally(() => {
          pending.current--;
        });
      return queue.current;
    };
    const timer = setTimeout(enqueue, 500);
    flush.current = enqueue;
    return () => {
      clearTimeout(timer);
      timerPending.current = false;
    };
  }, [state, session, applySave, notify]);
  useEffect(() => {
    if (!session || battleActive) return;
    let active = true;
    const timer = setInterval(async () => {
      if (pending.current || timerPending.current) return;
      const generation = epoch.current;
      try {
        const result = await api("/api/player/state");
        if (
          active &&
          generation === epoch.current &&
          !pending.current &&
          !timerPending.current &&
          result.revision > saved.current.revision
        )
          applySave(result);
      } catch (error) {
        if (active && error.status === 401) {
          epoch.current++;
          setSession(null);
          setSyncStatus("guest");
          notify("Phiên đăng nhập đã hết hạn hoặc tài khoản đã bị khóa.");
        }
      }
    }, 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [session, battleActive, applySave, notify]);
  const logout = async () => {
    await flush.current();
    await queue.current.catch(() => {});
    await api("/api/auth/logout", { method: "POST", body: {} }, session.csrf);
    epoch.current++;
    setSession(null);
    setSyncStatus("guest");
  };
  const redeem = async (code) => {
    await flush.current();
    await queue.current.catch(() => {});
    const save = await api(
      "/api/player/redeem",
      { method: "POST", body: { code } },
      session.csrf,
    );
    epoch.current++;
    applySave(save);
  };
  return { session, syncStatus, accept, logout, redeem };
}

export default function AccountPanel({ account, state, onClose, notify }) {
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function authenticate(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api(
        `/api/auth/${mode === "register" ? "register" : "login"}`,
        {
          method: "POST",
          body: {
            ...values,
            ...(mode === "register" ? { initialState: state } : {}),
          },
        },
      );
      account.accept(result);
      notify(
        mode === "register"
          ? "Đã tạo tài khoản và lưu hành trình hiện tại lên máy chủ."
          : "Đã đăng nhập và tải tiến trình.",
      );
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="account-panel">
      {error && (
        <p className="account-error" role="alert">
          {error}
        </p>
      )}
      {account.session ? (
        <>
          <div className="account-identity">
            <Cloud size={35} />
            <h3>{account.session.account.username}</h3>
            <p>
              {account.syncStatus === "saving"
                ? "Đang lưu tiến trình…"
                : account.syncStatus === "error"
                  ? "Chưa đồng bộ được. Bản cục bộ vẫn được giữ."
                  : "Tiến trình được lưu theo tài khoản trên máy chủ."}
            </p>
          </div>
          <form
            className="account-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const code = new FormData(form).get("code");
              setBusy(true);
              setError("");
              try {
                await account.redeem(code);
                form.reset();
                notify("Đã nhận quà giftcode!");
              } catch (failure) {
                setError(failure.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Nhập giftcode
              <input
                name="code"
                placeholder="Nhập mã quà tặng"
                required
                minLength={4}
                maxLength={32}
              />
            </label>
            <button className="gold-button" disabled={busy}>
              <Gift size={16} />
              Nhận quà giftcode
            </button>
          </form>
          <div className="account-actions">
            {account.session.account.role === "admin" && (
              <a href="/admin">
                <Shield size={14} />
                Mở trang quản trị
              </a>
            )}
            <button
              className="outline-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await account.logout();
                  notify("Đã đăng xuất. Bạn có thể tiếp tục chơi cục bộ.");
                } catch (failure) {
                  setError(failure.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <LogOut size={14} />
              Đăng xuất
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="account-intro">
            Đăng nhập để lưu theo tài khoản và nhận giftcode. Đăng ký mới sẽ giữ
            hành trình đang chơi trên trình duyệt này.
          </p>
          <div className="account-tabs">
            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Đăng nhập
            </button>
            <button
              className={mode === "register" ? "active" : ""}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Đăng ký
            </button>
          </div>
          <form className="account-form" onSubmit={authenticate}>
            <label>
              Tên đăng nhập
              <input
                name="username"
                autoComplete="username"
                pattern="[a-zA-Z0-9_]{3,32}"
                minLength={3}
                maxLength={32}
                required
                placeholder="3–32 chữ, số hoặc gạch dưới"
              />
            </label>
            <label>
              Mật khẩu
              <input
                name="password"
                type="password"
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                minLength={12}
                maxLength={128}
                required
                placeholder="Ít nhất 12 ký tự"
              />
            </label>
            <button className="gold-button" disabled={busy}>
              {mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
              {busy
                ? "Đang xử lý…"
                : mode === "login"
                  ? "Đăng nhập tài khoản"
                  : "Tạo tài khoản người chơi"}
            </button>
          </form>
          <p className="detail-footnote">
            Chơi khách vẫn lưu trên trình duyệt. Tài khoản quản trị được tạo
            riêng bằng lệnh trên máy chủ.
          </p>
        </>
      )}
      <button className="text-button account-back" onClick={onClose}>
        <Check size={13} />
        Trở về game
      </button>
    </div>
  );
}
