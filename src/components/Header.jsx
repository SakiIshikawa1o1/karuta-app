// src/components/Header.jsx

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ROLE } from "../utils/roles";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, hasRole } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isSystemAdmin = hasRole(ROLE.SYSTEM_ADMIN);
  const isTournamentAdmin = isSystemAdmin || hasRole(ROLE.TOURNAMENT_ADMIN);
  const isApplicationAdmin = isSystemAdmin || hasRole(ROLE.APPLICATION_ADMIN);

  const isActive = (path) => location.pathname === path;

  const moveTo = (path) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <>
      <header className="site-header">
        <button className="site-logo" onClick={() => navigate("/")}>
          <span className="logo-flower">✿</span>
          <span>
            <strong>まにまに</strong>
            <small>大会申込システム</small>
          </span>
        </button>

        <nav className="pc-nav">
          <button
            className={isActive("/") ? "active" : ""}
            onClick={() => navigate("/")}
          >
            ホーム
          </button>
          <button
            className={isActive("/tournaments") ? "active" : ""}
            onClick={() => navigate("/tournaments")}
          >
            大会を探す
          </button>
          <button
            className={isActive("/applications/status") ? "active" : ""}
            onClick={() => navigate("/applications/status")}
          >
            申込履歴
          </button>
          <button
            className={isActive("/mypage") ? "active" : ""}
            onClick={() => navigate("/mypage")}
          >
            マイページ
          </button>
        </nav>

        <div className="header-actions">
          {isLoggedIn ? (
            <button className="header-login-button" onClick={handleLogout}>
              ログアウト
            </button>
          ) : (
            <button
              className="header-login-button"
              onClick={() => navigate("/login")}
            >
              ログイン
            </button>
          )}

          <button
            className="hamburger-button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="メニューを開く"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <div className="menu-overlay" onClick={() => setIsMenuOpen(false)}>
          <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
            <div className="menu-panel-header">
              <h2>メニュー</h2>
              <button onClick={() => setIsMenuOpen(false)}>×</button>
            </div>

            <div className="menu-list">
              <button onClick={() => moveTo("/")}>ホーム</button>
              <button onClick={() => moveTo("/tournaments")}>大会を探す</button>

              {isLoggedIn ? (
                <>
                  <button onClick={() => moveTo("/applications/status")}>
                    申込履歴
                  </button>
                  <button onClick={() => moveTo("/mypage")}>マイページ</button>

                  {isSystemAdmin && (
                    <button onClick={() => moveTo("/admin/system")}>
                      システム管理者ページ
                    </button>
                  )}

                  {isTournamentAdmin && (
                    <button onClick={() => moveTo("/admin/tournament")}>
                      大会管理者ページ
                    </button>
                  )}

                  {isApplicationAdmin && (
                    <button onClick={() => moveTo("/admin/application")}>
                      申し込み管理者ページ
                    </button>
                  )}

                  <button className="danger-text" onClick={handleLogout}>
                    ログアウト
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => moveTo("/login")}>ログイン</button>
                  <button onClick={() => moveTo("/signup")}>新規登録</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}