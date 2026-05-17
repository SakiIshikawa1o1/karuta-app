import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ROLE } from "../utils/roles";

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

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setErrorMessage("");
    setSaving(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("approval_status")
      .eq("id", data.user.id)
      .maybeSingle();

    const { data: roleData } = await supabase
      .from("user_roles")
      .select(`
        roles (
          code
        )
      `)
      .eq("user_id", data.user.id)
      .eq("is_active", true);

    const roleCodes =
      roleData?.map((item) => item.roles?.code).filter(Boolean) ?? [];
    const isSystemAdmin = roleCodes.includes(ROLE.SYSTEM_ADMIN);

    if (profileData?.approval_status !== "approved" && !isSystemAdmin) {
      navigate("/approval-pending", { replace: true });
      return;
    }

    navigate(from, { replace: true });
  };

  return (
    <div className="login-page">
      <div className="login-page-shell">
        <div className="login-page-inner">
          <header className="login-brand">
            <div className="login-brand-logo">
              <img src="/images/logo.png" alt="まにまに" />
            </div>

            <h1>まにまに</h1>
            <p>大会申込システム</p>
          </header>

          <form className="login-form" onSubmit={handleLogin}>
            {errorMessage && <p className="login-error-text">{errorMessage}</p>}

            <div className="login-field">
              <label className="login-label" htmlFor="email">
                <span className="login-label-icon">
                </span>
                <span>メールアドレス</span>
              </label>

              <div className="login-input-wrap">
                <input
                  id="email"
                  type="email"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="password">
                <span className="login-label-icon">
                </span>
                <span>パスワード</span>
              </label>

              <div className="login-input-wrap has-action">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="パスワードを入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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

            <div className="login-forgot-wrap">
              <button
                type="button"
                className="login-text-link"
                onClick={() => navigate("/forgot-password")}
              >
                パスワードをお忘れの方はこちら
                <span>›</span>
              </button>
            </div>

            <button className="login-primary-button" type="submit" disabled={saving}>
              {saving ? "ログイン中..." : "ログイン"}
            </button>

            <div className="login-divider">
              <span />
              <p>または</p>
              <span />
            </div>

            <button
              type="button"
              className="login-outline-button"
              onClick={() => navigate("/signup")}
            >
              新規登録はこちら
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
