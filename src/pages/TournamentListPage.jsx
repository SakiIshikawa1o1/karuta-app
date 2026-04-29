// src/pages/TournamentListPage.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const STATUS_LABEL = {
  draft: "準備中",
  published: "受付中",
  closed: "受付終了",
  cancelled: "中止",
};

export default function TournamentListPage() {
  const navigate = useNavigate();

  const [tournaments, setTournaments] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchTournaments = async () => {
    setLoading(true);
    setMessage("");

    let query = supabase
      .from("tournaments")
      .select("*")
      .order("event_date", { ascending: true });

    if (keyword) {
      query = query.ilike("title", `%${keyword}%`);
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
  }, []);

  return (
    <div className="screen page-shell">
      <div className="page-title-block">
        <p>TOURNAMENTS</p>
        <h1>大会を探す</h1>
        <span>開催予定の大会を確認できます。</span>
      </div>

      <div className="search-panel">
        <input
          placeholder="大会名で検索"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button onClick={fetchTournaments}>検索する</button>
      </div>

      {message && <p className="error-text">{message}</p>}

      {loading ? (
        <div className="empty-card">読み込み中...</div>
      ) : tournaments.length === 0 ? (
        <div className="empty-card">表示できる大会がありません。</div>
      ) : (
        <div className="tournament-grid">
          {tournaments.map((tournament) => (
            <article className="list-tournament-card" key={tournament.id}>
              <div className="list-tournament-image">
                <span>{STATUS_LABEL[tournament.status] || tournament.status}</span>
              </div>

              <div className="list-tournament-body">
                <h2>{tournament.title}</h2>
                <p>開催日：{tournament.event_date}</p>
                <p>会場：{tournament.venue}</p>
                {tournament.capacity && <p>定員：{tournament.capacity}名</p>}

                <button onClick={() => navigate(`/tournaments/${tournament.id}`)}>
                  詳細を見る
                  <span>›</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}