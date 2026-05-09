// src/pages/MyPage.jsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ROLE, ROLE_LABEL } from "../utils/roles";
import SiteFooter from "../components/SiteFooter";

function SimpleIcon({ children }) {
  return <span className="mypage-simple-icon">{children}</span>;
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
      icon: "管",
    },
    isTournamentAdmin && {
      key: "tournament",
      label: "大会管理",
      path: "/admin/tournament",
      icon: "大",
    },
    isApplicationAdmin && {
      key: "application",
      label: "申込管理",
      path: "/admin/application",
      icon: "申",
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
  const unpaidCount = applications.filter((app) => app.status === "selected").length;

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

    const { error } = await supabase.from("profiles").upsert(
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
              <SimpleIcon>権</SimpleIcon>
              <span>ロール</span>
              <strong>{mainRoleLabel}</strong>
            </div>

            <div>
              <SimpleIcon>所</SimpleIcon>
              <span>所属</span>
              <strong>{profile?.organization || "未設定"}</strong>
            </div>

            <div>
              <SimpleIcon>段</SimpleIcon>
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
            <SimpleIcon>次</SimpleIcon>
          </div>

          <div>
            <p>次の大会まで</p>

            <strong>
              {daysUntilNext === null ? (
                "-"
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
            <SimpleIcon>支</SimpleIcon>
          </div>

          <div>
            <p>未振込の大会</p>

            <strong>
              {unpaidCount}
              <span>件</span>
            </strong>

            <small>
              詳細を確認する
              <ChevronIcon />
            </small>
          </div>
        </button>
      </section>

      <section className="mypage-modern-menu-card">
        <button type="button" onClick={() => setIsEditing(true)}>
          <SimpleIcon>編</SimpleIcon>
          <span>プロフィール編集</span>
          <ChevronIcon />
        </button>

        {isEditing && (
          <section className="mypage-modern-edit-card mypage-modern-inline-edit">
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

        {availableAdminMenus.map((menu) => (
          <button
            type="button"
            key={menu.key}
            onClick={() => navigate(menu.path)}
          >
            <SimpleIcon>{menu.icon}</SimpleIcon>
            <span>{menu.label}</span>
            <ChevronIcon />
          </button>
        ))}

        <button type="button" onClick={() => navigate("/contact")}>
          <SimpleIcon>問</SimpleIcon>
          <span>問い合わせ</span>
          <ChevronIcon />
        </button>

        <button type="button" onClick={handleLogout} disabled={loggingOut}>
          <SimpleIcon>出</SimpleIcon>
          <span>{loggingOut ? "ログアウト中..." : "ログアウト"}</span>
          <ChevronIcon />
        </button>
      </section>

      <SiteFooter />
    </div>
  );
}
