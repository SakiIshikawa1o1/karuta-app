import { useEffect } from "react";
import SiteFooter from "../components/SiteFooter";

function setPageMeta(title, description) {
  document.title = title;

  let meta = document.querySelector('meta[name="description"]');

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", description);
}

export default function PrivacyPolicyPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    setPageMeta(
      "プライバシーポリシー | まにまに",
      "競技かるた大会申込サービス「まにまに」における個人情報の取り扱いについて定めるプライバシーポリシーです。"
    );
  }, []);

  return (
    <div className="legal-page">
      <section className="legal-hero">
        <p>PRIVACY</p>
        <h1>プライバシーポリシー</h1>
        <span>個人情報の取り扱いについてご確認ください。</span>
      </section>

      <main className="legal-shell">
        <article className="legal-card">
          <header className="legal-card-header">
            <h2>プライバシーポリシー</h2>
            <p>制定日：【要記入】</p>
          </header>

          <section>
            <h3>1. 取得する情報</h3>
            <p>本サービスでは、以下の情報を取得する場合があります。</p>
            <ul>
              <li>氏名</li>
              <li>表示名</li>
              <li>メールアドレス</li>
              <li>電話番号</li>
              <li>学校名</li>
              <li>所属会</li>
              <li>級・段位</li>
              <li>大会申込情報</li>
              <li>問い合わせ内容</li>
              <li>ログイン・認証情報</li>
              <li>サービス利用履歴</li>
              <li>IPアドレス、Cookie等の技術情報</li>
            </ul>
          </section>

          <section>
            <h3>2. 利用目的</h3>
            <p>取得した情報は、以下の目的で利用します。</p>
            <ul>
              <li>本人確認およびアカウント管理</li>
              <li>所属会確認および承認</li>
              <li>大会申込受付・大会運営</li>
              <li>申込状況確認</li>
              <li>管理者・所属会代表者による確認</li>
              <li>問い合わせ対応</li>
              <li>サービス改善</li>
              <li>不正利用防止</li>
              <li>システム障害対応</li>
              <li>利用規約違反への対応</li>
            </ul>
          </section>

          <section>
            <h3>3. 第三者提供</h3>
            <p>
              運営者は、法令に基づく場合を除き、本人の同意なく個人情報を第三者へ提供しません。
            </p>
            <p>
              ただし、大会運営に必要な範囲で、以下の者が申込情報等を確認する場合があります。
            </p>
            <ul>
              <li>大会主催者</li>
              <li>大会管理者</li>
              <li>申込管理者</li>
              <li>所属会代表者</li>
            </ul>
            <p>
              外部サービス提供事業者に対し、システム運営上必要な範囲で情報を取り扱わせる場合があります。
            </p>
          </section>

          <section>
            <h3>4. 外部サービスの利用</h3>
            <p>本サービスでは、以下の外部サービスを利用する場合があります。</p>
            <ul>
              <li>Supabase（認証・データ管理）</li>
              <li>クラウドホスティングサービス</li>
              <li>メール送信サービス</li>
              <li>アクセス解析サービス</li>
            </ul>
            <p>これらのサービスにおいて、必要な範囲でデータが処理される場合があります。</p>
          </section>

          <section>
            <h3>5. 安全管理</h3>
            <p>
              運営者は、個人情報への不正アクセス、漏えい、改ざん、紛失等を防止するため、適切な安全管理措置を講じます。
            </p>
            <p>
              ただし、インターネット通信およびシステムの性質上、完全な安全性を保証するものではありません。
            </p>
          </section>

          <section>
            <h3>6. 情報の開示・訂正・削除等</h3>
            <p>
              ユーザーは、自己の個人情報について、開示・訂正・削除等を求めることができます。
            </p>
            <p>請求方法については、問い合わせ先までご連絡ください。</p>
            <p>ただし、法令上保存が必要な情報については、削除できない場合があります。</p>
          </section>

          <section>
            <h3>7. Cookie等の利用</h3>
            <p>
              本サービスでは、ログイン状態保持、利便性向上、アクセス解析等のため、Cookieその他類似技術を利用する場合があります。
            </p>
            <p>
              ユーザーは、ブラウザ設定によりCookieを制限または無効化できますが、一部機能が利用できなくなる場合があります。
            </p>
          </section>

          <section>
            <h3>8. プライバシーポリシーの変更</h3>
            <p>運営者は、必要に応じて本ポリシーを変更することがあります。</p>
            <p>
              変更後の内容は、本サービス上に掲載した時点から効力を生じるものとします。
            </p>
          </section>

          <section>
            <h3>9. 問い合わせ先</h3>
            <p>【要記入】</p>
          </section>

          <footer className="legal-note">
            <p>
              <strong>問い合わせ先</strong>
              <span>【要記入】</span>
            </p>
            <p>
              <strong>制定日</strong>
              <span>【要記入】</span>
            </p>
          </footer>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
