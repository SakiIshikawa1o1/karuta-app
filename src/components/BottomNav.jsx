import { useLocation, useNavigate } from "react-router-dom";
import AppIcon from "./AppIcon";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: "ホーム", path: "/", icon: "home" },
    { label: "大会一覧", path: "/tournaments", icon: "tournaments" },
    { label: "申込状況", path: "/applications/status", icon: "applications" },
    { label: "マイページ", path: "/mypage", icon: "mypage" },
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
            type="button"
          >
            <AppIcon name={item.icon} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
