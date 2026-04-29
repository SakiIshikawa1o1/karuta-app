import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function Status({ session }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from("applications")
      .select(`
        id,
        application_status,
        payment_status,
        applied_at,
        cancelled_at,
        payment_reported_at,
        payment_confirmed_at,
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

  const getApplicationStatusLabel = (status) => {
    if (status === "applied") return "申込済み";
    if (status === "cancelled") return "キャンセル済み";
    return status || "-";
  };

  const getPaymentStatusLabel = (status) => {
    if (status === "not_reported") return "未入金連絡";
    if (status === "reported") return "入金連絡済み";
    if (status === "confirmed") return "入金確認済み";
    return status || "-";
  };

  const handleCancel = async (applicationId, applicationStatus) => {
    if (applicationStatus !== "applied") {
      alert("申込済みのものだけキャンセルできます。");
      return;
    }

    const { error } = await supabase
      .from("applications")
      .update({
        application_status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (error) {
      alert(`キャンセル失敗: ${error.message}`);
      return;
    }

    fetchApplications();
  };

  const handleReportPayment = async (applicationId, applicationStatus, paymentStatus) => {
    if (applicationStatus !== "applied") {
      alert("申込済みのものだけ入金連絡できます。");
      return;
    }

    if (paymentStatus !== "not_reported") {
      alert("すでに入金連絡済みです。");
      return;
    }

    const { error } = await supabase
      .from("applications")
      .update({
        payment_status: "reported",
        payment_reported_at: new Date().toISOString(),
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
              <div>申込状態: {getApplicationStatusLabel(app.application_status)}</div>
              <div>入金状態: {getPaymentStatusLabel(app.payment_status)}</div>
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
                      app.application_status,
                      app.payment_status
                    )
                  }
                  disabled={
                    app.application_status !== "applied" ||
                    app.payment_status !== "not_reported"
                  }
                >
                  入金連絡
                </button>

                <button
                  style={{ marginLeft: "8px" }}
                  onClick={() =>
                    handleCancel(app.id, app.application_status)
                  }
                  disabled={app.application_status !== "applied"}
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