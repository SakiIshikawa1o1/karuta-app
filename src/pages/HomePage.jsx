// src/pages/HomePage.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const STATUS_LABEL = {
  published: "受付中",
  closed: "受付終了",
  cancelled: "中止",
  draft: "準備中",
};

export default function HomePage() {
  const navigate = useNavigate();

  const [tournaments, setTournaments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingNotices, setLoadingNotices] = useState(true);

  useEffect(() => {
    fetchTournaments();
    fetchNotices();
  }, []);

  const fetchTournaments = async () => {
    setLoadingTournaments(true);

    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("status", "published")
      .order("event_date", { ascending: true })
      .limit(3);

    setLoadingTournaments(false);

    if (error) {
      console.error("大会取得エラー:", error.message);
      return;
    }

    setTournaments(data ?? []);
  };

  const fetchNotices = async () => {
    setLoadingNotices(true);

    const { data, error } = await supabase
      .from("notices")
      .select("id, title, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(3);

    setLoadingNotices(false);

    if (error) {
      console.error("お知らせ取得エラー:", error.message);
      return;
    }

    setNotices(data ?? []);
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    });
  };

  const formatNoticeDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <h1>
            かるたでつながる、
            <br />
            熱い瞬間を。
          </h1>
          <p>
            大会情報の確認から申し込みまで、
            <br />
            すべてオンラインで完結できます。
          </p>

          <button
            className="hero-cta pc-only"
            onClick={() => navigate("/tournaments")}
          >
            大会を探す
            <span>›</span>
          </button>
        </div>

        <div className="hero-image" />
      </section>

      <section className="home-action-row mobile-priority">
        <button
          className="big-action-button primary"
          onClick={() => navigate("/tournaments")}
        >
          <span className="big-action-icon">⌕</span>
          <span>大会を探す</span>
          <span className="big-action-arrow">›</span>
        </button>

        <button
          className="big-action-button secondary"
          onClick={() => navigate("/applications/status")}
        >
          <span className="big-action-icon">▤</span>
          <span>申込状況を見る</span>
          <span className="big-action-arrow">›</span>
        </button>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <h2>
            <span>🏆</span>
            開催予定の大会
          </h2>
          <button onClick={() => navigate("/tournaments")}>
            すべての大会を見る
            <span>›</span>
          </button>
        </div>

        {loadingTournaments ? (
          <div className="empty-card">大会を読み込み中です...</div>
        ) : tournaments.length === 0 ? (
          <div className="empty-card">現在、公開中の大会はありません。</div>
        ) : (
          <div className="home-tournament-grid">
            {tournaments.map((tournament) => (
              <article className="home-tournament-card" key={tournament.id}>
                <div className="home-tournament-image">
                  <span className="tournament-status-label">
                    {STATUS_LABEL[tournament.status] || tournament.status}
                  </span>
                </div>

                <div className="home-tournament-body">
                  <h3>{tournament.title}</h3>

                  <p>
                    <span>▣</span>
                    {formatDate(tournament.event_date)}
                  </p>
                  <p>
                    <span>●</span>
                    {tournament.venue || "会場未設定"}
                  </p>

                  <button
                    className="outline-detail-button"
                    onClick={() => navigate(`/tournaments/${tournament.id}`)}
                  >
                    詳細を見る
                    <span>›</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="content-section">
        <div className="section-heading">
          <h2>
            <span>📣</span>
            お知らせ
          </h2>
          <button type="button">
            お知らせ一覧
            <span>›</span>
          </button>
        </div>

        {loadingNotices ? (
          <div className="empty-card">お知らせを読み込み中です...</div>
        ) : notices.length === 0 ? (
          <div className="empty-card">現在、公開中のお知らせはありません。</div>
        ) : (
          <div className="notice-panel">
            {notices.map((notice, index) => (
              <button className="notice-item" key={notice.id}>
                <span className="notice-date">
                  {formatNoticeDate(notice.published_at)}
                </span>
                <span className={index === 0 ? "notice-tag important" : "notice-tag"}>
                  {index === 0 ? "重要" : "お知らせ"}
                </span>
                <span className="notice-text">{notice.title}</span>
                <span className="notice-arrow">›</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}