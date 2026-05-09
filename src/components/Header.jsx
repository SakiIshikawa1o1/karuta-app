import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const goTo = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    setLoggingOut(false);

    if (error) {
      alert(`ログアウトに失敗しました：${error.message}`);
      return;
    }

    setMenuOpen(false);
    navigate("/");
  };

  return (
    <>
      <header className="site-header">
        <button className="site-logo" type="button" onClick={() => goTo("/")}>
          <span className="logo-image" />
          <span>
            <strong>まにまに</strong>
            <small>大会申込システム</small>
          </span>
        </button>

        <nav className="pc-nav">
          <button
            type="button"
            className={isActive("/") ? "active" : ""}
            onClick={() => goTo("/")}
          >
            ホーム
          </button>

          <button
            type="button"
            className={isActive("/tournaments") ? "active" : ""}
            onClick={() => goTo("/tournaments")}
          >
            大会を探す
          </button>

          <button
            type="button"
            className={isActive("/applications") ? "active" : ""}
            onClick={() => goTo("/applications/status")}
          >
            申込状況
          </button>

          <button
            type="button"
            className={isActive("/notices") ? "active" : ""}
            onClick={() => goTo("/notices")}
          >
            お知らせ
          </button>

          <button
            type="button"
            className={isActive("/mypage") ? "active" : ""}
            onClick={() => goTo("/mypage")}
          >
            マイページ
          </button>
        </nav>

        <div className="header-actions">
          {!loading && (
            <>
              {user ? (
                <button
                  type="button"
                  className="header-login-button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  {loggingOut ? "ログアウト中..." : "ログアウト"}
                </button>
              ) : (
                <button
                  type="button"
                  className="header-login-button"
                  onClick={() => navigate("/login")}
                >
                  ログイン
                </button>
              )}
            </>
          )}

          <button
            type="button"
            className="hamburger-button"
            onClick={() => setMenuOpen(true)}
            aria-label="メニューを開く"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
            <div className="menu-panel-header">
              <h2>メニュー</h2>
              <button type="button" onClick={() => setMenuOpen(false)}>
                ×
              </button>
            </div>

            <div className="menu-list">
              <button type="button" onClick={() => goTo("/")}>
                ホーム
              </button>

              <button type="button" onClick={() => goTo("/tournaments")}>
                大会を探す
              </button>

              <button type="button" onClick={() => goTo("/applications/status")}>
                申込状況
              </button>

              <button type="button" onClick={() => goTo("/notices")}>
                お知らせ
              </button>

              <button type="button" onClick={() => goTo("/mypage")}>
                マイページ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
