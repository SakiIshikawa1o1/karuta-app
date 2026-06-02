import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import SiteFooter from "../components/SiteFooter";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function getEmailChangeErrorMessage(error) {
  const message = String(error?.message || "");
  const normalized = message.toLowerCase();

  if (
    normalized.includes("already") ||
    normalized.includes("registered") ||
    normalized.includes("exists")
  ) {
    return "このメールアドレスはすでに使用されています。別のメールアドレスを入力してください。";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "短時間に何度も送信されています。時間をおいてから再度お試しください。";
  }

  if (normalized.includes("redirect")) {
    return "メール確認用URLの設定に問題があります。管理者にお問い合わせください。";
  }

  return `メールアドレス変更に失敗しました：${message || "原因不明のエラー"}`;
}

export default function EmailChangePage() {
  const navigate = useNavigate();
  const { user, profile, refreshMe } = useAuth();

  const currentEmail = profile?.email || user?.email || "";

  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setEmail(currentEmail);
    setEmailConfirm(currentEmail);
  }, [currentEmail]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user) return;

    const normalizedEmail = email.trim();
    const normalizedEmailConfirm = emailConfirm.trim();
    const normalizedCurrentEmail = (user.email || "").trim();

    setMessage("");
    setErrorMessage("");

    if (!normalizedEmail || !normalizedEmailConfirm) {
      setErrorMessage("新しいメールアドレスを入力してください。");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage("メールアドレスの形式が正しくありません。");
      return;
    }

    if (normalizedEmail !== normalizedEmailConfirm) {
      setErrorMessage("確認用メールアドレスが一致していません。");
      return;
    }

    if (normalizedEmail === normalizedCurrentEmail) {
      setErrorMessage("現在と同じメールアドレスです。");
      return;
    }

    setSaving(true);

    const { error: authError } = await supabase.auth.updateUser(
      { email: normalizedEmail },
      { emailRedirectTo: `${window.location.origin}/auth/callback` }
    );

    setSaving(false);

    if (authError) {
      setErrorMessage(getEmailChangeErrorMessage(authError));
      return;
    }

    await refreshMe();
    setMessage("確認メールを送信しました。メール内のリンクを開くと変更が完了します。");
  };

  return (
    <div className="email-change-page">
      <section className="email-change-card">
        <button
          type="button"
          className="email-change-back-button"
          onClick={() => navigate("/mypage")}
        >
          ‹ マイページに戻る
        </button>

        <div className="email-change-heading">
          <p>ACCOUNT</p>
          <h1>メールアドレスの変更</h1>
        </div>

        {errorMessage && <p className="error-text">{errorMessage}</p>}
        {message && <p className="success-text">{message}</p>}

        <form className="email-change-form" onSubmit={handleSubmit}>
          <label>
            現在のメールアドレス
            <input value={currentEmail} disabled />
          </label>

          <label>
            新しいメールアドレス
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>

          <label>
            新しいメールアドレス（確認）
            <input
              type="email"
              value={emailConfirm}
              onChange={(event) => setEmailConfirm(event.target.value)}
              autoComplete="email"
            />
          </label>

          <button type="submit" disabled={saving}>
            {saving ? "送信中..." : "確認メールを送信する"}
          </button>
        </form>
      </section>

      <SiteFooter />
    </div>
  );
}
