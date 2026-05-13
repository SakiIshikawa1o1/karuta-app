const ICONS = {
  home: "01",
  tournaments: "02",
  applications: "03",
  notices: "04",
  mypage: "05",
  login: "06",
  signup: "07",
  detail: "08",
  apply: "09",
  cancel: "10",
  payment: "11",
  pending: "12",
  approved: "13",
  rejected: "14",
  admin: "15",
  users: "16",
  affiliation: "17",
  approval: "18",
  contact: "19",
  create: "20",
  edit: "21",
  hidden: "22",
  search: "23",
  maple: "24",
};

export default function AppIcon({ name, className = "", alt = "" }) {
  const iconNumber = ICONS[name] || ICONS.home;

  return (
    <img
      className={`app-icon ${className}`.trim()}
      src={`/images/icon/icon_${iconNumber}.png`}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      loading="lazy"
    />
  );
}
