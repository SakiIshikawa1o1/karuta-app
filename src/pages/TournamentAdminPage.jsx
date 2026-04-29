// src/pages/TournamentAdminPage.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ROLE } from "../utils/roles";

const STATUS_LABEL = {
  draft: "下書き",
  published: "公開中",
  closed: "受付終了",
  cancelled: "中止",
};

export default function TournamentAdminPage() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  const [tournaments, setTournaments] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const isSystemAdmin = hasRole(ROLE.SYSTEM_ADMIN);

  const fetchTournaments = async () => {
    if (!user) return;

    setLoading(true);
    setMessage("");

    let query = supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false });

    // システム管理者は全大会
    // 大会管理者は自分が登録した大会のみ
    if (!isSystemAdmin) {
      query = query.eq("created_by", user.id);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      setMessage(`大会一覧の取得に失敗しました：${error.message}`);
      return;
    }

    setTournaments(data ?? []);
  };

  useEffect(() => {
    fetchTournaments();
  }, [user, isSystemAdmin]);

  return (
    <div className="screen">
      <h1>大会管理者ページ</h1>

      {message && <p className="error-text">{message}</p>}

      <div className="grid">
        <button
          className="primary"
          onClick={() => navigate("/admin/tournament/new")}
        >
          大会を登録する
        </button>

        <button onClick={() => navigate("/admin/tournament/edit")}>
          大会を変更する
        </button>
      </div>

      <div className="card">
        <h2>{isSystemAdmin ? "全大会" : "自分が登録した大会"}</h2>

        {loading ? (
          <p>読み込み中...</p>
        ) : tournaments.length === 0 ? (
          <p>対象の大会がありません。</p>
        ) : (
          <div className="stack">
            {tournaments.map((t) => (
              <div key={t.id} className="mini-card">
                <span className="badge">
                  {STATUS_LABEL[t.status] || t.status}
                </span>
                <h3>{t.title}</h3>
                <p>開催日：{t.event_date}</p>
                <p>会場：{t.venue}</p>
                <p>定員：{t.capacity || "未設定"}</p>

                <button onClick={() => navigate("/admin/tournament/edit")}>
                  この大会を変更する
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}