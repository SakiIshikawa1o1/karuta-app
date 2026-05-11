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

function getMasterName(items, id) {
  if (!id) return "";
  return items.find((item) => item.id === id)?.name || "";
}

export default function MyPage() {
  const navigate = useNavigate();
  const { user, profile, roles, hasRole, refreshMe } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [applications, setApplications] = useState([]);

  const [affiliations, setAffiliations] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [danRanks, setDanRanks] = useState([]);

  const [form, setForm] = useState({
    display_name: "",
    full_name: "",
    email: "",
    phone: "",
    school_name: "",
    affiliation_id: "",
    class_level_id: "",
    dan_rank_id: "",
  });

  const [loadingMasters, setLoadingMasters] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isSystemAdmin = hasRole(ROLE.SYSTEM_ADMIN);
  const isTournamentAdmin = isSystemAdmin || hasRole(ROLE.TOURNAMENT_ADMIN);
  const isApplicationAdmin = isSystemAdmin || hasRole(ROLE.APPLICATION_ADMIN);
  const isAffiliationRepresentative = affiliations.some(
    (affiliation) => affiliation.representative_user_id === user?.id
  );

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
    (isSystemAdmin || isAffiliationRepresentative) && {
      key: "affiliation-approvals",
      label: "所属会申請の確認",
      path: "/admin/affiliation-approvals",
      icon: "承",
    },
  ].filter(Boolean);

  useEffect(() => {
    const fetchMasters = async () => {
      setLoadingMasters(true);
      setErrorMessage("");

      const [affiliationsResult, classLevelsResult, danRanksResult] =
        await Promise.all([
          supabase
            .from("affiliations")
            .select("id, name, is_active, representative_user_id")
            .eq("is_active", true)
            .order("name", { ascending: true }),

          supabase
            .from("class_levels")
            .select("id, code, name, sort_order, is_active")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),

          supabase
            .from("dan_ranks")
            .select("id, code, name, sort_order, is_active")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
        ]);

      setLoadingMasters(false);

      if (affiliationsResult.error) {
        setErrorMessage(
          `所属会の取得に失敗しました：${affiliationsResult.error.message}`
        );
        return;
      }

      if (classLevelsResult.error) {
        setErrorMessage(
          `級マスタの取得に失敗しました：${classLevelsResult.error.message}`
        );
        return;
      }

      if (danRanksResult.error) {
        setErrorMessage(
          `段位マスタの取得に失敗しました：${danRanksResult.error.message}`
        );
        return;
      }

      setAffiliations(affiliationsResult.data ?? []);
      setClassLevels(classLevelsResult.data ?? []);
      setDanRanks(danRanksResult.data ?? []);
    };

    fetchMasters();
  }, []);

  useEffect(() => {
    setForm({
      display_name: profile?.display_name ?? "",
      full_name: profile?.full_name ?? "",
      email: profile?.email ?? user?.email ?? "",
      phone: profile?.phone ?? "",
      school_name: profile?.school_name ?? "",
      affiliation_id: profile?.affiliation_id ?? "",
      class_level_id: profile?.class_level_id ?? "",
      dan_rank_id: profile?.dan_rank_id ?? "",
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
          tournament_title,
          tournaments (
            id,
            title,
            event_date
          )
        `)
        .eq("user_id", user.id)
        .neq("status", "cancelled");

      if (error) {
        console.error("申込情報取得エラー:", error.message);
        return;
      }

      setApplications(data ?? []);
    };

    fetchApplications();
  }, [user]);

  const displayName =
    profile?.full_name || profile?.display_name || user?.email || "未設定";

  const rolePriority = [
    ROLE.SYSTEM_ADMIN,
    ROLE.TOURNAMENT_ADMIN,
    ROLE.APPLICATION_ADMIN,
    ROLE.MEMBER,
  ];
  const mainRole =
    rolePriority.find((role) => roles.includes(role)) || roles[0] || ROLE.MEMBER;
  const mainRoleLabel = ROLE_LABEL[mainRole] || mainRole;
  const approvalStatusLabel =
    isSystemAdmin
      ? "承認済み"
      :
    {
      pending: "承認待ち",
      approved: "承認済み",
      rejected: "却下",
    }[profile?.approval_status] || "承認待ち";

  const affiliationName = useMemo(() => {
    return getMasterName(affiliations, profile?.affiliation_id);
  }, [affiliations, profile?.affiliation_id]);

  const classLevelName = useMemo(() => {
    return getMasterName(classLevels, profile?.class_level_id);
  }, [classLevels, profile?.class_level_id]);

  const danRankName = useMemo(() => {
    return getMasterName(danRanks, profile?.dan_rank_id);
  }, [danRanks, profile?.dan_rank_id]);

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

  const unpaidCount = applications.filter((app) =>
    ["selected", "payment_pending"].includes(app.status)
  ).length;

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    if (
      !form.full_name ||
      !form.affiliation_id ||
      !form.class_level_id ||
      !form.dan_rank_id
    ) {
      setErrorMessage("氏名、所属会、級、段位は必須です。");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: form.display_name,
        full_name: form.full_name,
        email: user.email,
        phone: form.phone,
        school_name: form.school_name,
        affiliation_id: form.affiliation_id,
        class_level_id: form.class_level_id,
        dan_rank_id: form.dan_rank_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

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
      school_name: profile?.school_name ?? "",
      affiliation_id: profile?.affiliation_id ?? "",
      class_level_id: profile?.class_level_id ?? "",
      dan_rank_id: profile?.dan_rank_id ?? "",
    });

    setErrorMessage("");
    setIsEditing(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    setLoggingOut(false);

    if (error) {
      console.warn("ログアウトエラー:", error.message);
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
              <SimpleIcon>承</SimpleIcon>
              <span>承認状態</span>
              <strong>{approvalStatusLabel}</strong>
            </div>

            <div>
              <SimpleIcon>所</SimpleIcon>
              <span>所属</span>
              <strong>{affiliationName || "未設定"}</strong>
            </div>

            <div>
              <SimpleIcon>級</SimpleIcon>
              <span>級</span>
              <strong>{classLevelName || "未設定"}</strong>
            </div>

            <div>
              <SimpleIcon>段</SimpleIcon>
              <span>段位</span>
              <strong>{danRankName || "未設定"}</strong>
            </div>

            <div>
              <SimpleIcon>学</SimpleIcon>
              <span>学校</span>
              <strong>{profile?.school_name || "未設定"}</strong>
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
                nextApplication?.tournament_title ||
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
              学校名
              <input
                value={form.school_name}
                onChange={(e) => handleChange("school_name", e.target.value)}
                placeholder="東京第一大学"
              />
            </label>

            <label>
              所属会
              <select
                value={form.affiliation_id}
                onChange={(e) => handleChange("affiliation_id", e.target.value)}
                disabled={loadingMasters}
              >
                <option value="">
                  {loadingMasters ? "読み込み中..." : "選択してください"}
                </option>
                {affiliations.map((affiliation) => (
                  <option key={affiliation.id} value={affiliation.id}>
                    {affiliation.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              級
              <select
                value={form.class_level_id}
                onChange={(e) => handleChange("class_level_id", e.target.value)}
                disabled={loadingMasters}
              >
                <option value="">
                  {loadingMasters ? "読み込み中..." : "選択してください"}
                </option>
                {classLevels.map((classLevel) => (
                  <option key={classLevel.id} value={classLevel.id}>
                    {classLevel.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              段位
              <select
                value={form.dan_rank_id}
                onChange={(e) => handleChange("dan_rank_id", e.target.value)}
                disabled={loadingMasters}
              >
                <option value="">
                  {loadingMasters ? "読み込み中..." : "選択してください"}
                </option>
                {danRanks.map((danRank) => (
                  <option key={danRank.id} value={danRank.id}>
                    {danRank.name}
                  </option>
                ))}
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
