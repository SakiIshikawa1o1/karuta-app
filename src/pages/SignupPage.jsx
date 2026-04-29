// src/pages/SignupPage.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function SignupPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [grade, setGrade] = useState("");
  const [phone, setPhone] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSignup = async () => {
    setErrorMessage("");

    if (!fullName || !email || !password) {
      setErrorMessage("氏名、メールアドレス、パスワードは必須です。");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          display_name: displayName || fullName,
          organization,
          grade,
          phone,
        },
      },
    });

    if (error) {
      setSaving(false);
      setErrorMessage(error.message);
      return;
    }

    const userId = data.user?.id;

    if (userId) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            email,
            full_name: fullName,
            display_name: displayName || fullName,
            organization,
            grade,
            phone,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
          }
        );

      if (profileError) {
        setSaving(false);
        setErrorMessage(`プロフィール作成に失敗しました：${profileError.message}`);
        return;
      }
    }

    setSaving(false);
    alert("新規登録しました。ログインしてください。");
    navigate("/login");
  };

  return (
    <div className="screen">
      <h1>新規登録</h1>

      <div className="form-card">
        {errorMessage && <p className="error-text">{errorMessage}</p>}

        <label>
          氏名
          <input
            type="text"
            placeholder="山田 太郎"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </label>

        <label>
          表示名
          <input
            type="text"
            placeholder="山田 太郎"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>

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

        <label>
          所属会
          <input
            type="text"
            placeholder="東京かるた会"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
          />
        </label>

        <label>
          段位
          <select value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="">選択してください</option>
            <option value="無段">無段</option>
            <option value="初段">初段</option>
            <option value="二段">二段</option>
            <option value="三段">三段</option>
            <option value="四段">四段</option>
            <option value="五段">五段</option>
            <option value="六段">六段</option>
            <option value="七段">七段</option>
          </select>
        </label>

        <label>
          電話番号
          <input
            type="text"
            placeholder="090-1234-5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>

        <button className="primary" onClick={handleSignup} disabled={saving}>
          {saving ? "登録中..." : "登録する"}
        </button>

        <button className="link-button" onClick={() => navigate("/login")}>
          すでにアカウントをお持ちの方はこちら
        </button>
      </div>
    </div>
  );
}