import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function SiteFooter() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const goTo = (path) => {
    navigate(path);
    window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, 0);
  };

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div>
          <div className="footer-logo">
            <div className="footer-logo-image" />
            <div>
              <strong>まにまに</strong>
              <small>大会申込管理アプリ</small>
            </div>
          </div>

          <p className="footer-description">
            競技かるたの大会情報確認から申込状況の管理までを、わかりやすくスムーズにサポートします。
          </p>
        </div>

        <div className="footer-links">
          <div>
            <h3>メニュー</h3>
            <button type="button" onClick={() => goTo("/")}>
              ホーム
            </button>
            <button type="button" onClick={() => goTo("/tournaments")}>
              大会を探す
            </button>
            <button type="button" onClick={() => goTo("/applications/status")}>
              申込状況
            </button>
            <button type="button" onClick={() => goTo("/mypage")}>
              マイページ
            </button>
            {!loading && !user && (
              <button type="button" onClick={() => goTo("/login")}>
                ログイン
              </button>
            )}
          </div>

          <div>
            <h3>サポート</h3>
            <button type="button" onClick={() => goTo("/notices")}>
              お知らせ
            </button>
            <button type="button" onClick={() => goTo("/contact")}>
              問い合わせ
            </button>
            <button type="button" onClick={() => goTo("/privacy")}>
              プライバシーポリシー
            </button>
            <button type="button" onClick={() => goTo("/terms")}>
              利用規約
            </button>
          </div>
        </div>
      </div>

      <div className="footer-legal-links" aria-label="法務リンク">
        <button type="button" onClick={() => goTo("/terms")}>
          利用規約
        </button>
        <span aria-hidden="true">|</span>
        <button type="button" onClick={() => goTo("/privacy")}>
          プライバシーポリシー
        </button>
      </div>

      <div className="footer-bottom">
        <span>© 2026 まにまに</span>
        <span>Karuta Tournament Application System</span>
      </div>
    </footer>
  );
}
