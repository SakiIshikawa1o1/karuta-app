// src/pages/TournamentDetailPage.jsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const STATUS_LABEL = {
  draft: "下書き",
  preparing: "準備中",
  published: "受付中",
  closed: "受付終了",
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

function normalizeClassCode(code) {
  if (!code) return "";

  return String(code)
    .trim()
    .replace("級", "")
    .toLowerCase();
}

function getAllowedClassColumn(classCode) {
  const normalizedCode = normalizeClassCode(classCode);

  if (!normalizedCode) return "";

  return `allow_class_${normalizedCode}`;
}

function isTournamentAllowedForClass(tournament, classCode) {
  const columnName = getAllowedClassColumn(classCode);

  if (!columnName) return false;

  return tournament[columnName] === true;
}

function getAllowedClassLabels(tournament, classLevels) {
  return classLevels
    .filter((classLevel) =>
      isTournamentAllowedForClass(tournament, classLevel.code)
    )
    .map((classLevel) => classLevel.name || `${classLevel.code}級`)
    .join("・");
}

/**
 * DB上の status ではなく、画面上で扱う実質ステータスを返す
 *
 * draft      → 下書き
 * preparing  → 準備中
 * published  → 締切前なら受付中、締切後なら受付終了
 * closed     → 受付終了
 */
function getEffectiveStatus(tournament) {
  if (!tournament) return "";

  if (tournament.status === "draft") {
    return "draft";
  }

  if (tournament.status === "preparing") {
    return "preparing";
  }

  if (tournament.status === "closed") {
    return "closed";
  }

  if (tournament.status === "published" && tournament.application_deadline) {
    const now = new Date();
    const deadline = new Date(tournament.application_deadline);

    if (!Number.isNaN(deadline.getTime()) && now > deadline) {
      return "closed";
    }
  }

  return tournament.status;
}

function getStatusLabel(tournament) {
  const effectiveStatus = getEffectiveStatus(tournament);
  const statusLabel = STATUS_LABEL[effectiveStatus] || effectiveStatus;

  if (effectiveStatus === "published" && tournament.application_deadline) {
    const shortDeadline = formatDeadlineShort(tournament.application_deadline);
    return shortDeadline ? `${statusLabel}（${shortDeadline}まで）` : statusLabel;
  }

  return statusLabel;
}

function getStatusClass(tournament) {
  const effectiveStatus = getEffectiveStatus(tournament);

  if (effectiveStatus === "preparing") return "is-preparing";
  if (effectiveStatus === "closed") return "is-closed";
  if (effectiveStatus === "draft") return "is-draft";

  return "";
}

function getDisabledApplyLabel(tournament) {
  const effectiveStatus = getEffectiveStatus(tournament);

  if (effectiveStatus === "preparing") {
    return "現在は準備中です";
  }

  if (effectiveStatus === "closed") {
    return "受付終了";
  }

  if (effectiveStatus === "draft") {
    return "現在は下書きです";
  }

  return "申し込み不可";
}

export default function TournamentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [classLevels, setClassLevels] = useState([]);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchTournament = async () => {
    if (authLoading) return;

    setLoading(true);
    setMessage("");

    const [tournamentResult, classLevelsResult] = await Promise.all([
      supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .maybeSingle(),

      supabase
        .from("class_levels")
        .select("id, code, name, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (tournamentResult.error) {
      setLoading(false);
      setMessage(`大会詳細の取得に失敗しました：${tournamentResult.error.message}`);
      return;
    }

    if (classLevelsResult.error) {
      setLoading(false);
      setMessage(`級マスタの取得に失敗しました：${classLevelsResult.error.message}`);
      return;
    }

    if (!tournamentResult.data) {
      setLoading(false);
      setMessage("大会が見つかりません。");
      return;
    }

    setTournament(tournamentResult.data);
    setClassLevels(classLevelsResult.data ?? []);

    if (user) {
      const { data: appData, error: appError } = await supabase
        .from("applications")
        .select("id, status")
        .eq("tournament_id", id)
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .maybeSingle();

      if (appError) {
        console.error("申込状況取得エラー:", appError.message);
      }

      setAlreadyApplied(!!appData);
    } else {
      setAlreadyApplied(false);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchTournament();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user, authLoading]);

  const effectiveStatus = useMemo(() => {
    if (!tournament) return "";
    return getEffectiveStatus(tournament);
  }, [tournament]);

  const displayStatusLabel = useMemo(() => {
    if (!tournament) return "";
    return getStatusLabel(tournament);
  }, [tournament]);

  const statusClass = useMemo(() => {
    if (!tournament) return "";
    return getStatusClass(tournament);
  }, [tournament]);

  const allowedClassLabels = useMemo(() => {
    if (!tournament) return "";
    return getAllowedClassLabels(tournament, classLevels);
  }, [tournament, classLevels]);

  const canApply = useMemo(() => {
    if (!tournament) return false;
    return effectiveStatus === "published" && !alreadyApplied;
  }, [tournament, effectiveStatus, alreadyApplied]);

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
      <button
        type="button"
        className="tournament-detail-back-button"
        onClick={() => navigate("/tournaments")}
      >
        ‹ 大会一覧に戻る
      </button>

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
              <div className="detail-info-icon people">級</div>
              <div>
                <h2>参加可能な級</h2>
                <p className="detail-large-text">
                  {allowedClassLabels || "参加可能な級は未設定です。"}
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
              <div className="detail-info-icon document">備</div>
              <div>
                <h2>大会備考</h2>
                <p>
                  {tournament.notes ||
                    "大会備考は現在準備中です。詳細が決まり次第、こちらに掲載します。"}
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
                {getDisabledApplyLabel(tournament)}
                <span>›</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}