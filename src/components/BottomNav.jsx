import { useNavigate, useLocation } from "react-router-dom";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: "ホーム", path: "/", icon: "🏠" },
    { label: "大会一覧", path: "/tournaments", icon: "📋" },
    { label: "申込状況", path: "/applications/status", icon: "✅" },
    { label: "マイページ", path: "/mypage", icon: "👤" },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const active = location.pathname === item.path;

        return (
          <button
            key={item.path}
            className={active ? "nav-item active" : "nav-item"}
            onClick={() => navigate(item.path)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}