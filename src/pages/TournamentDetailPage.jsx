// src/pages/TournamentDetailPage.jsx

import { useEffect, useState } from "react";
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

export default function TournamentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState("");
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

  if (loading || authLoading) {
    return (
      <div className="screen page-shell">
        <div className="empty-card">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="screen page-shell">
      <button className="back-link" onClick={() => navigate("/tournaments")}>
        ← 大会一覧へ戻る
      </button>

      {message && <p className="error-text">{message}</p>}

      {tournament && (
        <div className="detail-layout">
          <section className="detail-main-card">
            <span className="status-pill">
              {STATUS_LABEL[tournament.status] || tournament.status}
            </span>

            <h1>{tournament.title}</h1>

            <div className="detail-meta-grid">
              <p>
                <strong>開催日</strong>
                {tournament.event_date}
              </p>
              <p>
                <strong>会場</strong>
                {tournament.venue}
              </p>
              <p>
                <strong>住所</strong>
                {tournament.address || "未設定"}
              </p>
              <p>
                <strong>定員</strong>
                {tournament.capacity ? `${tournament.capacity}名` : "未設定"}
              </p>
              <p>
                <strong>参加費</strong>
                {tournament.entry_fee !== null
                  ? `${tournament.entry_fee}円`
                  : "未設定"}
              </p>
              <p>
                <strong>申込締切</strong>
                {tournament.application_deadline
                  ? new Date(tournament.application_deadline).toLocaleString()
                  : "未設定"}
              </p>
            </div>

            {tournament.description && (
              <div className="description-box">
                <h2>大会説明</h2>
                <p>{tournament.description}</p>
              </div>
            )}
          </section>

          <aside className="detail-side-card">
            <h2>申込</h2>

            {alreadyApplied ? (
              <>
                <p>この大会にはすでに申し込み済みです。</p>
                <p>
                  現在のステータス：
                  {APPLICATION_STATUS_LABEL[applicationStatus] ||
                    applicationStatus}
                </p>
                <button
                  className="secondary-button"
                  onClick={() => navigate("/applications/status")}
                >
                  申込状況を見る
                </button>
              </>
            ) : canApply ? (
              <>
                <p>この大会への申し込みができます。</p>
                <button
                  className="primary-button"
                  onClick={() => navigate(`/tournaments/${id}/apply`)}
                >
                  この大会に申し込む
                </button>
              </>
            ) : (
              <>
                <p>現在、この大会には申し込みできません。</p>
                <button className="secondary-button" disabled>
                  申し込み不可
                </button>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}