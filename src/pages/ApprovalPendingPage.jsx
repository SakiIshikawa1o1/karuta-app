import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

function getStatusMessage({ isEmailConfirmed, approvalStatus }) {
  if (!isEmailConfirmed) {
    return {
      title: "メール認証が完了していません",
      body: "確認メールをご確認ください。認証後、所属会代表者の承認待ちになります。",
    };
  }

  if (approvalStatus === "rejected") {
    return {
      title: "申請が却下されました",
      body: "内容を確認し、必要に応じてお問い合わせください。",
    };
  }

  return {
    title: "所属会代表者の承認待ちです",
    body: "メール認証は完了しています。代表者の承認後、会員として利用できます。",
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
    await supabase.auth.signOut();
    setLoggingOut(false);
    navigate("/", { replace: true });
  };

  if (loading) {
    return <div className="loading-screen">読み込み中...</div>;
  }

  if (!user) {
    return (
      <div className="mypage-modern">
        <section className="mypage-modern-profile-card">
          <div className="mypage-modern-profile-main">
            <div className="mypage-modern-name-block">
              <span>承認状況</span>
              <h2>ログインが必要です</h2>
              <p>登録時のメールアドレスでログインしてください。</p>
            </div>
          </div>
        </section>

        <section className="mypage-modern-menu-card">
          <button type="button" onClick={() => navigate("/login")}>
            <span>ログインへ</span>
          </button>
        </section>
      </div>
    );
  }

  if (isApproved) {
    return (
      <div className="mypage-modern">
        <section className="mypage-modern-profile-card">
          <div className="mypage-modern-profile-main">
            <div className="mypage-modern-name-block">
              <span>承認済み</span>
              <h2>登録は完了しています</h2>
              <p>通常機能をご利用いただけます。</p>
            </div>
          </div>
        </section>

        <section className="mypage-modern-menu-card">
          <button type="button" onClick={() => navigate("/mypage")}>
            <span>マイページへ</span>
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="mypage-modern">
      <section className="mypage-modern-profile-card">
        <div className="mypage-modern-profile-main">
          <div className="mypage-modern-name-block">
            <span>承認状況</span>
            <h2>{statusMessage.title}</h2>
            <p>{statusMessage.body}</p>
            {approvalStatus === "rejected" && profile?.rejection_reason && (
              <p>理由：{profile.rejection_reason}</p>
            )}
          </div>
        </div>
      </section>

      <section className="mypage-modern-menu-card">
        <button type="button" onClick={refreshMe}>
          <span>承認状況を再確認</span>
        </button>

        <button type="button" onClick={() => navigate("/contact")}>
          <span>問い合わせる</span>
        </button>

        <button type="button" onClick={handleLogout} disabled={loggingOut}>
          <span>{loggingOut ? "ログアウト中..." : "ログアウト"}</span>
        </button>
      </section>
    </div>
  );
}
