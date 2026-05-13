// src/pages/ApplicationConfirmPage.jsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function ApplicationConfirmPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [applicationForm, setApplicationForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedDraft = sessionStorage.getItem(`applicationDraft:${id}`);

    if (!savedDraft) {
      setMessage("申し込み情報がありません。申込画面からやり直してください。");
      return;
    }

    const draft = JSON.parse(savedDraft);
    setTournament(draft.tournament);
    setApplicationForm(draft.applicationForm);
  }, [id]);

  const handleSubmit = async () => {
    if (!user || !applicationForm) return;

    setSaving(true);
    setMessage("");

    const { data: existingApplication, error: checkError } = await supabase
      .from("applications")
      .select("id")
      .eq("tournament_id", id)
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .maybeSingle();

    if (checkError) {
      setSaving(false);
      setMessage(`申込状況の確認に失敗しました：${checkError.message}`);
      return;
    }

    if (existingApplication) {
      setSaving(false);
      sessionStorage.removeItem(`applicationDraft:${id}`);
      setMessage("この大会にはすでに申し込み済みです。");
      return;
    }

    const applicationPayload = {
      tournament_id: id,
      user_id: user.id,
      applicant_name: applicationForm.applicant_name,
      organization: applicationForm.organization,
      notes: applicationForm.notes,
      status: "applied",
      applied_at: new Date().toISOString(),
      updated_by: user.id,
      class_level_id: applicationForm.class_level_id,
      dan_rank_id: applicationForm.dan_rank_id,
      tournament_title: tournament?.title || applicationForm.tournament_title,
      user_email: applicationForm.user_email || user.email,
      school_name: applicationForm.school_name || "",
    };

    const { data: cancelledApplication, error: cancelledCheckError } =
      await supabase
        .from("applications")
        .select("id")
        .eq("tournament_id", id)
        .eq("user_id", user.id)
        .eq("status", "cancelled")
        .order("applied_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (cancelledCheckError) {
      setSaving(false);
      setMessage(`キャンセル済み申込の確認に失敗しました：${cancelledCheckError.message}`);
      return;
    }

    const { error } = cancelledApplication
      ? await supabase
          .from("applications")
          .update(applicationPayload)
          .eq("id", cancelledApplication.id)
          .eq("user_id", user.id)
      : await supabase.from("applications").insert(applicationPayload);

    setSaving(false);

    if (error) {
      setMessage(`申し込みに失敗しました：${error.message}`);
      return;
    }

    sessionStorage.removeItem(`applicationDraft:${id}`);
    navigate("/applications/status", { replace: true });
  };

  if (!applicationForm) {
    return (
      <div className="screen page-shell">
        <div className="empty-card">
          {message || "申込画面からやり直してください。"}
          <button
            className="primary-button"
            onClick={() => navigate(`/tournaments/${id}/apply`)}
          >
            申込画面へ戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen page-shell">
      <button className="back-link" onClick={() => navigate(`/tournaments/${id}/apply`)}>
        ← 入力画面へ戻る
      </button>

      <div className="confirm-layout">
        <section className="confirm-card">
          <div className="page-title-block compact">
            <p>CONFIRM</p>
            <h1>申し込み確認</h1>
            <span>内容に間違いがなければ申し込みを確定してください。</span>
          </div>

          {message && <p className="error-text">{message}</p>}

          <div className="confirm-section">
            <h2>申込中の大会</h2>
            <p>{tournament?.title}</p>
            <span>{tournament?.event_date}</span>
            <span>{tournament?.venue}</span>
          </div>

          <div className="confirm-section">
            <h2>申し込み情報</h2>
            <p>氏名：{applicationForm.applicant_name}</p>
            <p>所属会：{applicationForm.organization || "未入力"}</p>
            <p>級：{applicationForm.class_level_name || "未入力"}</p>
            <p>段位：{applicationForm.dan_rank_name || "未入力"}</p>
            <p>学校名：{applicationForm.school_name || "未入力"}</p>
            <p>備考：{applicationForm.notes || "なし"}</p>
          </div>

          <div className="button-row">
            <button
              className="secondary-button"
              onClick={() => navigate(`/tournaments/${id}/apply`)}
            >
              修正する
            </button>
            <button className="primary-button" onClick={handleSubmit} disabled={saving}>
              {saving ? "申し込み中..." : "申し込みを確定する"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
