import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import SiteFooter from "../components/SiteFooter";
import AppIcon from "../components/AppIcon";

const STATUS_LABEL = {
  published: "受付中",
  closed: "受付終了",
  preparing: "準備中",
  draft: "下書き",
};

function formatDate(value) {
  if (!value) return "未設定";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}/${String(date.getDate()).padStart(2, "0")}`;
}

function formatShortDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function normalizeClassCode(code) {
  return String(code || "").trim().replace("級", "").toLowerCase();
}

function getAllowedClassColumn(classCode) {
  const normalized = normalizeClassCode(classCode);
  return normalized ? `allow_class_${normalized}` : "";
}

export default function HomePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [tournaments, setTournaments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [userClassLevel, setUserClassLevel] = useState(null);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingNotices, setLoadingNotices] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoadingTournaments(true);

      const now = new Date();

      // 今日の翌日 0:00
      // 「今日より後」なので、今日締切の大会は除外する
      const tomorrow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0
      );

      const tournamentsQuery = await supabase
        .from("tournaments")
        .select("*")
        .eq("status", "published")
        .gte("application_deadline", tomorrow.toISOString())
        .order("event_date", { ascending: true });
      const { data, error } = tournamentsQuery;

      setLoadingTournaments(false);

      if (tournamentsQuery.error) {
        console.error("大会取得エラー:", error.message);
        console.error(tournamentsQuery.error.message);
        return;
      }

      setTournaments(data ?? []);
      const { data: classLevelsData, error: classLevelsError } = await supabase
        .from("class_levels")
        .select("id, code, name, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (classLevelsError) {
        console.error("級マスタ取得エラー:", classLevelsError.message);
      }

      const classLevel =
        (classLevelsData ?? []).find(
          (item) => item.id === profile?.class_level_id
        ) || null;
      const allowedClassColumn = getAllowedClassColumn(classLevel?.code);
      const tournamentList = data ?? [];

      setUserClassLevel(classLevel);
      setTournaments(
        allowedClassColumn
          ? tournamentList
              .filter((tournament) => tournament[allowedClassColumn] === true)
              .slice(0, 5)
          : tournamentList.slice(0, 5)
      );
    };

    const fetchNotices = async () => {
      setLoadingNotices(true);

      const { data, error } = await supabase
        .from("notices")
        .select("id, title, published_at, label")
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

    fetchTournaments();
    fetchNotices();
  }, [profile?.class_level_id]);

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
            大会情報の確認から申込、申込状況の管理まで、すべてオンラインで完結できます。
          </p>
        </div>

        <div className="hero-action-row">
          <button
            className="big-action-button primary"
            onClick={() => navigate("/tournaments")}
            type="button"
          >
            <span className="big-action-icon" aria-hidden="true" />
            <span>大会を探す</span>
          </button>

          <button
            className="big-action-button secondary"
            onClick={() => navigate("/applications/status")}
            type="button"
          >
            <span className="big-action-icon" aria-hidden="true" />
            <span>申込状況を確認</span>
          </button>
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <h2>
            <AppIcon name="tournaments" />
            受付中の大会
          </h2>
          <button type="button" onClick={() => navigate("/tournaments")}>
            すべての大会を見る
            <span>›</span>
          </button>
        </div>

        {loadingTournaments ? (
          <div className="empty-card">大会を読み込み中です...</div>
        ) : tournaments.length === 0 ? (
          <div className="empty-card">現在、受付中の大会はありません。</div>
        ) : (
          <div className="home-tournament-grid">
            {tournaments.map((tournament) => {
              const deadline = tournament.application_deadline;

              return (
                <article className="home-tournament-card" key={tournament.id}>
                  <div className="home-tournament-body">
                    <div className="tournament-card-top">
                      <span
                        className={`tournament-status-label status-${tournament.status}`}
                      >
                        {STATUS_LABEL[tournament.status] || tournament.status}
                        {deadline && ` (${formatShortDate(deadline)}まで)`}
                      </span>
                    </div>

                    <h3>{tournament.title}</h3>

                    <p>
                      <span>開催日</span>
                      {formatDate(tournament.event_date)}
                    </p>

                    <p>
                      <span>会場</span>
                      {tournament.venue || "会場未設定"}
                    </p>

                    {userClassLevel && (
                      <p>
                        <span>対象級</span>
                        {userClassLevel.name}
                      </p>
                    )}

                    <button
                      type="button"
                      className="outline-detail-button"
                      onClick={() => navigate(`/tournaments/${tournament.id}`)}
                    >
                      詳細を見る
                      <span>›</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="content-section">
        <div className="section-heading">
          <h2>
            <AppIcon name="notices" />
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
            {notices.map((notice) => (
              <button
                type="button"
                className="notice-item"
                key={notice.id}
                onClick={() => navigate("/notices")}
              >
                <span className="notice-date">
                  {formatDate(notice.published_at)}
                </span>

                <span
                  className={
                    notice.label === "重要"
                      ? "notice-tag important"
                      : "notice-tag"
                  }
                >
                  {notice.label || "お知らせ"}
                </span>

                <span className="notice-text">{notice.title}</span>
                <span className="notice-arrow">›</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
