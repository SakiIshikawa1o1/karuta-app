// src/pages/LoginPage.jsx

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async () => {
    setErrorMessage("");
    setSaving(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    navigate(from, { replace: true });
  };

  return (
    <div className="screen">
      <h1>ログイン</h1>

      <div className="form-card">
        {errorMessage && <p className="error-text">{errorMessage}</p>}

        <label>
          メールアドレス
          <input
            type="email"
            placeholder="karuta@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label>
          パスワード
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button className="primary" onClick={handleLogin} disabled={saving}>
          {saving ? "ログイン中..." : "ログイン"}
        </button>

        <button className="link-button" onClick={() => navigate("/signup")}>
          新規登録はこちら
        </button>
      </div>
    </div>
  );
}