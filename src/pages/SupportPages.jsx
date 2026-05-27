import SiteFooter from "../components/SiteFooter";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

function SupportPageLayout({ title, lead, children }) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className="support-page">
      <section className="support-page-hero">
        <p>SUPPORT</p>
        <h1>{title}</h1>
        <span>{lead}</span>
      </section>

      <main className="support-page-content">{children}</main>

      <SiteFooter />
    </div>
  );
}

export function TermsPage() {
  return (
    <SupportPageLayout
      title="利用規約"
      lead="まにまに大会申込管理アプリをご利用いただく際の基本ルールです。"
    >
      <section>
        <h2>1. サービスの利用</h2>
        <p>
          本システムは、競技かるた大会の情報確認、申込、申込状況の確認を支援するためのサービスです。
          利用者は、正確な情報を登録し、第三者になりすまして利用しないものとします。
        </p>
      </section>

      <section>
        <h2>2. 申込内容</h2>
        <p>
          大会への申込、キャンセル、料金連絡などは、各大会の案内や主催者が定める条件に従ってください。
          登録内容に誤りがある場合は、速やかに修正または主催者へ連絡してください。
        </p>
      </section>

      <section>
        <h2>3. 禁止事項</h2>
        <p>
          システムへの不正アクセス、虚偽情報の登録、他の利用者や大会運営を妨げる行為は禁止します。
          必要に応じて、運営者は利用制限や登録情報の確認を行うことがあります。
        </p>
      </section>

      <section>
        <h2>4. 規約の変更</h2>
        <p>
          本規約は、サービス改善や運用上の必要に応じて変更される場合があります。
          重要な変更がある場合は、サイト上のお知らせ等で案内します。
        </p>
      </section>
    </SupportPageLayout>
  );
}

export function PrivacyPage() {
  return (
    <SupportPageLayout
      title="プライバシーポリシー"
      lead="登録情報と申込情報の取り扱いについてまとめています。"
    >
      <section>
        <h2>1. 取得する情報</h2>
        <p>
          氏名、メールアドレス、所属会、段位、電話番号、申込大会、申込状況など、
          大会申込と運営連絡に必要な情報を取得します。
        </p>
      </section>

      <section>
        <h2>2. 利用目的</h2>
        <p>
          取得した情報は、本人確認、申込管理、料金確認、主催者からの連絡、
          サービス改善のために利用します。
        </p>
      </section>

      <section>
        <h2>3. 第三者提供</h2>
        <p>
          法令に基づく場合を除き、本人の同意なく個人情報を目的外で第三者へ提供しません。
          大会運営に必要な範囲で、主催者または管理者が申込情報を確認する場合があります。
        </p>
      </section>

      <section>
        <h2>4. 情報の管理</h2>
        <p>
          個人情報は適切に管理し、不正アクセス、紛失、改ざん、漏えいの防止に努めます。
          登録情報の修正が必要な場合は、マイページまたは問い合わせページからご連絡ください。
        </p>
      </section>
    </SupportPageLayout>
  );
}

export function ContactPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!user) {
      setMessage("問い合わせにはログインが必要です。");
      navigate("/login");
      return;
    }

    if (!subject.trim() || !body.trim()) {
      setMessage("件名と内容を入力してください。");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("inquiries").insert({
      user_id: user.id,
      subject: subject.trim(),
      body: body.trim(),
      status: "open",
    });

    setSaving(false);

    if (error) {
      setMessage(`問い合わせの送信に失敗しました：${error.message}`);
      return;
    }

    setSubject("");
    setBody("");
    setMessage("問い合わせを送信しました。");
  };

  return (
    <SupportPageLayout
      title="問い合わせ"
      lead="大会申込、アカウント、承認状況についてお困りの内容を送信できます。"
    >
      <section className="support-contact-card">
        <div className="support-contact-heading">
          <span>CONTACT</span>
          <h2>問い合わせフォーム</h2>
          <p>
            内容を確認後、運営側で対応します。大会名や発生している画面名がある場合は本文に含めてください。
          </p>
        </div>

        {message && <p className="support-form-message">{message}</p>}

        {!loading && !user ? (
          <div className="support-login-required">
            <p>問い合わせを送信するにはログインしてください。</p>
            <button type="button" onClick={() => navigate("/login")}>
              ログインへ
            </button>
          </div>
        ) : (
          <form className="support-contact-form" onSubmit={handleSubmit}>
            <label>
              <span>件名</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="例）所属会承認について"
              />
            </label>

            <label>
              <span>内容</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="問い合わせ内容を入力してください"
                rows={8}
              />
            </label>

            <button type="submit" disabled={saving || loading}>
              {saving ? "送信中..." : "問い合わせを送信"}
            </button>
          </form>
        )}
      </section>

      <section className="support-page-tips">
        <h2>書くと伝わりやすい内容</h2>
        <div>
          <span>大会名</span>
          <span>操作していた画面</span>
          <span>表示されたエラー文</span>
          <span>承認待ち・申込状況などの状態</span>
        </div>
      </section>
    </SupportPageLayout>
  );
}
