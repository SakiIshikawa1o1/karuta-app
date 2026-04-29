// src/pages/SystemAdminPage.jsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function SystemAdminPage() {
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [notices, setNotices] = useState([]);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");

  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [message, setMessage] = useState("");

  const userMap = useMemo(() => {
    return Object.fromEntries(users.map((u) => [u.id, u]));
  }, [users]);

  const roleMap = useMemo(() => {
    return Object.fromEntries(roles.map((r) => [r.id, r]));
  }, [roles]);

  const fetchData = async () => {
    setMessage("");

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, full_name, email, organization, grade")
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

    const { data: noticeData, error: noticeError } = await supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false });

    if (noticeError) {
      console.error("お知らせ取得エラー:", noticeError.message);
    }

    setUsers(profileData ?? []);
    setRoles(roleData ?? []);
    setUserRoles(userRoleData ?? []);
    setNotices(noticeData ?? []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignRole = async () => {
    setMessage("");

    if (!selectedUserId || !selectedRoleId) {
      setMessage("ユーザーとロールを選択してください。");
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .upsert(
        {
          user_id: selectedUserId,
          role_id: selectedRoleId,
          is_active: true,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,role_id",
        }
      );

    if (error) {
      setMessage(`ロール付与に失敗しました：${error.message}`);
      return;
    }

    setSelectedUserId("");
    setSelectedRoleId("");
    setMessage("ロールを付与しました。");
    fetchData();
  };

  const handleDisableRole = async (userRoleId) => {
    const ok = window.confirm("このロールを解除しますか？");
    if (!ok) return;

    const { error } = await supabase
      .from("user_roles")
      .update({
        is_active: false,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userRoleId);

    if (error) {
      setMessage(`ロール解除に失敗しました：${error.message}`);
      return;
    }

    setMessage("ロールを解除しました。");
    fetchData();
  };

  const handleCreateNotice = async () => {
    setMessage("");

    if (!noticeTitle || !noticeBody) {
      setMessage("お知らせのタイトルと本文を入力してください。");
      return;
    }

    const { error } = await supabase.from("notices").insert({
      title: noticeTitle,
      body: noticeBody,
      is_published: true,
      published_at: new Date().toISOString(),
      created_by: user?.id,
      updated_by: user?.id,
    });

    if (error) {
      setMessage(`お知らせ作成に失敗しました：${error.message}`);
      return;
    }

    setNoticeTitle("");
    setNoticeBody("");
    setMessage("お知らせを作成しました。");
    fetchData();
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
    fetchData();
  };

  return (
    <div className="screen">
      <h1>システム管理者ページ</h1>

      {message && <p className="info-text">{message}</p>}

      <div className="card">
        <h2>ユーザー一覧</h2>

        {users.length === 0 ? (
          <p>ユーザーがいません。</p>
        ) : (
          <div className="stack">
            {users.map((u) => (
              <div key={u.id} className="mini-card">
                <strong>{u.display_name || u.full_name || u.email}</strong>
                <p>{u.email}</p>
                <p>所属：{u.organization || "未設定"}</p>
                <p>段位：{u.grade || "未設定"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>ロールの付与</h2>

        <label>
          ユーザー
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">選択してください</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name || u.full_name || u.email}
              </option>
            ))}
          </select>
        </label>

        <label>
          ロール
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
          >
            <option value="">選択してください</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>

        <button className="primary" onClick={handleAssignRole}>
          ロールを付与する
        </button>
      </div>

      <div className="card">
        <h2>付与済みロール</h2>

        {userRoles.length === 0 ? (
          <p>付与済みロールがありません。</p>
        ) : (
          <div className="stack">
            {userRoles.map((ur) => {
              const targetUser = userMap[ur.user_id];
              const targetRole = roleMap[ur.role_id];

              return (
                <div className="mini-card" key={ur.id}>
                  <strong>
                    {targetUser?.display_name ||
                      targetUser?.full_name ||
                      targetUser?.email ||
                      "不明なユーザー"}
                  </strong>
                  <p>メール：{targetUser?.email || "-"}</p>
                  <p>ロール：{targetRole?.name || "不明なロール"}</p>

                  <button
                    className="secondary danger"
                    onClick={() => handleDisableRole(ur.id)}
                  >
                    ロール解除
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h2>お知らせの作成</h2>

        <label>
          タイトル
          <input
            value={noticeTitle}
            onChange={(e) => setNoticeTitle(e.target.value)}
            placeholder="お知らせタイトル"
          />
        </label>

        <label>
          本文
          <textarea
            value={noticeBody}
            onChange={(e) => setNoticeBody(e.target.value)}
            placeholder="お知らせ本文"
          />
        </label>

        <button className="primary" onClick={handleCreateNotice}>
          お知らせを作成する
        </button>
      </div>

      <div className="card">
        <h2>お知らせ一覧</h2>

        {notices.length === 0 ? (
          <p>お知らせはありません。</p>
        ) : (
          <div className="stack">
            {notices.map((notice) => (
              <div className="mini-card" key={notice.id}>
                <strong>{notice.title}</strong>
                <p>{notice.body}</p>
                <p>状態：{notice.is_published ? "公開中" : "非公開"}</p>

                <button onClick={() => handleToggleNotice(notice)}>
                  {notice.is_published ? "非公開にする" : "公開する"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}