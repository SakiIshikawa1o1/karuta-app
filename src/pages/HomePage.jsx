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

    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("status", "published")
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .limit(5);

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

  const formatShortDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
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
            <span>熱い瞬間</span>を。
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
          <span>申込状況を確認する</span>
          <span className="big-action-arrow">›</span>
        </button>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <h2>
            <span>🏆</span>
            受付中の大会
          </h2>
          <button onClick={() => navigate("/tournaments")}>
            すべての大会を見る
            <span>›</span>
          </button>
        </div>

        {loadingTournaments ? (
          <div className="empty-card">大会を読み込み中です...</div>
        ) : tournaments.length === 0 ? (
          <div className="empty-card">現在、開催予定の大会はありません。</div>
        ) : (
          <div className="home-tournament-grid">
            {tournaments.map((tournament) => (


              <article className="home-tournament-card" key={tournament.id}>
                <div className="home-tournament-body">
                  <div className="tournament-card-top">
                    <span className="tournament-status-label">
                      受付中
                    </span>
                  </div>

                  <h3>{tournament.title}</h3>

                  <p>
                    <span>開催日</span>
                    {formatDate(tournament.event_date)}
                  </p>

                  <p>
                    <span>場所</span>
                    {tournament.venue || "会場未設定"}
                  </p>

                  <button className="outline-detail-button">
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
          <button type="button" onClick={() => navigate("/notices")}>
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
              <button
                className="notice-item"
                key={notice.id}
                onClick={() => navigate("/notices")}
              >
                <span className="notice-date">
                  {formatNoticeDate(notice.published_at)}
                </span>
                <span
                  className={index === 0 ? "notice-tag important" : "notice-tag"}
                >
                  {index === 0 ? "重要" : "お知らせ"}
                </span>
                <span className="notice-text">{notice.title}</span>
                <span className="notice-arrow">›</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="content-section">
        <div className="section-heading">
          <h2>
            <span>🔗</span>
            外部リンク集
          </h2>
        </div>

        <div className="external-link-grid">
          <a
            href="https://www.karuta.or.jp/"
            target="_blank"
            rel="noreferrer"
            className="external-link-button"
          >
            <span>全日本かるた協会</span>
            <small>公式情報を確認する</small>
          </a>

          <a
            href="https://www.karuta.or.jp/"
            target="_blank"
            rel="noreferrer"
            className="external-link-button"
          >
            <span>大会情報</span>
            <small>競技会の情報を見る</small>
          </a>

          <a
            href="https://www.karuta.or.jp/"
            target="_blank"
            rel="noreferrer"
            className="external-link-button"
          >
            <span>競技規程</span>
            <small>ルールを確認する</small>
          </a>

          <a
            href="https://www.karuta.or.jp/"
            target="_blank"
            rel="noreferrer"
            className="external-link-button"
          >
            <span>競技かるたを知る</span>
            <small>はじめての方向け</small>
          </a>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-main">
          <div>
            <div className="footer-logo">
              <span className="footer-logo-image" aria-hidden="true" />
              <div>
                <strong>まにまに</strong>
                <small>Karuta Tournament System</small>
              </div>
            </div>

            <p className="footer-description">
              競技かるたの大会情報確認から申込状況の管理までを、
              もっとわかりやすく、もっとスムーズに。
            </p>
          </div>

          <div className="footer-links">
            <div>
              <h3>サイト</h3>
              <button type="button" onClick={() => navigate("/")}>
                ホーム
              </button>
              <button type="button" onClick={() => navigate("/tournaments")}>
                大会一覧
              </button>
              <button type="button" onClick={() => navigate("/notices")}>
                お知らせ
              </button>
            </div>

            <div>
              <h3>会員メニュー</h3>
              <button
                type="button"
                onClick={() => navigate("/applications/status")}
              >
                申込状況確認
              </button>
              <button type="button" onClick={() => navigate("/mypage")}>
                マイページ
              </button>
              <button type="button" onClick={() => navigate("/login")}>
                ログイン
              </button>
            </div>

            <div>
              <h3>その他</h3>
              <button type="button">利用規約</button>
              <button type="button">プライバシーポリシー</button>
              <button type="button">お問い合わせ</button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 まにまに</span>
          <span>競技かるた大会申込システム</span>
        </div>
      </footer>
    </div>
  );
}