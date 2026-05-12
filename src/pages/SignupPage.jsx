// src/pages/SignupPage.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 21V3h12v18h-3v-4H7v4H4Zm3-12h2V7H7v2Zm0 4h2v-2H7v2Zm4-4h2V7h-2v2Zm0 4h2v-2h-2v2Zm7 8V8h2v13h-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MedalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2a5 5 0 0 0-3 9v4.8l3-1.8 3 1.8V11a5 5 0 0 0-3-9Zm0 7.2a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4ZM7 22l5-3 5 3v-8.2l-5-3-5 3V22Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SchoolIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3 2 8l10 5 8-4v6h2V8L12 3Zm-6 9.1V16c0 1.7 2.7 4 6 4s6-2.3 6-4v-3.9l-6 3-6-3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 5h18v14H3V5Zm9 7.2L5.3 7H4.8l7.2 5.6L19.2 7h-.5L12 12.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.6 10.8c1.5 3 3.6 5.1 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.2-.3 1 .3 2 .5 3.1.5.7 0 1.3.6 1.3 1.3V20c0 .7-.6 1.3-1.3 1.3C10.4 21.3 2.7 13.6 2.7 4.3 2.7 3.6 3.3 3 4 3h3.3c.7 0 1.3.6 1.3 1.3 0 1.1.2 2.1.5 3.1.1.4 0 .9-.3 1.2l-2.2 2.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M17 9h-1V7a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V7Z"
        fill="currentColor"
      />
    </svg>
  );
}

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

export default function SignupPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [affiliationId, setAffiliationId] = useState("");
  const [affiliationCode, setAffiliationCode] = useState("");
  const [classLevelId, setClassLevelId] = useState("");
  const [danRankId, setDanRankId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [affiliations, setAffiliations] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [danRanks, setDanRanks] = useState([]);

  const [loadingMasters, setLoadingMasters] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [signupComplete, setSignupComplete] = useState(false);

  useEffect(() => {
    const fetchMasters = async () => {
      setLoadingMasters(true);
      setErrorMessage("");

      const [affiliationsResult, classLevelsResult, danRanksResult] =
        await Promise.all([
          supabase
            .from("affiliations")
            .select("id, name, is_active")
            .eq("is_active", true)
            .order("name", { ascending: true }),

          supabase
            .from("class_levels")
            .select("id, code, name, sort_order, is_active")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),

          supabase
            .from("dan_ranks")
            .select("id, code, name, sort_order, is_active")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
        ]);

      setLoadingMasters(false);

      if (affiliationsResult.error) {
        setErrorMessage(
          `所属会の取得に失敗しました：${affiliationsResult.error.message}`
        );
        return;
      }

      if (classLevelsResult.error) {
        setErrorMessage(
          `級マスタの取得に失敗しました：${classLevelsResult.error.message}`
        );
        return;
      }

      if (danRanksResult.error) {
        setErrorMessage(
          `段位マスタの取得に失敗しました：${danRanksResult.error.message}`
        );
        return;
      }

      setAffiliations(affiliationsResult.data ?? []);
      setClassLevels(classLevelsResult.data ?? []);
      setDanRanks(danRanksResult.data ?? []);
    };

    fetchMasters();
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const normalizedEmail = email.trim();

    if (
      !fullName ||
      !normalizedEmail ||
      !password ||
      !affiliationId ||
      !affiliationCode ||
      !classLevelId ||
      !danRankId
    ) {
      setErrorMessage(
        "名前、メールアドレス、パスワード、所属会、級、段位は必須です。"
      );
      return;
    }

    if (password.length < 8) {
      setErrorMessage("パスワードは8文字以上で入力してください。");
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage("パスワードが一致していません。");
      return;
    }

    if (!/^\d{4}$/.test(affiliationCode)) {
      setErrorMessage("所属会コードは4桁で入力してください");
      return;
    }

    if (!agreed) {
      setErrorMessage("利用規約とプライバシーポリシーへの同意が必要です。");
      return;
    }

    setSaving(true);

    const { data: isValidAffiliationCode, error: codeError } =
      await supabase.rpc("validate_affiliation_code", {
        p_affiliation_id: affiliationId,
        p_input_code: affiliationCode,
      });

    if (codeError) {
      setSaving(false);
      setErrorMessage("登録申請を送信できませんでした");
      return;
    }

    if (!isValidAffiliationCode) {
      setSaving(false);
      setErrorMessage("所属会コードが正しくありません");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          display_name: displayName.trim() || fullName.trim(),
          school_name: schoolName.trim(),
          affiliation_id: affiliationId,
          affiliation_approval_code: affiliationCode,
          class_level_id: classLevelId,
          dan_rank_id: danRankId,
          phone: phone.trim(),
        },
      },
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSignupComplete(true);
  };

  if (signupComplete) {
    return (
      <div className="signup-page">
        <div className="signup-shell">
          <div className="signup-wave-bg" aria-hidden="true" />

          <div className="signup-inner">
            <header className="signup-brand">
              <div className="signup-brand-logo">
                <img src="/images/logo.png" alt="まにまに" />
              </div>

              <h1>登録申請を受け付けました</h1>
              <p>
                所属会代表者の承認をお待ちください。
              </p>
            </header>

            <div className="signup-login-guide">
              <p>ログイン後、承認状況を確認できます。</p>
              <button type="button" onClick={() => navigate("/login")}>
                ログイン画面へ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-page">
      <div className="signup-shell">
        <button
          type="button"
          className="signup-back-button"
          onClick={() => navigate("/login")}
          aria-label="ログイン画面に戻る"
        >
          ‹
        </button>

        <div className="signup-wave-bg" aria-hidden="true" />

        <div className="signup-inner">
          <header className="signup-brand">
            <div className="signup-brand-logo">
              <img src="/images/logo.png" alt="まにまに" />
            </div>

            <h1>新規登録</h1>
            <p>アカウント情報を入力してください</p>
          </header>

          <form className="signup-form" onSubmit={handleSignup}>
            {errorMessage && <p className="signup-error-text">{errorMessage}</p>}

            <div className="signup-field">
              <label className="signup-label" htmlFor="fullName">
                <span className="signup-label-icon">
                  <UserIcon />
                </span>
                <span>名前</span>
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="例）山田 太郎"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="signup-field">
              <label className="signup-label" htmlFor="displayName">
                <span className="signup-label-icon">
                  <UserIcon />
                </span>
                <span>名前（ふりがな）</span>
              </label>
              <input
                id="displayName"
                type="text"
                placeholder="例）やまだ たろう"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="signup-field">
              <label className="signup-label" htmlFor="schoolName">
                <span className="signup-label-icon">
                  <SchoolIcon />
                </span>
                <span>学校名</span>
              </label>
              <input
                id="schoolName"
                type="text"
                placeholder="例）東京第一大学"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
            </div>

            <div className="signup-field">
              <label className="signup-label" htmlFor="affiliationId">
                <span className="signup-label-icon">
                  <BuildingIcon />
                </span>
                <span>所属会</span>
              </label>
              <div className="signup-select-wrap">
                <select
                  id="affiliationId"
                  value={affiliationId}
                  onChange={(e) => setAffiliationId(e.target.value)}
                  required
                  disabled={loadingMasters}
                >
                  <option value="">
                    {loadingMasters ? "読み込み中..." : "選択してください"}
                  </option>
                  {affiliations.map((affiliation) => (
                    <option key={affiliation.id} value={affiliation.id}>
                      {affiliation.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="signup-field">
              <label className="signup-label" htmlFor="affiliationCode">
                <span className="signup-label-icon">
                  <LockIcon />
                </span>
                <span>所属会コード（4桁）</span>
              </label>
              <input
                id="affiliationCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                placeholder="例：1234"
                value={affiliationCode}
                onChange={(e) =>
                  setAffiliationCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                autoComplete="one-time-code"
              />
            </div>

            <div className="signup-field">
              <label className="signup-label" htmlFor="classLevelId">
                <span className="signup-label-icon">
                  <MedalIcon />
                </span>
                <span>級</span>
              </label>
              <div className="signup-select-wrap">
                <select
                  id="classLevelId"
                  value={classLevelId}
                  onChange={(e) => setClassLevelId(e.target.value)}
                  required
                  disabled={loadingMasters}
                >
                  <option value="">
                    {loadingMasters ? "読み込み中..." : "選択してください"}
                  </option>
                  {classLevels.map((classLevel) => (
                    <option key={classLevel.id} value={classLevel.id}>
                      {classLevel.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="signup-field">
              <label className="signup-label" htmlFor="danRankId">
                <span className="signup-label-icon">
                  <MedalIcon />
                </span>
                <span>段位</span>
              </label>
              <div className="signup-select-wrap">
                <select
                  id="danRankId"
                  value={danRankId}
                  onChange={(e) => setDanRankId(e.target.value)}
                  required
                  disabled={loadingMasters}
                >
                  <option value="">
                    {loadingMasters ? "読み込み中..." : "選択してください"}
                  </option>
                  {danRanks.map((danRank) => (
                    <option key={danRank.id} value={danRank.id}>
                      {danRank.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="signup-field">
              <label className="signup-label" htmlFor="email">
                <span className="signup-label-icon">
                  <MailIcon />
                </span>
                <span>メールアドレス</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="signup-field">
              <label className="signup-label" htmlFor="phone">
                <span className="signup-label-icon">
                  <PhoneIcon />
                </span>
                <span>電話番号</span>
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="例）090-0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>

            <div className="signup-field">
              <label className="signup-label" htmlFor="password">
                <span className="signup-label-icon">
                  <LockIcon />
                </span>
                <span>パスワード</span>
              </label>
              <div className="signup-password-wrap">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="半角英数字8文字以上"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label="パスワードを表示"
                >
                  <EyeIcon />
                </button>
              </div>
            </div>

            <div className="signup-field">
              <label className="signup-label" htmlFor="passwordConfirm">
                <span className="signup-label-icon">
                  <LockIcon />
                </span>
                <span>パスワード（確認用）</span>
              </label>
              <div className="signup-password-wrap">
                <input
                  id="passwordConfirm"
                  type={showPasswordConfirm ? "text" : "password"}
                  placeholder="もう一度入力してください"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm((prev) => !prev)}
                  aria-label="確認用パスワードを表示"
                >
                  <EyeIcon />
                </button>
              </div>
            </div>

            <label className="signup-agree">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                <button type="button" onClick={() => navigate("/terms")}>
                  利用規約
                </button>
                と
                <button type="button" onClick={() => navigate("/privacy")}>
                  プライバシーポリシー
                </button>
                に同意します
              </span>
            </label>

            <button
              className="signup-primary-button"
              type="submit"
              disabled={saving || loadingMasters}
            >
              {saving ? "登録中..." : "登録する"}
            </button>

            <div className="signup-login-guide">
              <p>すでにアカウントをお持ちの方はこちら</p>
              <button type="button" onClick={() => navigate("/login")}>
                ログイン
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
