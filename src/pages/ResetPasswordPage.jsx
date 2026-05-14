import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 5C6 5 2.06 10.02 1 12c1.06 1.98 5 7 11 7s9.94-5.02 11-7c-1.06-1.98-5-7-11-7Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const prepareSession = async () => {
      setCheckingSession(true);

      if (window.location.search.includes("code=")) {
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          setErrorMessage(error.message);
          setCheckingSession(false);
          return;
        }
      }

      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        setErrorMessage(
          "再設定リンクを確認できませんでした。もう一度メールを送信してください。"
        );
      }

      setCheckingSession(false);
    };

    prepareSession();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (password.length < 8) {
      setErrorMessage("パスワードは8文字以上で入力してください。");
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage("パスワードが一致していません。");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({ password });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage("パスワードを更新しました。新しいパスワードでログインしてください。");
    await supabase.auth.signOut({ scope: "local" });
  };

  return (
    <div className="login-page">
      <div className="login-page-shell">
        <div className="login-page-inner">
          <header className="login-brand">
            <div className="login-brand-logo">
              <img src="/images/logo.png" alt="まにまに" />
            </div>

            <h1>新しいパスワード</h1>
            <p>8文字以上で設定してください</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            {errorMessage && <p className="login-error-text">{errorMessage}</p>}
            {message && <p className="login-success-text">{message}</p>}

            <div className="login-field">
              <label className="login-label" htmlFor="newPassword">
                <span>パスワード</span>
              </label>

              <div className="login-input-wrap has-action">
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="新しいパスワード"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  disabled={checkingSession || !!message}
                />

                <button
                  type="button"
                  className="password-toggle-button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label="パスワードを表示"
                >
                  <EyeIcon />
                </button>
              </div>
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="newPasswordConfirm">
                <span>パスワード（確認）</span>
              </label>

              <div className="login-input-wrap has-action">
                <input
                  id="newPasswordConfirm"
                  type={showPasswordConfirm ? "text" : "password"}
                  placeholder="もう一度入力してください"
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  autoComplete="new-password"
                  disabled={checkingSession || !!message}
                />

                <button
                  type="button"
                  className="password-toggle-button"
                  onClick={() => setShowPasswordConfirm((prev) => !prev)}
                  aria-label="確認用パスワードを表示"
                >
                  <EyeIcon />
                </button>
              </div>
            </div>

            <button
              className="login-primary-button"
              type="submit"
              disabled={checkingSession || saving || !!message}
            >
              {checkingSession
                ? "確認中..."
                : saving
                  ? "更新中..."
                  : "パスワードを更新"}
            </button>

            <button
              type="button"
              className="login-outline-button"
              onClick={() => navigate("/login")}
            >
              ログイン画面へ
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
