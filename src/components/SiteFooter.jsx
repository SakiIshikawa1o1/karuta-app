import { useNavigate } from "react-router-dom";

export default function SiteFooter() {
  const navigate = useNavigate();

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div>
          <div className="footer-logo">
            <div className="footer-logo-image" />
            <div>
              <strong>まにまに</strong>
              <small>大会申込システム</small>
            </div>
          </div>

          <p className="footer-description">
            競技かるたの大会申込を、もっと分かりやすく、もっとスムーズに。
            大会情報の確認から申込状況の管理までをサポートします。
          </p>
        </div>

        <div className="footer-links">
          <div>
            <h3>メニュー</h3>
            <button type="button" onClick={() => navigate("/")}>
              ホーム
            </button>
            <button type="button" onClick={() => navigate("/tournaments")}>
              大会を探す
            </button>
            <button type="button" onClick={() => navigate("/applications")}>
              申込状況
            </button>
            <button type="button" onClick={() => navigate("/mypage")}>
              マイページ
            </button>
          </div>

          <div>
            <h3>サポート</h3>
            <button type="button" onClick={() => navigate("/notices")}>
              お知らせ
            </button>
            <button type="button" onClick={() => navigate("/contact")}>
              お問い合わせ
            </button>
            <button type="button" onClick={() => navigate("/privacy")}>
              プライバシーポリシー
            </button>
            <button type="button" onClick={() => navigate("/terms")}>
              利用規約
            </button>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 まにまに</span>
        <span>Karuta Tournament Application System</span>
      </div>
    </footer>
  );
}