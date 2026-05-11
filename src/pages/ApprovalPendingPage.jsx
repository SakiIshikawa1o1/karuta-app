import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

function getStatusMessage({ isEmailConfirmed, approvalStatus }) {
  if (!isEmailConfirmed) {
    return {
      badge: "メール確認待ち",
      title: "確認メールをご確認ください",
      body: "メール認証が完了すると、所属会代表者による承認待ちに進みます。",
      step: 1,
    };
  }

  if (approvalStatus === "rejected") {
    return {
      badge: "申請却下",
      title: "申請が却下されました",
      body: "内容を確認し、必要に応じてお問い合わせください。",
      step: 3,
    };
  }

  return {
    badge: "承認待ち",
    title: "所属会代表者の承認待ちです",
    body: "メール認証は完了しています。代表者が承認すると、会員として利用できます。",
    step: 2,
  };
}

export default function ApprovalPendingPage() {
  const navigate = useNavigate();
  const {
    user,
    profile,
    loading,
    approvalStatus,
    isApproved,
    isEmailConfirmed,
    refreshMe,
  } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const statusMessage = useMemo(
    () => getStatusMessage({ isEmailConfirmed, approvalStatus }),
    [isEmailConfirmed, approvalStatus]
  );

  const handleLogout = async () => {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    setLoggingOut(false);

    if (error) {
      console.warn("ログアウトエラー:", error.message);
    }

    navigate("/", { replace: true });
  };

  if (loading) {
    return <div className="loading-screen">読み込み中...</div>;
  }

  if (!user) {
    return (
      <div className="approval-page">
        <section className="approval-card">
          <span className="approval-badge">ログインが必要です</span>
          <h1>承認状況を確認できません</h1>
          <p>登録時のメールアドレスでログインしてください。</p>
          <div className="approval-actions">
            <button type="button" onClick={() => navigate("/login")}>
              ログインへ
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (isApproved) {
    return (
      <div className="approval-page">
        <section className="approval-card">
          <span className="approval-badge approved">承認済み</span>
          <h1>登録は完了しています</h1>
          <p>通常機能をご利用いただけます。</p>
          <div className="approval-actions">
            <button type="button" onClick={() => navigate("/mypage")}>
              マイページへ
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="approval-page">
      <section className="approval-card">
        <span
          className={`approval-badge ${
            approvalStatus === "rejected" ? "rejected" : ""
          }`}
        >
          {statusMessage.badge}
        </span>
        <h1>{statusMessage.title}</h1>
        <p>{statusMessage.body}</p>

        {approvalStatus === "rejected" && profile?.rejection_reason && (
          <div className="approval-reason">
            <strong>却下理由</strong>
            <p>{profile.rejection_reason}</p>
          </div>
        )}

        <div className="approval-steps" aria-label="登録完了までの流れ">
          {["メール認証", "代表者承認", "利用開始"].map((label, index) => (
            <div
              className={`approval-step ${
                statusMessage.step > index ? "active" : ""
              }`}
              key={label}
            >
              <span>{index + 1}</span>
              <strong>{label}</strong>
            </div>
          ))}
        </div>

        <div className="approval-actions">
          <button type="button" onClick={refreshMe}>
            承認状況を再確認
          </button>

          <button type="button" className="secondary" onClick={() => navigate("/contact")}>
            問い合わせる
          </button>

          <button
            type="button"
            className="ghost"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "ログアウト中..." : "ログアウト"}
          </button>
        </div>
      </section>
    </div>
  );
}
