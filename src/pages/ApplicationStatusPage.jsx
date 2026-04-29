// src/pages/ApplicationStatusPage.jsx

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const STATUS_LABEL = {
  applied: "申込済み",
  lottery_wait: "抽選待ち",
  selected: "当選",
  not_selected: "落選",
  confirmed: "参加確定",
};

export default function ApplicationStatusPage() {
  const { user, loading: authLoading } = useAuth();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchApplications = async () => {
    if (!user) {
      setApplications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("applications")
      .select(`
        id,
        status,
        applied_at,
        applicant_name,
        organization,
        grade,
        division,
        tournaments (
          id,
          title,
          event_date,
          venue
        )
      `)
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .order("applied_at", { ascending: false });

    setLoading(false);

    if (error) {
      setMessage(`申し込み状況の取得に失敗しました：${error.message}`);
      return;
    }

    setApplications(data ?? []);
  };

  useEffect(() => {
    if (authLoading) return;
    fetchApplications();
  }, [authLoading, user]);

  const handleCancel = async (application) => {
    const ok = window.confirm(
      `「${application.tournaments?.title}」の申し込みをキャンセルしますか？`
    );

    if (!ok) return;

    const { error } = await supabase
      .from("applications")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", application.id)
      .eq("user_id", user.id);

    if (error) {
      setMessage(`キャンセルに失敗しました：${error.message}`);
      return;
    }

    setApplications((prev) => prev.filter((item) => item.id !== application.id));
    setMessage("申し込みをキャンセルしました。");
  };

  return (
    <div className="screen page-shell">
      <div className="page-title-block">
        <p>APPLICATIONS</p>
        <h1>申込履歴</h1>
        <span>現在申し込んでいる大会を確認できます。</span>
      </div>

      {message && <p className="info-text">{message}</p>}

      {loading || authLoading ? (
        <div className="empty-card">読み込み中...</div>
      ) : applications.length === 0 ? (
        <div className="empty-card">現在、申し込み中の大会はありません。</div>
      ) : (
        <div className="application-card-list">
          {applications.map((app) => (
            <article className="application-card" key={app.id}>
              <div>
                <span className="status-pill">
                  {STATUS_LABEL[app.status] || app.status}
                </span>
                <h2>{app.tournaments?.title}</h2>
                <p>開催日：{app.tournaments?.event_date}</p>
                <p>会場：{app.tournaments?.venue}</p>
                <p>申込者：{app.applicant_name}</p>
                <p>段位：{app.grade}</p>
                <p>参加区分：{app.division}</p>
              </div>

              {["applied", "lottery_wait", "selected"].includes(app.status) && (
                <button
                  className="danger-outline-button"
                  onClick={() => handleCancel(app)}
                >
                  キャンセルする
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}