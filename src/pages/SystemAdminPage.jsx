// src/pages/SystemAdminPage.jsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM8 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.3 0-6 1.7-6 3.8V19h9v-2.2c0-1.2.5-2.3 1.4-3.1A10 10 0 0 0 8 13Zm8 0c-3.3 0-6 1.7-6 3.8V19h12v-2.2c0-2.1-2.7-3.8-6-3.8Z"
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

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 2h6l1 2h3v18H5V4h3l1-2Zm1.2 3h3.6l-.5-1h-2.6l-.5 1ZM8 9h8v2H8V9Zm0 4h8v2H8v-2Zm0 4h5v2H8v-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 22a2.8 2.8 0 0 0 2.7-2H9.3A2.8 2.8 0 0 0 12 22Zm8-5-2-2v-5a6 6 0 0 0-4.5-5.8V2h-3v2.2A6 6 0 0 0 6 10v5l-2 2v1h16v-1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 5h18v14H3V5Zm9 7.2L5.3 7H4.8l7.2 5.6L19.2 7h-.5L12 12.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" fill="currentColor" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 21 23 12 2 3v7l15 2-15 2v7Z" fill="currentColor" />
    </svg>
  );
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}/${month}/${day}`;
}

function getDisplayName(targetUser) {
  return (
    targetUser?.full_name ||
    targetUser?.display_name ||
    targetUser?.email ||
    "未設定"
  );
}

function getInquiryTitle(inquiry) {
  return inquiry?.subject || "問い合わせ";
}

function isInquiryHandled(inquiry) {
  const status = inquiry?.status || inquiry?.response_status || "";
  return ["handled", "done", "closed", "対応済み"].includes(status);
}

function getInquiryStatus(inquiry) {
  if (isInquiryHandled(inquiry)) return "handled";
  return inquiry?.status || inquiry?.response_status || "unhandled";
}

export default function SystemAdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [notices, setNotices] = useState([]);
  const [affiliations, setAffiliations] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [danRanks, setDanRanks] = useState([]);
  const [inquiries, setInquiries] = useState([]);

  const [pendingRoleByUser, setPendingRoleByUser] = useState({});
  const [userSearch, setUserSearch] = useState("");

  const [pendingAffiliationById, setPendingAffiliationById] = useState({});
  const [affiliationName, setAffiliationName] = useState("");
  const [affiliationApprovalCode, setAffiliationApprovalCode] = useState("");
  const [affiliationRepresentativeUserId, setAffiliationRepresentativeUserId] =
    useState("");
  const [selectedNoticeId, setSelectedNoticeId] = useState("");
  const [noticeEditLabel, setNoticeEditLabel] = useState("");
  const [noticeEditTitle, setNoticeEditTitle] = useState("");
  const [noticeEditBody, setNoticeEditBody] = useState("");

  const [noticeLabel, setNoticeLabel] = useState("");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");

  const [pendingInquiryStatusById, setPendingInquiryStatusById] = useState({});
  const [applicationCount, setApplicationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const activeUserRoleMap = useMemo(() => {
    const map = {};

    userRoles.forEach((userRole) => {
      if (!map[userRole.user_id]) {
        map[userRole.user_id] = userRole;
      }
    });

    return map;
  }, [userRoles]);

  const filteredUsers = useMemo(() => {
    const keyword = userSearch.trim().toLowerCase();

    if (!keyword) return users;

    return users.filter((targetUser) => {
      const name = getDisplayName(targetUser).toLowerCase();
      const email = String(targetUser.email || "").toLowerCase();
      const affiliationName =
        affiliations.find((item) => item.id === targetUser.affiliation_id)
          ?.name || "";

      return (
        name.includes(keyword) ||
        email.includes(keyword) ||
        affiliationName.toLowerCase().includes(keyword)
      );
    });
  }, [users, userSearch, affiliations]);

  const unresolvedInquiryCount = useMemo(() => {
    return inquiries.filter((item) => !isInquiryHandled(item)).length;
  }, [inquiries]);

  const stats = [
    {
      key: "users",
      label: "ユーザー数",
      value: users.length.toLocaleString(),
      unit: "人",
      icon: <UsersIcon />,
      color: "red",
    },
    {
      key: "affiliations",
      label: "所属会数",
      value: affiliations.length.toLocaleString(),
      unit: "件",
      icon: <BuildingIcon />,
      color: "blue",
    },
    {
      key: "applications",
      label: "申込数",
      value: applicationCount.toLocaleString(),
      unit: "件",
      icon: <ClipboardIcon />,
      color: "orange",
    },
    {
      key: "contacts",
      label: "問い合わせ数",
      value: inquiries.length.toLocaleString(),
      unit: "件",
      icon: <BellIcon />,
      color: "red",
    },
  ];

  const fetchProfilesAndRoles = async () => {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, full_name, email, affiliation_id, class_level_id, dan_rank_id")
      .order("created_at", { ascending: false });

    if (profileError) {
      setMessage(`ユーザー取得に失敗しました：${profileError.message}`);
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("id, code, name")
      .order("created_at", { ascending: true });

    if (roleError) {
      setMessage(`ロール取得に失敗しました：${roleError.message}`);
      return;
    }

    const { data: userRoleData, error: userRoleError } = await supabase
      .from("user_roles")
      .select("id, user_id, role_id, is_active, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (userRoleError) {
      setMessage(`付与済みロール取得に失敗しました：${userRoleError.message}`);
      return;
    }

    setUsers(profileData ?? []);
    setRoles(roleData ?? []);
    setUserRoles(userRoleData ?? []);

    const pending = {};

    (profileData ?? []).forEach((targetUser) => {
      const currentRole = (userRoleData ?? []).find(
        (role) => role.user_id === targetUser.id
      );

      pending[targetUser.id] = currentRole?.role_id || "";
    });

    setPendingRoleByUser(pending);
  };

  const fetchNotices = async () => {
    const { data, error } = await supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("お知らせ取得エラー:", error.message);
      return;
    }

    setNotices(data ?? []);
  };

  const fetchAffiliations = async () => {
    const { data, error } = await supabase
      .from("affiliations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("所属会取得エラー:", error.message);
      setAffiliations([]);
      return;
    }

    const affiliationList = data ?? [];
    setAffiliations(affiliationList);

    const pending = {};

    affiliationList.forEach((affiliation) => {
      pending[affiliation.id] = {
        representative_user_id: affiliation.representative_user_id || "",
        is_active: affiliation.is_active !== false,
        approval_code: affiliation.approval_code || "",
      };
    });

    setPendingAffiliationById(pending);
  };

  const fetchMasters = async () => {
    const [classLevelsResult, danRanksResult] = await Promise.all([
      supabase
        .from("class_levels")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true }),
      supabase
        .from("dan_ranks")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true }),
    ]);

    if (!classLevelsResult.error) setClassLevels(classLevelsResult.data ?? []);
    if (!danRanksResult.error) setDanRanks(danRanksResult.data ?? []);
  };

  const fetchInquiries = async () => {
    const { data, error } = await supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("問い合わせ取得エラー:", error.message);
      setInquiries([]);
      return;
    }

    setInquiries(data ?? []);
  };

  const fetchApplicationCount = async () => {
    const { count, error } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("申込数取得エラー:", error.message);
      setApplicationCount(0);
      return;
    }

    setApplicationCount(count ?? 0);
  };

  const fetchData = async () => {
    setLoading(true);
    setMessage("");

    await Promise.all([
      fetchProfilesAndRoles(),
      fetchNotices(),
      fetchAffiliations(),
      fetchMasters(),
      fetchInquiries(),
      fetchApplicationCount(),
    ]);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateUserRole = async (targetUserId) => {
    const nextRoleId = pendingRoleByUser[targetUserId];

    if (!targetUserId || !nextRoleId) {
      setMessage("ユーザーとロールを選択してください。");
      return;
    }

    const ok = window.confirm("このユーザーのロールを更新しますか？");
    if (!ok) return;

    setMessage("");

    const { error: disableError } = await supabase
      .from("user_roles")
      .update({
        is_active: false,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", targetUserId)
      .eq("is_active", true);

    if (disableError) {
      setMessage(`既存ロールの解除に失敗しました：${disableError.message}`);
      return;
    }

    const { error } = await supabase.from("user_roles").upsert(
      {
        user_id: targetUserId,
        role_id: nextRoleId,
        is_active: true,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,role_id",
      }
    );

    if (error) {
      setMessage(`ロール更新に失敗しました：${error.message}`);
      return;
    }

    setMessage("ロールを更新しました。");
    fetchProfilesAndRoles();
  };

  const handleCreateAffiliation = async () => {
    setMessage("");

    if (!affiliationName.trim()) {
      setMessage("所属会名を入力してください。");
      return;
    }

    if (!/^\d{4}$/.test(affiliationApprovalCode)) {
      setMessage("所属会コードは4桁の数字で入力してください。");
      return;
    }

    const { error } = await supabase.rpc("admin_create_affiliation", {
      p_name: affiliationName.trim(),
      p_representative_user_id: affiliationRepresentativeUserId || null,
      p_approval_code: affiliationApprovalCode,
    });

    if (error) {
      setMessage(`所属会の追加に失敗しました：${error.message}`);
      return;
    }

    setAffiliationName("");
    setAffiliationApprovalCode("");
    setAffiliationRepresentativeUserId("");
    setMessage("所属会を追加しました。");
    fetchAffiliations();
  };

  const handleUpdateAffiliation = async (affiliationId) => {
    const pending = pendingAffiliationById[affiliationId];

    if (!pending) {
      setMessage("更新内容が見つかりません。");
      return;
    }

    if (!/^\d{4}$/.test(pending.approval_code || "")) {
      setMessage("所属会コードは4桁の数字で入力してください。");
      return;
    }

    const { error } = await supabase.rpc("admin_update_affiliation", {
      p_affiliation_id: affiliationId,
      p_representative_user_id: pending.representative_user_id || null,
      p_is_active: pending.is_active,
      p_approval_code: pending.approval_code,
    });

    if (error) {
      setMessage(`所属会の更新に失敗しました：${error.message}`);
      return;
    }

    setMessage("所属会を更新しました。");
    fetchAffiliations();
  };

  const handleCreateNotice = async () => {
    setMessage("");

    if (!noticeLabel.trim() || !noticeTitle.trim() || !noticeBody.trim()) {
      setMessage("ラベル名、タイトル、内容を入力してください。");
      return;
    }

    const { error } = await supabase.from("notices").insert({
      label: noticeLabel.trim(),
      title: noticeTitle.trim(),
      body: noticeBody.trim(),
      is_published: true,
      published_at: new Date().toISOString(),
      created_by: user?.id,
      updated_by: user?.id,
    });

    if (error) {
      setMessage(`お知らせ作成に失敗しました：${error.message}`);
      return;
    }

    setNoticeLabel("");
    setNoticeTitle("");
    setNoticeBody("");
    setMessage("お知らせを作成しました。");
    fetchNotices();
  };

  const handleSelectNotice = (notice) => {
    setSelectedNoticeId(notice.id);
    setNoticeEditLabel(notice.label || "");
    setNoticeEditTitle(notice.title || "");
    setNoticeEditBody(notice.body || "");
  };

  const handleUpdateNotice = async () => {
    setMessage("");

    if (!selectedNoticeId) {
      setMessage("編集するお知らせを選択してください。");
      return;
    }

    if (!noticeEditLabel.trim() || !noticeEditTitle.trim() || !noticeEditBody.trim()) {
      setMessage("ラベル名、タイトル、内容を入力してください。");
      return;
    }

    const { error } = await supabase
      .from("notices")
      .update({
        label: noticeEditLabel.trim(),
        title: noticeEditTitle.trim(),
        body: noticeEditBody.trim(),
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedNoticeId);

    if (error) {
      setMessage(`お知らせ更新に失敗しました：${error.message}`);
      return;
    }

    setMessage("お知らせを更新しました。");
    fetchNotices();
  };

  const handleToggleNotice = async (notice) => {
    const { error } = await supabase
      .from("notices")
      .update({
        is_published: !notice.is_published,
        published_at: !notice.is_published
          ? new Date().toISOString()
          : notice.published_at,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", notice.id);

    if (error) {
      setMessage(`お知らせ更新に失敗しました：${error.message}`);
      return;
    }

    setMessage("お知らせの公開状態を更新しました。");
    fetchNotices();
  };

  const handleDeleteNotice = async () => {
    if (!selectedNoticeId) return;

    const ok = window.confirm("選択中のお知らせを削除しますか？");
    if (!ok) return;

    const { error } = await supabase.rpc("admin_delete_notice", {
      p_notice_id: selectedNoticeId,
    });

    if (error) {
      const { error: deleteError } = await supabase
        .from("notices")
        .delete()
        .eq("id", selectedNoticeId);

      if (deleteError) {
        setMessage(`お知らせの削除に失敗しました：${deleteError.message}`);
        return;
      }
    }

    setSelectedNoticeId("");
    setNoticeEditLabel("");
    setNoticeEditTitle("");
    setNoticeEditBody("");
    setMessage("お知らせを削除しました。");
    fetchNotices();
  };

  const handleUpdateInquiryStatus = async (inquiry) => {
    const nextStatus = pendingInquiryStatusById[inquiry.id];

    if (!nextStatus) {
      setMessage("変更するステータスを選択してください。");
      return;
    }

    const { error } = await supabase
      .from("inquiries")
      .update({
        status: nextStatus,
        handled_by: ["handled", "closed"].includes(nextStatus) ? user?.id : null,
        handled_at: ["handled", "closed"].includes(nextStatus)
          ? new Date().toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inquiry.id);

    if (error) {
      setMessage(`問い合わせステータス更新に失敗しました：${error.message}`);
      return;
    }

    setMessage("問い合わせステータスを更新しました。");
    fetchInquiries();
  };

  return (
    <div className="system-admin-page">
      <section className="system-admin-hero">
        <div className="system-admin-hero-icon">
          <UsersIcon />
        </div>

        <div>
          <h1>システム管理者</h1>
          <p>システム全体を管理・運用します。</p>
        </div>
      </section>

      {message && <p className="system-admin-message">{message}</p>}

      {loading ? (
        <div className="system-admin-empty">読み込み中...</div>
      ) : (
        <>
          <section className="system-admin-stats-grid">
            {stats.map((item) => (
              <article
                className={`system-admin-stat-card ${item.color}`}
                key={item.key}
              >
                <div className="system-admin-stat-title">
                  {item.icon}
                  <span>{item.label}</span>
                </div>

                <strong>
                  {item.value}
                  <small>{item.unit}</small>
                </strong>
              </article>
            ))}
          </section>

          <section className="system-admin-panel">
            <div className="system-admin-section-title compact">
              <UsersIcon />
              <h2>所属会申請</h2>
            </div>

            <button
              type="button"
              className="system-admin-main-button compact"
              onClick={() => navigate("/admin/affiliation-approvals")}
            >
              申請を確認する
            </button>
          </section>

          <section className="system-admin-panel">
            <div className="system-admin-section-title">
              <div>
                <h2>ユーザー権限管理</h2>
                <p>ユーザーの所属と権限を管理します。</p>
              </div>
            </div>

            <div className="system-admin-search-row">
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="ユーザー名・メール・所属会で検索"
              />
            </div>

            <div className="system-admin-table-wrap">
              <table className="system-admin-user-table">
                <thead>
                  <tr>
                    <th>ユーザー名</th>
                    <th>所属先</th>
                    <th>現在の役割</th>
                    <th>操作</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((targetUser) => {
                    const activeRole = activeUserRoleMap[targetUser.id];
                    const pendingRoleId =
                      pendingRoleByUser[targetUser.id] ||
                      activeRole?.role_id ||
                      "";
                    const targetAffiliationName =
                      affiliations.find(
                        (item) => item.id === targetUser.affiliation_id
                      )?.name || "未設定";
                    const targetClassLevelName =
                      classLevels.find(
                        (item) => item.id === targetUser.class_level_id
                      )?.name || "未設定";
                    const targetDanRankName =
                      danRanks.find((item) => item.id === targetUser.dan_rank_id)
                        ?.name || "未設定";

                    return (
                      <tr key={targetUser.id}>
                        <td>
                          <div className="system-admin-user-cell">
                            <div>
                              <strong>{getDisplayName(targetUser)}</strong>
                              <span>{targetUser.email}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          {targetAffiliationName}
                          <br />
                          <small>
                            {targetClassLevelName} / {targetDanRankName}
                          </small>
                        </td>

                        <td>
                          <select
                            value={pendingRoleId}
                            onChange={(event) =>
                              setPendingRoleByUser((prev) => ({
                                ...prev,
                                [targetUser.id]: event.target.value,
                              }))
                            }
                          >
                            <option value="">ロール未設定</option>
                            {roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="system-admin-update-button"
                            onClick={() => handleUpdateUserRole(targetUser.id)}
                          >
                            更新
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="system-admin-panel">
            <div className="system-admin-section-title compact">
              <BuildingIcon />
              <h2>所属会の追加 / 編集</h2>
            </div>

            <div className="system-admin-affiliation-table">
              <div className="system-admin-affiliation-head">
                <span>所属会名</span>
                <span>代表者</span>
                <span>所属会コード</span>
                <span>有効</span>
                <span>操作</span>
              </div>

              {affiliations.length === 0 ? (
                <div className="system-admin-empty-row">
                  所属会がありません。
                </div>
              ) : (
                affiliations.map((affiliation) => {
                  const pending = pendingAffiliationById[affiliation.id] || {
                    representative_user_id:
                      affiliation.representative_user_id || "",
                    is_active: affiliation.is_active !== false,
                    approval_code: affiliation.approval_code || "",
                  };

                  return (
                    <div
                      className="system-admin-affiliation-row"
                      key={affiliation.id}
                    >
                      <strong>{affiliation.name}</strong>

                      <select
                        value={pending.representative_user_id}
                        onChange={(event) =>
                          setPendingAffiliationById((prev) => ({
                            ...prev,
                            [affiliation.id]: {
                              ...pending,
                              representative_user_id: event.target.value,
                            },
                          }))
                        }
                      >
                        <option value="">代表者未設定</option>
                        {users.map((targetUser) => (
                          <option
                            key={targetUser.id}
                            value={targetUser.id}
                          >
                            {getDisplayName(targetUser)}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{4}"
                        maxLength={4}
                        value={pending.approval_code}
                        onChange={(event) =>
                          setPendingAffiliationById((prev) => ({
                            ...prev,
                            [affiliation.id]: {
                              ...pending,
                              approval_code: event.target.value
                                .replace(/\D/g, "")
                                .slice(0, 4),
                            },
                          }))
                        }
                        placeholder="例：1234"
                      />

                      <select
                        value={pending.is_active ? "true" : "false"}
                        onChange={(event) =>
                          setPendingAffiliationById((prev) => ({
                            ...prev,
                            [affiliation.id]: {
                              ...pending,
                              is_active: event.target.value === "true",
                            },
                          }))
                        }
                      >
                        <option value="true">有効</option>
                        <option value="false">無効</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleUpdateAffiliation(affiliation.id)}
                      >
                        更新
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="system-admin-affiliation-form">
              <input
                value={affiliationName}
                onChange={(event) => setAffiliationName(event.target.value)}
                placeholder="所属会名"
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={affiliationApprovalCode}
                onChange={(event) =>
                  setAffiliationApprovalCode(
                    event.target.value.replace(/\D/g, "").slice(0, 4)
                  )
                }
                placeholder="所属会コード（例：1234）"
              />
              <select
                value={affiliationRepresentativeUserId}
                onChange={(event) =>
                  setAffiliationRepresentativeUserId(event.target.value)
                }
              >
                <option value="">代表者未設定</option>
                {users.map((targetUser) => (
                  <option key={targetUser.id} value={targetUser.id}>
                    {getDisplayName(targetUser)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="system-admin-main-button compact"
              onClick={handleCreateAffiliation}
            >
              <PlusIcon />
              所属会を追加
            </button>
          </section>

          <section className="system-admin-panel">
            <div className="system-admin-section-title compact">
              <BellIcon />
              <h2>お知らせの追加 / 編集</h2>
            </div>

            <div className="system-admin-notice-list">
              {notices.length === 0 ? (
                <div className="system-admin-empty-row">
                  お知らせはありません。
                </div>
              ) : (
                notices.slice(0, 6).map((notice) => (
                  <button
                    type="button"
                    key={notice.id}
                    className={`system-admin-notice-item ${
                      selectedNoticeId === notice.id ? "active" : ""
                    }`}
                    onClick={() => handleSelectNotice(notice)}
                  >
                    <span>
                      {notice.label || (notice.is_published ? "公開中" : "非公開")}
                    </span>
                    <strong>{notice.title}</strong>
                    <small>{formatDate(notice.published_at || notice.created_at)}</small>
                    <em>›</em>
                  </button>
                ))
              )}
            </div>

            <div className="system-admin-notice-create-block">
              <h3 className="system-admin-subheading">
                {selectedNoticeId ? "選択中のお知らせを編集" : "新規お知らせを作成"}
              </h3>

              <label className="system-admin-input-label">
                ラベル名
                <input
                  value={selectedNoticeId ? noticeEditLabel : noticeLabel}
                  onChange={(event) =>
                    selectedNoticeId
                      ? setNoticeEditLabel(event.target.value)
                      : setNoticeLabel(event.target.value)
                  }
                  placeholder="例）重要 / メンテナンス / お知らせ"
                  maxLength={30}
                />
                <small>
                  {(selectedNoticeId ? noticeEditLabel : noticeLabel).length} / 30
                </small>
              </label>

              <label className="system-admin-input-label">
                タイトル
                <input
                  value={selectedNoticeId ? noticeEditTitle : noticeTitle}
                  onChange={(event) =>
                    selectedNoticeId
                      ? setNoticeEditTitle(event.target.value)
                      : setNoticeTitle(event.target.value)
                  }
                  placeholder="タイトルを入力してください"
                  maxLength={100}
                />
                <small>
                  {(selectedNoticeId ? noticeEditTitle : noticeTitle).length} / 100
                </small>
              </label>

              <label className="system-admin-input-label">
                内容
                <textarea
                  value={selectedNoticeId ? noticeEditBody : noticeBody}
                  onChange={(event) =>
                    selectedNoticeId
                      ? setNoticeEditBody(event.target.value)
                      : setNoticeBody(event.target.value)
                  }
                  placeholder="お知らせ内容を入力してください"
                  maxLength={2000}
                />
                <small>
                  {(selectedNoticeId ? noticeEditBody : noticeBody).length} / 2000
                </small>
              </label>

              <div className="system-admin-notice-button-row">
                {selectedNoticeId && (
                  <button
                    type="button"
                    className="system-admin-secondary-button"
                    onClick={() => {
                      setSelectedNoticeId("");
                      setNoticeEditLabel("");
                      setNoticeEditTitle("");
                      setNoticeEditBody("");
                    }}
                  >
                    新規作成に戻す
                  </button>
                )}

                {selectedNoticeId && (
                  <button
                    type="button"
                    className="system-admin-secondary-button danger"
                    onClick={handleDeleteNotice}
                  >
                    削除する
                  </button>
                )}

                <button
                  type="button"
                  className="system-admin-main-button compact"
                  onClick={selectedNoticeId ? handleUpdateNotice : handleCreateNotice}
                >
                  <SendIcon />
                  {selectedNoticeId ? "更新する" : "公開する"}
                </button>
              </div>
            </div>
          </section>

          <section className="system-admin-panel">
            <div className="system-admin-section-title compact">
              <MailIcon />
              <h2>問い合わせ確認 / 対応</h2>
            </div>

            <div className="system-admin-inquiry-table-wrap">
              <table className="system-admin-inquiry-table">
                <thead>
                  <tr>
                    <th>状態</th>
                    <th>氏名</th>
                    <th>件名</th>
                    <th>内容</th>
                    <th>日付</th>
                    <th>ステータス変更</th>
                    <th>操作</th>
                  </tr>
                </thead>

                <tbody>
                  {inquiries.length === 0 ? (
                    <tr>
                      <td colSpan="7">問い合わせはありません。</td>
                    </tr>
                  ) : (
                    inquiries.map((inquiry) => {
                      const currentStatus =
                        pendingInquiryStatusById[inquiry.id] ||
                        getInquiryStatus(inquiry);

                      return (
                        <tr key={inquiry.id}>
                          <td>
                            <span
                              className={`system-admin-inquiry-status ${
                                isInquiryHandled(inquiry)
                                  ? "handled"
                                  : "unhandled"
                              }`}
                            >
                              {isInquiryHandled(inquiry) ? "対応済み" : "未対応"}
                            </span>
                          </td>

                          <td>{getDisplayName(users.find((item) => item.id === inquiry.user_id))}</td>
                          <td>{getInquiryTitle(inquiry)}</td>
                          <td className="system-admin-inquiry-body-cell">
                            {inquiry.body || "未入力"}
                          </td>
                          <td>{formatDate(inquiry.created_at)}</td>

                          <td>
                            <select
                              value={currentStatus}
                              onChange={(event) =>
                                setPendingInquiryStatusById((prev) => ({
                                  ...prev,
                                  [inquiry.id]: event.target.value,
                                }))
                              }
                            >
                              <option value="unhandled">未対応</option>
                              <option value="handling">対応中</option>
                              <option value="handled">対応済み</option>
                            </select>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="system-admin-update-button"
                              onClick={() => handleUpdateInquiryStatus(inquiry)}
                            >
                              更新
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
