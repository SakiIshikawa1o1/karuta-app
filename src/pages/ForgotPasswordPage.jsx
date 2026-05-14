import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppIcon from "../components/AppIcon";
import { supabase } from "../lib/supabase";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim();

    setMessage("");
    setErrorMessage("");

    if (!normalizedEmail) {
      setErrorMessage("メールアドレスを入力してください。");
      return;
    }

    setSending(true);

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setSending(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage(
      "パスワード再設定用のメールを送信しました。メール内のリンクから新しいパスワードを設定してください。"
    );
  };

  return (
    <div className="login-page">
      <div className="login-page-shell">
        <div className="login-page-inner">
          <header className="login-brand">
            <div className="login-brand-logo">
              <img src="/images/logo.png" alt="まにまに" />
            </div>

            <h1>パスワード再設定</h1>
            <p>登録済みのメールアドレスを入力してください</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            {errorMessage && <p className="login-error-text">{errorMessage}</p>}
            {message && <p className="login-success-text">{message}</p>}

            <div className="login-field">
              <label className="login-label" htmlFor="resetEmail">
                <span className="login-label-icon">
                  <AppIcon name="login" />
                </span>
                <span>メールアドレス</span>
              </label>

              <div className="login-input-wrap">
                <input
                  id="resetEmail"
                  type="email"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <button
              className="login-primary-button"
              type="submit"
              disabled={sending}
            >
              {sending ? "送信中..." : "再設定メールを送信"}
            </button>

            <button
              type="button"
              className="login-outline-button"
              onClick={() => navigate("/login")}
            >
              ログイン画面へ戻る
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
