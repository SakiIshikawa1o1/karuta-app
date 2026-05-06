// src/pages/MyPage.jsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ROLE, ROLE_LABEL } from "../utils/roles";

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 2h2v3H7V2Zm8 0h2v3h-2V2ZM4 4h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 7v9h16v-9H4Zm0-2h16V6H4v3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 5a3 3 0 0 1 3-3h12v4H6a1 1 0 0 0 0 2h14a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V5Zm15 9a1.5 1.5 0 1 0 0 3h2v-3h-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 21V3h12v18h-3v-4H7v4H4Zm3-12h2V7H7v2Zm0 4h2v-2H7v2Zm4-4h2V7h-2v2Zm0 4h2v-2h-2v2Zm7 8V8h2v13h-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MedalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2a5 5 0 0 0-3 9v4.8l3-1.8 3 1.8V11a5 5 0 0 0-3-9Zm0 7.2a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4ZM7 22l5-3 5 3v-8.2l-5-3-5 3V22Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ContactIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 4h16v12H7.8L4 19.8V4Zm2 2v9l1-1h11V6H6Zm3 3h6v2H9V9Zm0 3h8v2H9v-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SystemAdminIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2 4 5v6c0 5.1 3.4 9.9 8 11 4.6-1.1 8-5.9 8-11V5l-8-3Zm0 2.2 6 2.25V11c0 4-2.45 7.75-6 8.85C8.45 18.75 6 15 6 11V6.45l6-2.25ZM11 7h2v5h-2V7Zm0 7h2v2h-2v-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TournamentAdminIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 4h14v3h-2v13H7V7H5V4Zm4 5v2h6V9H9Zm0 4v2h6v-2H9Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ApplicationAdminIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5ZM9 11h8v2H9v-2Zm0 4h8v2H9v-2Zm0-8h3v2H9V7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 3H4v18h6v-2H6V5h4V3Zm6.6 5.4L15.2 9.8l1.2 1.2H9v2h7.4l-1.2 1.2 1.4 1.4L20.4 12l-3.8-3.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChevronIcon() {
  return <span className="mypage-modern-chevron">›</span>;
}

function formatDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-").map(Number);

  return `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(
    2,
    "0"
  )}`;
}

function getDaysUntil(dateString) {
  if (!dateString) return null;

  const today = new Date();
  const target = new Date(`${dateString}T00:00:00`);

  today.setHours(0, 0, 0, 0);

  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function MyPage() {
  const navigate = useNavigate();
  const { user, profile, roles, hasRole, refreshMe } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [applications, setApplications] = useState([]);

  const [form, setForm] = useState({
    display_name: "",
    full_name: "",
    email: "",
    phone: "",
    organization: "",
    grade: "",
  });

  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isSystemAdmin = hasRole(ROLE.SYSTEM_ADMIN);
  const isTournamentAdmin = isSystemAdmin || hasRole(ROLE.TOURNAMENT_ADMIN);
  const isApplicationAdmin = isSystemAdmin || hasRole(ROLE.APPLICATION_ADMIN);

  const availableAdminMenus = [
    isSystemAdmin && {
      key: "system",
      label: "システム管理",
      path: "/admin/system",
      icon: <SystemAdminIcon />,
    },
    isTournamentAdmin && {
      key: "tournament",
      label: "大会管理",
      path: "/admin/tournament",
      icon: <TournamentAdminIcon />,
    },
    isApplicationAdmin && {
      key: "application",
      label: "申込管理",
      path: "/admin/application",
      icon: <ApplicationAdminIcon />,
    },
  ].filter(Boolean);

  useEffect(() => {
    setForm({
      display_name: profile?.display_name ?? "",
      full_name: profile?.full_name ?? "",
      email: profile?.email ?? user?.email ?? "",
      phone: profile?.phone ?? "",
      organization: profile?.organization ?? "",
      grade: profile?.grade ?? "",
    });
  }, [profile, user]);

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("applications")
        .select(`
          id,
          status,
          tournaments (
            id,
            title,
            event_date
          )
        `)
        .eq("user_id", user.id)
        .neq("status", "cancelled");

      if (error) {
        console.error(error);
        return;
      }

      setApplications(data ?? []);
    };

    fetchApplications();
  }, [user]);

  const displayName =
    profile?.display_name || profile?.full_name || user?.email || "未設定";

  const mainRoleLabel =
    roles && roles.length > 0 ? ROLE_LABEL[roles[0]] || roles[0] : "会員";

  const nextApplication = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return [...applications]
      .filter((app) => {
        const date = app.tournaments?.event_date;
        if (!date) return false;

        const eventDate = new Date(`${date}T00:00:00`);
        return eventDate >= today;
      })
      .sort((a, b) => {
        const dateA = a.tournaments?.event_date ?? "";
        const dateB = b.tournaments?.event_date ?? "";
        return dateA.localeCompare(dateB);
      })[0];
  }, [applications]);

  const daysUntilNext = getDaysUntil(nextApplication?.tournaments?.event_date);

  const unpaidCount = applications.filter(
    (app) => app.status === "selected"
  ).length;

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          display_name: form.display_name,
          full_name: form.full_name,
          email: user.email,
          phone: form.phone,
          organization: form.organization,
          grade: form.grade,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

    setSaving(false);

    if (error) {
      setErrorMessage(`プロフィール保存に失敗しました：${error.message}`);
      return;
    }

    await refreshMe();
    setIsEditing(false);
    alert("プロフィールを保存しました。");
  };

  const handleCancel = () => {
    setForm({
      display_name: profile?.display_name ?? "",
      full_name: profile?.full_name ?? "",
      email: profile?.email ?? user?.email ?? "",
      phone: profile?.phone ?? "",
      organization: profile?.organization ?? "",
      grade: profile?.grade ?? "",
    });

    setErrorMessage("");
    setIsEditing(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    setLoggingOut(false);

    if (error) {
      alert(`ログアウトに失敗しました：${error.message}`);
      return;
    }

    navigate("/");
  };

  return (
    <div className="mypage-modern">
      <section className="mypage-modern-profile-card">
        <div className="mypage-modern-profile-main">
          <div className="mypage-modern-name-block">
            <span>氏名</span>
            <h2>
              {displayName}
              <small>様</small>
            </h2>
          </div>

          <div className="mypage-modern-info-list">
            <div>
              <UserIcon />
              <span>ロール</span>
              <strong>{mainRoleLabel}</strong>
            </div>

            <div>
              <BuildingIcon />
              <span>所属</span>
              <strong>{profile?.organization || "未設定"}</strong>
            </div>

            <div>
              <MedalIcon />
              <span>段位</span>
              <strong>{profile?.grade || "未設定"}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="mypage-modern-summary-grid">
        <button
          type="button"
          className="mypage-modern-summary-card next"
          onClick={() => navigate("/applications/status")}
        >
          <div className="mypage-modern-summary-icon">
            <CalendarIcon />
          </div>

          <div>
            <p>次の大会まで</p>

            <strong>
              {daysUntilNext === null ? (
                "—"
              ) : (
                <>
                  {daysUntilNext}
                  <span>日</span>
                </>
              )}
            </strong>

            <small>
              {nextApplication?.tournaments?.title ||
                "申込中の大会はありません"}
            </small>

            {nextApplication?.tournaments?.event_date && (
              <small>
                {formatDate(nextApplication.tournaments.event_date)} 開催
              </small>
            )}
          </div>
        </button>

        <button
          type="button"
          className="mypage-modern-summary-card unpaid"
          onClick={() => navigate("/applications/status")}
        >
          <div className="mypage-modern-summary-icon">
            <WalletIcon />
          </div>

          <div>
            <p>未振り込みの大会</p>

            <strong>
              {unpaidCount}
              <span>件</span>
            </strong>

            <small>
              詳細を確認する <ChevronIcon />
            </small>
          </div>
        </button>
      </section>

      <section className="mypage-modern-menu-card">
        <button type="button" onClick={() => setIsEditing(true)}>
          <UserIcon />
          <span>プロフィール編集</span>
          <ChevronIcon />
        </button>

        {availableAdminMenus.map((menu) => (
          <button
            type="button"
            key={menu.key}
            onClick={() => navigate(menu.path)}
          >
            {menu.icon}
            <span>{menu.label}</span>
            <ChevronIcon />
          </button>
        ))}

        <button type="button" onClick={() => navigate("/contact")}>
          <ContactIcon />
          <span>問い合わせ</span>
          <ChevronIcon />
        </button>

        <button type="button" onClick={handleLogout} disabled={loggingOut}>
          <LogoutIcon />
          <span>{loggingOut ? "ログアウト中..." : "ログアウト"}</span>
          <ChevronIcon />
        </button>
      </section>

      {isEditing && (
        <section className="mypage-modern-edit-card">
          <h2>プロフィール編集</h2>

          {errorMessage && <p className="error-text">{errorMessage}</p>}

          <label>
            表示名
            <input
              value={form.display_name}
              onChange={(e) => handleChange("display_name", e.target.value)}
              placeholder="山田 太郎"
            />
          </label>

          <label>
            氏名
            <input
              value={form.full_name}
              onChange={(e) => handleChange("full_name", e.target.value)}
              placeholder="山田 太郎"
            />
          </label>

          <label>
            メールアドレス
            <input value={form.email} disabled />
          </label>

          <label>
            所属会
            <input
              value={form.organization}
              onChange={(e) => handleChange("organization", e.target.value)}
              placeholder="東京かるた会"
            />
          </label>

          <label>
            段位
            <select
              value={form.grade}
              onChange={(e) => handleChange("grade", e.target.value)}
            >
              <option value="">選択してください</option>
              <option value="無段">無段</option>
              <option value="初段">初段</option>
              <option value="二段">二段</option>
              <option value="三段">三段</option>
              <option value="四段">四段</option>
              <option value="五段">五段</option>
              <option value="六段">六段</option>
              <option value="七段">七段</option>
            </select>
          </label>

          <label>
            電話番号
            <input
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="090-1234-5678"
            />
          </label>

          <div className="mypage-modern-edit-buttons">
            <button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存する"}
            </button>

            <button type="button" onClick={handleCancel}>
              キャンセル
            </button>
          </div>
        </section>
      )}
    </div>
  );
}