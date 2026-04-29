// src/pages/MyPage.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ROLE, ROLE_LABEL } from "../utils/roles";

export default function MyPage() {
  const navigate = useNavigate();
  const { user, profile, roles, hasRole, refreshMe } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    full_name: "",
    email: "",
    phone: "",
    organization: "",
    grade: "",
  });

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isSystemAdmin = hasRole(ROLE.SYSTEM_ADMIN);
  const isTournamentAdmin =
    isSystemAdmin || hasRole(ROLE.TOURNAMENT_ADMIN);
  const isApplicationAdmin =
    isSystemAdmin || hasRole(ROLE.APPLICATION_ADMIN);

  const hasAdminMenu =
    isSystemAdmin || isTournamentAdmin || isApplicationAdmin;

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

  return (
    <div className="screen page-shell">
      <div className="page-title-block">
        <p>MY PAGE</p>
        <h1>マイページ</h1>
        <span>登録情報の確認・変更ができます。</span>
      </div>

      <div className="mypage-layout">
        <section className="mypage-card profile-summary-card">
          <h2>
            {profile?.display_name ||
              profile?.full_name ||
              user?.email ||
              "未設定"}{" "}
            さん
          </h2>

          <div className="role-list">
            {roles && roles.length > 0 ? (
              roles.map((role) => (
                <span className="role-badge" key={role}>
                  {ROLE_LABEL[role] || role}
                </span>
              ))
            ) : (
              <span className="role-badge">ロール未設定</span>
            )}
          </div>

          <div className="mypage-shortcuts">
            <button type="button" onClick={() => navigate("/applications/status")}>
              申込履歴を見る
            </button>
            <button type="button" onClick={() => navigate("/tournaments")}>
              大会を探す
            </button>
          </div>
        </section>

        <section className="mypage-card">
          {!isEditing ? (
            <>
              <h2>プロフィール</h2>

              <div className="profile-info-list">
                <p>
                  <strong>表示名</strong>
                  <span>{profile?.display_name || "未設定"}</span>
                </p>
                <p>
                  <strong>氏名</strong>
                  <span>{profile?.full_name || "未設定"}</span>
                </p>
                <p>
                  <strong>メール</strong>
                  <span>{profile?.email || user?.email || "未設定"}</span>
                </p>
                <p>
                  <strong>所属会</strong>
                  <span>{profile?.organization || "未設定"}</span>
                </p>
                <p>
                  <strong>段位</strong>
                  <span>{profile?.grade || "未設定"}</span>
                </p>
                <p>
                  <strong>電話番号</strong>
                  <span>{profile?.phone || "未設定"}</span>
                </p>
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={() => setIsEditing(true)}
              >
                プロフィールを編集する
              </button>
            </>
          ) : (
            <>
              <h2>プロフィール編集</h2>

              {errorMessage && <p className="error-text">{errorMessage}</p>}

              <label>
                表示名
                <input
                  value={form.display_name}
                  onChange={(e) =>
                    handleChange("display_name", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleChange("organization", e.target.value)
                  }
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

              <div className="button-row">
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "保存中..." : "保存する"}
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCancel}
                >
                  キャンセル
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {hasAdminMenu && (
        <section className="mypage-card admin-menu-card">
          <div className="section-heading simple">
            <h2>管理者メニュー</h2>
          </div>

          <div className="admin-menu-grid">
            {isSystemAdmin && (
              <button type="button" onClick={() => navigate("/admin/system")}>
                <span>システム管理者</span>
                <small>ロール付与・お知らせ管理</small>
              </button>
            )}

            {isTournamentAdmin && (
              <button type="button" onClick={() => navigate("/admin/tournament")}>
                <span>大会管理者</span>
                <small>大会の登録・変更</small>
              </button>
            )}

            {isApplicationAdmin && (
              <button type="button" onClick={() => navigate("/admin/application")}>
                <span>申込管理者</span>
                <small>申込者一覧・ステータス変更</small>
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}