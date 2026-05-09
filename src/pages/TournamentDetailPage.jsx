// src/pages/TournamentDetailPage.jsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const STATUS_LABEL = {
  draft: "準備中",
  published: "受付中",
  closed: "受付終了",
  cancelled: "中止",
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatDate(value) {
  if (!value) return "未設定";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const day = WEEKDAYS[date.getDay()];

  return `${yyyy}/${mm}/${dd} (${day})`;
}

function formatDeadline(value) {
  if (!value) return "未設定";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const day = WEEKDAYS[date.getDay()];
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${yyyy}/${mm}/${dd} (${day}) ${hh}:${min}まで`;
}

function formatDeadlineShort(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatYen(value) {
  if (value === null || value === undefined || value === "") return "未設定";
  return `${Number(value).toLocaleString("ja-JP")}円`;
}

export default function TournamentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchTournament = async () => {
    if (authLoading) return;

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      setLoading(false);
      setMessage(`大会詳細の取得に失敗しました：${error.message}`);
      return;
    }

    if (!data) {
      setLoading(false);
      setMessage("大会が見つかりません。");
      return;
    }

    setTournament(data);

    if (user) {
      const { data: appData } = await supabase
        .from("applications")
        .select("id, status")
        .eq("tournament_id", id)
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .maybeSingle();

      setAlreadyApplied(!!appData);
    } else {
      setAlreadyApplied(false);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchTournament();
  }, [id, user, authLoading]);

  const canApply = tournament?.status === "published" && !alreadyApplied;

  const statusLabel = useMemo(() => {
    if (!tournament) return "";
    return STATUS_LABEL[tournament.status] || tournament.status;
  }, [tournament]);

  const displayStatusLabel = useMemo(() => {
    if (!tournament) return "";

    if (tournament.status === "published" && tournament.application_deadline) {
      const shortDeadline = formatDeadlineShort(tournament.application_deadline);
      return shortDeadline ? `${statusLabel}（${shortDeadline}まで）` : statusLabel;
    }

    return statusLabel;
  }, [tournament, statusLabel]);

  const statusClass = useMemo(() => {
    if (!tournament) return "";
    if (tournament.status === "closed") return "is-closed";
    if (tournament.status === "cancelled") return "is-cancelled";
    if (tournament.status === "draft") return "is-draft";
    return "";
  }, [tournament]);

  const handleApplyClick = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (canApply) {
      navigate(`/tournaments/${id}/apply`);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="tournament-detail-page">
        <div className="tournament-detail-loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="tournament-detail-page">
      {message && <p className="error-text">{message}</p>}

      {tournament && (
        <>
          <section className="tournament-detail-hero" />

          <section className="tournament-detail-summary-card">
            <div className="tournament-detail-status-top">
              <span className={`detail-status-pill ${statusClass}`}>
                {displayStatusLabel}
              </span>
            </div>

            <h1>{tournament.title}</h1>

            <div className="tournament-detail-summary-meta">
              <div className="detail-summary-meta-row">
                <div className="detail-summary-icon detail-summary-icon-date">
                  日
                </div>
                <span>開催日</span>
                <strong>{formatDate(tournament.event_date)}</strong>
              </div>

              <div className="detail-summary-meta-row">
                <div className="detail-summary-icon detail-summary-icon-venue">
                  場
                </div>
                <span>会場</span>
                <strong>{tournament.venue || "未設定"}</strong>
              </div>
            </div>
          </section>

          <nav className="tournament-detail-tabs" aria-label="大会詳細タブ">
            <button type="button" className="active">
              要項
            </button>
          </nav>

          <main className="tournament-detail-content">
            <section className="detail-info-card">
              <div className="detail-info-icon calendar">日</div>
              <div>
                <h2>開催日時</h2>
                <p className="detail-large-text">
                  {formatDate(tournament.event_date)}
                </p>
              </div>
            </section>

            <section className="detail-info-card">
              <div className="detail-info-icon map">場</div>
              <div>
                <h2>住所</h2>
                <p>{tournament.address || "住所未設定"}</p>
              </div>
            </section>

            <section className="detail-info-card">
              <div className="detail-info-icon people">人</div>
              <div>
                <h2>参加資格・定員</h2>
                <p>
                  {tournament.eligibility ||
                    "参加資格は大会要項をご確認ください。"}
                </p>
                <p>
                  定員：
                  {tournament.capacity
                    ? `${tournament.capacity}名`
                    : "未設定"}
                </p>
              </div>
            </section>

            <section className="detail-info-card">
              <div className="detail-info-icon deadline">締</div>
              <div>
                <h2>申込締切</h2>
                <p className="detail-large-text">
                  {formatDeadline(tournament.application_deadline)}
                </p>
              </div>
            </section>

            <section className="detail-info-card">
              <div className="detail-info-icon yen">円</div>
              <div>
                <h2>参加費</h2>
                <p className="detail-large-text">
                  {formatYen(tournament.entry_fee)}
                  {tournament.fee_note && (
                    <span className="detail-fee-note">
                      {tournament.fee_note}
                    </span>
                  )}
                </p>
              </div>
            </section>

            <section className="detail-info-card detail-info-card-text">
              <div className="detail-info-icon document">文</div>
              <div>
                <h2>大会説明</h2>
                <p>
                  {tournament.description ||
                    "大会説明は現在準備中です。詳細が決まり次第、こちらに掲載します。"}
                </p>
              </div>
            </section>
          </main>

          <div className="tournament-detail-bottom-space" />

          <div className="tournament-detail-bottom-cta">
            {alreadyApplied ? (
              <p className="tournament-detail-applied-message">
                この大会は申し込み済みです
              </p>
            ) : canApply ? (
              <button type="button" onClick={handleApplyClick}>
                大会に申し込む
                <span>›</span>
              </button>
            ) : (
              <button type="button" disabled>
                申し込み不可
                <span>›</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
