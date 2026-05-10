import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Status({ session }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from("applications")
      .select(`
        id,
        status,
        applied_at,
        tournament_id,
        tournaments (
          id,
          title,
          event_date,
          venue
        )
      `)
      .eq("user_id", session.user.id)
      .order("applied_at", { ascending: false });

    if (error) {
      console.error("status fetch error:", error);
    } else {
      setApplications(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const getApplicationStatusLabel = (status) =>
    ({
      applied: "申込済み",
      lottery: "抽選中",
      selected: "当選",
      rejected: "落選",
      payment_pending: "当選・未入金",
      payment_confirming: "入金確認中",
      payment_confirmed: "入金確認済み",
      confirmed: "参加確定",
      cancelled: "キャンセル済み",
    }[status] || status || "-");

  const handleCancel = async (applicationId, applicationStatus) => {
    if (applicationStatus !== "applied") {
      alert("申込済みのものだけキャンセルできます。");
      return;
    }

    const { error } = await supabase
      .from("applications")
      .update({
        status: "cancelled",
      })
      .eq("id", applicationId);

    if (error) {
      alert(`キャンセル失敗: ${error.message}`);
      return;
    }

    fetchApplications();
  };

  const handleReportPayment = async (applicationId, applicationStatus, paymentStatus) => {
    if (!["selected", "payment_pending"].includes(applicationStatus || paymentStatus)) {
      alert("未入金のものだけ入金確認依頼できます。");
      return;
    }

    const { error } = await supabase
      .from("applications")
      .update({
        status: "payment_confirming",
      })
      .eq("id", applicationId);

    if (error) {
      alert(`入金連絡失敗: ${error.message}`);
      return;
    }

    fetchApplications();
  };

  if (loading) {
    return <div style={{ padding: "24px" }}>読み込み中...</div>;
  }

  return (
    <div style={{ padding: "24px" }}>
      <h1>申込状況確認</h1>

      {applications.length === 0 ? (
        <p>申込履歴はありません。</p>
      ) : (
        <ul>
          {applications.map((app) => (
            <li key={app.id} style={{ marginBottom: "20px" }}>
              <div>大会名: {app.tournaments?.title}</div>
              <div>開催日: {app.tournaments?.event_date}</div>
              <div>会場: {app.tournaments?.venue}</div>
              <div>申込状態: {getApplicationStatusLabel(app.status)}</div>
              <div>申込日時: {app.applied_at}</div>

              <div style={{ marginTop: "8px" }}>
                <Link to={`/tournaments/${app.tournament_id}`}>
                  <button>大会詳細を見る</button>
                </Link>

                <button
                  style={{ marginLeft: "8px" }}
                  onClick={() =>
                    handleReportPayment(
                      app.id,
                      app.status,
                      app.status
                    )
                  }
                  disabled={
                    !["selected", "payment_pending"].includes(app.status)
                  }
                >
                  入金連絡
                </button>

                <button
                  style={{ marginLeft: "8px" }}
                  onClick={() =>
                    handleCancel(app.id, app.status)
                  }
                  disabled={app.status !== "applied"}
                >
                  キャンセル
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link to="/">
        <button>ホームへ戻る</button>
      </Link>
    </div>
  );
}

export default Status;
