// src/pages/ApplicationAdminPage.jsx

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const STATUS_LABEL = {
  applied: "申込済み",
  lottery_wait: "抽選待ち",
  selected: "当選",
  not_selected: "落選",
  confirmed: "参加確定",
  cancelled: "キャンセル済み",
};

export default function ApplicationAdminPage() {
  const { user } = useAuth();

  const [applications, setApplications] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchTournaments = async () => {
    const { data, error } = await supabase
      .from("tournaments")
      .select("id, title, event_date")
      .order("event_date", { ascending: false });

    if (error) {
      setMessage(`大会一覧の取得に失敗しました：${error.message}`);
      return;
    }

    setTournaments(data ?? []);
  };

  const fetchApplications = async () => {
    setLoading(true);
    setMessage("");

    let query = supabase
      .from("applications")
      .select(`
        id,
        applicant_name,
        organization,
        grade,
        division,
        notes,
        status,
        applied_at,
        cancelled_at,
        tournaments (
          id,
          title,
          event_date,
          venue
        )
      `)
      .order("applied_at", { ascending: false });

    if (selectedTournamentId) {
      query = query.eq("tournament_id", selectedTournamentId);
    }

    if (keyword) {
      query = query.or(
        `applicant_name.ilike.%${keyword}%,organization.ilike.%${keyword}%`
      );
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      setMessage(`申込一覧の取得に失敗しました：${error.message}`);
      return;
    }

    setApplications(data ?? []);
  };

  useEffect(() => {
    fetchTournaments();
    fetchApplications();
  }, []);

  const handleStatusChange = async (application, newStatus) => {
    setMessage("");

    const oldStatus = application.status;

    const { error } = await supabase
      .from("applications")
      .update({
        status: newStatus,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
        cancelled_at:
          newStatus === "cancelled"
            ? new Date().toISOString()
            : application.cancelled_at,
      })
      .eq("id", application.id);

    if (error) {
      setMessage(`ステータス更新に失敗しました：${error.message}`);
      return;
    }

    await supabase.from("application_status_logs").insert({
      application_id: application.id,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: user?.id,
      comment: "申し込み管理者によるステータス変更",
    });

    setApplications((prev) =>
      prev.map((app) =>
        app.id === application.id
          ? {
              ...app,
              status: newStatus,
              cancelled_at:
                newStatus === "cancelled"
                  ? new Date().toISOString()
                  : app.cancelled_at,
            }
          : app
      )
    );

    setMessage("ステータスを更新しました。");
  };

  return (
    <div className="screen">
      <h1>申し込み管理者ページ</h1>

      {message && <p className="info-text">{message}</p>}

      <div className="form-card">
        <label>
          大会で絞り込み
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
          >
            <option value="">すべての大会</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}（{t.event_date}）
              </option>
            ))}
          </select>
        </label>

        <label>
          氏名・所属で検索
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="氏名・所属で検索"
          />
        </label>

        <button onClick={fetchApplications}>検索する</button>
      </div>

      {loading ? (
        <p>読み込み中...</p>
      ) : applications.length === 0 ? (
        <div className="card">
          <p>申込者がいません。</p>
        </div>
      ) : (
        <div className="stack">
          {applications.map((app) => (
            <div className="card" key={app.id}>
              <span className="badge">
                {STATUS_LABEL[app.status] || app.status}
              </span>

              <h2>{app.applicant_name}</h2>
              <p>大会：{app.tournaments?.title}</p>
              <p>開催日：{app.tournaments?.event_date}</p>
              <p>所属：{app.organization || "未入力"}</p>
              <p>段位：{app.grade}</p>
              <p>参加区分：{app.division}</p>
              <p>備考：{app.notes || "なし"}</p>

              {app.cancelled_at && (
                <p>
                  キャンセル日時：
                  {new Date(app.cancelled_at).toLocaleString()}
                </p>
              )}

              <label>
                ステータス
                <select
                  value={app.status}
                  onChange={(e) => handleStatusChange(app, e.target.value)}
                >
                  <option value="applied">申込済み</option>
                  <option value="lottery_wait">抽選待ち</option>
                  <option value="selected">当選</option>
                  <option value="not_selected">落選</option>
                  <option value="confirmed">参加確定</option>
                  <option value="cancelled">キャンセル済み</option>
                </select>
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}