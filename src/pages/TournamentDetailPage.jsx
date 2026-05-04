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

const APPLICATION_STATUS_LABEL = {
  applied: "申込済み",
  lottery_wait: "抽選待ち",
  selected: "当選",
  not_selected: "落選",
  confirmed: "参加確定",
};

const TAB_LABELS = {
  overview: "概要",
  guideline: "要項",
  access: "アクセス",
};

function formatDate(value) {
  if (!value) return "未設定";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const day = weekdays[date.getDay()];

  return `${yyyy}/${mm}/${dd} (${day})`;
}

function formatDeadline(value) {
  if (!value) return "未設定";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const day = weekdays[date.getDay()];
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${yyyy}/${mm}/${dd} (${day}) ${hh}:${min}まで`;
}

function formatYen(value) {
  if (value === null || value === undefined || value === "") return "未設定";
  return `${Number(value).toLocaleString()}円`;
}

export default function TournamentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

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

      if (appData) {
        setAlreadyApplied(true);
        setApplicationStatus(appData.status);
      } else {
        setAlreadyApplied(false);
        setApplicationStatus("");
      }
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

    if (alreadyApplied) {
      navigate("/applications/status");
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
        className="tournament-detail-back"
        onClick={() => navigate("/tournaments")}
        aria-label="大会一覧へ戻る"
      >
        ‹
      </button>

      {message && <p className="error-text">{message}</p>}

      {tournament && (
        <>
          <section className="tournament-detail-hero" />

          <section className="tournament-detail-summary-card">
            <div className="tournament-detail-status-top">
              <span className={`detail-status-pill ${statusClass}`}>
                {statusLabel}
              </span>
            </div>

            <h1>{tournament.title}</h1>

            <div className="tournament-detail-summary-meta">
              <div className="detail-summary-meta-row">
                <div className="detail-summary-icon detail-summary-icon-date">▦</div>
                <span>開催日</span>
                <strong>{formatDate(tournament.event_date)}</strong>
              </div>

              <div className="detail-summary-meta-row">
                <div className="detail-summary-icon detail-summary-icon-venue">●</div>
                <span>会場</span>
                <strong>{tournament.venue || "未設定"}</strong>
              </div>
            </div>
          </section>

          <nav className="tournament-detail-tabs" aria-label="大会詳細タブ">
            {Object.entries(TAB_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={activeTab === key ? "active" : ""}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </nav>

          <main className="tournament-detail-content">
            {activeTab === "overview" && (
              <>
                <section className="detail-info-card">
                  <div className="detail-info-icon people">👥</div>
                  <div>
                    <h2>参加資格</h2>
                    <p>
                      {tournament.eligibility ||
                        "日本国内の大学に所属する学生で構成されたチーム。"}
                    </p>
                    <p>
                      {tournament.team_rule ||
                        "1大学あたり複数チームの参加が可能です。"}
                    </p>
                  </div>
                </section>

                <section className="detail-info-card">
                  <div className="detail-info-icon calendar">▦</div>
                  <div>
                    <h2>申込締切</h2>
                    <p className="detail-large-text">
                      {formatDeadline(tournament.application_deadline)}
                    </p>
                    <p className="detail-note">
                      ※ 締切後の申込は受け付けません。
                    </p>
                  </div>
                </section>

                <section className="detail-info-card">
                  <div className="detail-info-icon yen">￥</div>
                  <div>
                    <h2>参加費</h2>
                    <p className="detail-large-text">
                      {formatYen(tournament.entry_fee)}
                      {tournament.fee_note ? (
                        <span className="detail-fee-note">
                          {tournament.fee_note}
                        </span>
                      ) : (
                        <span className="detail-fee-note">（1チーム）</span>
                      )}
                    </p>
                    <p className="detail-note">
                      ※ 大会当日に現地でお支払いください。
                    </p>
                  </div>
                </section>
              </>
            )}

            {activeTab === "guideline" && (
              <>
                <section className="detail-info-card">
                  <div className="detail-info-icon document">📄</div>
                  <div>
                    <h2>大会要項</h2>
                    <p>
                      {tournament.description ||
                        "大会要項は現在準備中です。詳細が決まり次第、こちらに掲載します。"}
                    </p>
                  </div>
                </section>

                <section className="detail-info-card">
                  <div className="detail-info-icon people">👥</div>
                  <div>
                    <h2>定員</h2>
                    <p className="detail-large-text">
                      {tournament.capacity ? `${tournament.capacity}名` : "未設定"}
                    </p>
                  </div>
                </section>
              </>
            )}

            {activeTab === "access" && (
              <>
                <section className="detail-info-card">
                  <div className="detail-info-icon pin">●</div>
                  <div>
                    <h2>会場</h2>
                    <p className="detail-large-text">
                      {tournament.venue || "未設定"}
                    </p>
                  </div>
                </section>

                <section className="detail-info-card">
                  <div className="detail-info-icon map">⌖</div>
                  <div>
                    <h2>住所</h2>
                    <p>{tournament.address || "未設定"}</p>
                  </div>
                </section>
              </>
            )}
          </main>

          <div className="tournament-detail-bottom-space" />

          <div className="tournament-detail-bottom-cta">
            {alreadyApplied ? (
              <button type="button" onClick={handleApplyClick}>
                申込状況を見る
                <span>›</span>
              </button>
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