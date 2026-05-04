// src/pages/TournamentListPage.jsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const STATUS_LABEL = {
  draft: "準備中",
  published: "受付中",
  closed: "受付終了",
  cancelled: "中止",
};

const STATUS_OPTIONS = [
  { value: "", label: "すべての受付状況" },
  { value: "published", label: "受付中" },
  { value: "closed", label: "受付終了" },
  { value: "cancelled", label: "中止" },
  { value: "draft", label: "準備中" },
];

const REGION_OPTIONS = [
  { value: "", label: "すべての地域" },
  { value: "北海道", label: "北海道" },
  { value: "東北", label: "東北" },
  { value: "関東", label: "関東" },
  { value: "中部", label: "中部" },
  { value: "近畿", label: "近畿" },
  { value: "中国", label: "中国" },
  { value: "四国", label: "四国" },
  { value: "九州", label: "九州" },
];

const GRADE_OPTIONS = [
  { value: "", label: "すべての出場級" },
  { value: "A級", label: "A級" },
  { value: "B級", label: "B級" },
  { value: "C級", label: "C級" },
  { value: "D級", label: "D級" },
  { value: "E級", label: "E級" },
  { value: "初心者", label: "初心者" },
  { value: "小学生", label: "小学生" },
  { value: "中学生", label: "中学生" },
  { value: "高校生", label: "高校生" },
  { value: "大学生", label: "大学生" },
  { value: "一般", label: "一般" },
];

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatMonthKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return `${date.getMonth() + 1}月`;
}

function formatShortDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getTournamentRegion(tournament) {
  return (
    tournament.region ||
    tournament.area ||
    tournament.prefecture ||
    tournament.address ||
    tournament.venue ||
    ""
  );
}

function getTournamentGrade(tournament) {
  return (
    tournament.grade ||
    tournament.grades ||
    tournament.rank ||
    tournament.class_name ||
    tournament.division ||
    tournament.category ||
    tournament.target_grade ||
    tournament.entry_class ||
    ""
  );
}

function getTournamentDeadline(tournament) {
  return (
    tournament.application_deadline ||
    tournament.deadline ||
    tournament.entry_deadline ||
    tournament.apply_deadline ||
    tournament.application_end_date ||
    tournament.entry_end_date ||
    null
  );
}

function buildMonthTabs(tournaments) {
  const monthMap = new Map();

  tournaments.forEach((tournament) => {
    if (!tournament.event_date) return;

    const key = formatMonthKey(tournament.event_date);
    if (!key) return;

    const current = monthMap.get(key) || {
      key,
      label: formatMonthLabel(tournament.event_date),
      count: 0,
    };

    current.count += 1;
    monthMap.set(key, current);
  });

  return Array.from(monthMap.values()).sort((a, b) =>
    a.key.localeCompare(b.key)
  );
}

function groupByDate(tournaments) {
  const map = new Map();

  tournaments.forEach((tournament) => {
    const key = tournament.event_date || "未定";

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(tournament);
  });

  return Array.from(map.entries()).map(([date, items]) => ({
    date,
    items,
  }));
}

export default function TournamentListPage() {
  const navigate = useNavigate();

  const [tournaments, setTournaments] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [visibleCount, setVisibleCount] = useState(8);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchTournaments = async () => {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("event_date", { ascending: true });

    setLoading(false);

    if (error) {
      setMessage(`大会一覧の取得に失敗しました：${error.message}`);
      return;
    }

    const list = data ?? [];
    setTournaments(list);

    const tabs = buildMonthTabs(list);
    if (!selectedMonth && tabs.length > 0) {
      setSelectedMonth(tabs[0].key);
    }
  };

  useEffect(() => {
    fetchTournaments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthTabs = useMemo(() => buildMonthTabs(tournaments), [tournaments]);

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((tournament) => {
      const title = tournament.title || "";
      const venue = tournament.venue || "";
      const regionText = getTournamentRegion(tournament);
      const gradeText = getTournamentGrade(tournament);
      const monthKey = formatMonthKey(tournament.event_date);

      const matchesKeyword =
        !keyword ||
        title.includes(keyword) ||
        venue.includes(keyword) ||
        regionText.includes(keyword) ||
        String(gradeText).includes(keyword);

      const matchesMonth = !selectedMonth || monthKey === selectedMonth;

      const matchesRegion =
        !selectedRegion || regionText.includes(selectedRegion);

      const matchesGrade =
        !selectedGrade || String(gradeText).includes(selectedGrade);

      const matchesStatus =
        !selectedStatus || tournament.status === selectedStatus;

      return (
        matchesKeyword &&
        matchesMonth &&
        matchesRegion &&
        matchesGrade &&
        matchesStatus
      );
    });
  }, [
    tournaments,
    keyword,
    selectedMonth,
    selectedRegion,
    selectedGrade,
    selectedStatus,
  ]);

  const visibleTournaments = filteredTournaments.slice(0, visibleCount);
  const groupedTournaments = groupByDate(visibleTournaments);

  const selectedMonthIndex = monthTabs.findIndex(
    (month) => month.key === selectedMonth
  );

  const moveMonth = (direction) => {
    if (monthTabs.length === 0) return;

    const currentIndex = selectedMonthIndex === -1 ? 0 : selectedMonthIndex;
    const nextIndex = currentIndex + direction;

    if (nextIndex < 0 || nextIndex >= monthTabs.length) return;

    setSelectedMonth(monthTabs[nextIndex].key);
    setVisibleCount(8);
  };

  const resetFilters = () => {
    setKeyword("");
    setSelectedRegion("");
    setSelectedGrade("");
    setSelectedStatus("");
    setVisibleCount(8);

    if (monthTabs.length > 0) {
      setSelectedMonth(monthTabs[0].key);
    } else {
      setSelectedMonth("");
    }
  };

  const activeFilterCount = [
    keyword,
    selectedRegion,
    selectedGrade,
    selectedStatus,
  ].filter(Boolean).length;

  return (
    <div className="tournament-search-page">
      <section className="tournament-search-hero">
        <div className="tournament-search-hero-copy">
          <p>TOURNAMENTS</p>
          <h1>大会を探す</h1>
        </div>
      </section>

      <section className="tournament-month-tabs">
        <button
          type="button"
          className="month-arrow"
          onClick={() => moveMonth(-1)}
          disabled={selectedMonthIndex <= 0}
        >
          ‹
        </button>

        <div className="month-tab-scroll">
          {monthTabs.map((month) => (
            <button
              type="button"
              key={month.key}
              className={`month-tab ${
                selectedMonth === month.key ? "active" : ""
              }`}
              onClick={() => {
                setSelectedMonth(month.key);
                setVisibleCount(8);
              }}
            >
              <strong>{month.label}</strong>
              <span>{month.count}件</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="month-arrow"
          onClick={() => moveMonth(1)}
          disabled={
            selectedMonthIndex === -1 ||
            selectedMonthIndex >= monthTabs.length - 1
          }
        >
          ›
        </button>
      </section>

      <section className="filter-accordion">
        <button
          type="button"
          className="filter-accordion-button"
          onClick={() => setIsFilterOpen((current) => !current)}
        >
          <span>検索・絞り込み</span>

          {activeFilterCount > 0 && (
            <strong>{activeFilterCount}件の条件</strong>
          )}

          <em className="filter-accordion-toggle">
            <span className="filter-accordion-toggle-text">
              {isFilterOpen ? "閉じる " : "開く "}
            </span>
            <span className="filter-accordion-toggle-icon" aria-hidden="true">
              ▼
            </span>
          </em>
        </button>

        {isFilterOpen && (
          <div className="tournament-filter-panel">
            <input
              className="tournament-keyword-input"
              placeholder="大会名・会場・級で検索"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setVisibleCount(8);
              }}
            />

            <select
              value={selectedRegion}
              onChange={(event) => {
                setSelectedRegion(event.target.value);
                setVisibleCount(8);
              }}
            >
              {REGION_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={selectedGrade}
              onChange={(event) => {
                setSelectedGrade(event.target.value);
                setVisibleCount(8);
              }}
            >
              {GRADE_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(event) => {
                setSelectedStatus(event.target.value);
                setVisibleCount(8);
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="filter-reset-button"
              onClick={resetFilters}
            >
              リセット
            </button>
          </div>
        )}
      </section>

      {message && <p className="error-text">{message}</p>}

      {loading ? (
        <div className="empty-card">読み込み中...</div>
      ) : filteredTournaments.length === 0 ? (
        <div className="empty-card">表示できる大会がありません。</div>
      ) : (
        <section className="tournament-date-list">
          {groupedTournaments.map((group) => (
            <div className="tournament-date-group" key={group.date}>
              <h2 className="tournament-date-heading">
                <span>▣</span>
                {formatDate(group.date)}
              </h2>

              <div className="tournament-list-stack">
                {group.items.map((tournament) => {
                  const grade = getTournamentGrade(tournament);
                  const deadline = getTournamentDeadline(tournament);

                  return (

                    <article
                      className="tournament-list-item tournament-list-clickable"
                      key={tournament.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/tournaments/${tournament.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/tournaments/${tournament.id}`);
                        }
                      }}
                    >
                      <div className="tournament-list-main">
                        <h3>{tournament.title}</h3>

                        <div className="tournament-list-meta">
                          <div className="tournament-status-row">
                            <span className={`tournament-inline-status status-${tournament.status}`}>
                              {STATUS_LABEL[tournament.status] || tournament.status}
                              {deadline && tournament.status === "published" && (
                                <>（{formatShortDate(deadline)}まで）</>
                              )}
                            </span>
                          </div>

                          <div className="tournament-place-grade-row">
                            <span className="tournament-grade">
                              級：{grade || "未設定"}
                            </span>

                            <span className="tournament-venue">
                              ● {tournament.venue || "会場未設定"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="tournament-card-arrow">›</span>
                    </article>


                  );
                })}
              </div>
            </div>
          ))}

          {visibleCount < filteredTournaments.length && (
            <button
              type="button"
              className="load-more-tournaments"
              onClick={() => setVisibleCount((current) => current + 8)}
            >
              さらに先の大会を表示
              <span>⌄</span>
            </button>
          )}
        </section>
      )}

      <footer className="site-footer">
        <div className="footer-main">
          <div>
            <div className="footer-logo">
              <span className="footer-logo-image" aria-hidden="true" />
              <div>
                <strong>まにまに</strong>
                <small>大会申込システム</small>
              </div>
            </div>

            <p className="footer-description">
              競技かるたの大会情報確認から申込状況の管理までを、
              もっとわかりやすく、もっとスムーズに。
            </p>
          </div>

          <div className="footer-links">
            <div>
              <h3>サイト</h3>
              <button type="button" onClick={() => navigate("/")}>
                ホーム
              </button>
              <button type="button" onClick={() => navigate("/tournaments")}>
                大会一覧
              </button>
              <button type="button" onClick={() => navigate("/notices")}>
                お知らせ
              </button>
            </div>

            <div>
              <h3>会員メニュー</h3>
              <button
                type="button"
                onClick={() => navigate("/applications/status")}
              >
                申込状況確認
              </button>
              <button type="button" onClick={() => navigate("/mypage")}>
                マイページ
              </button>
              <button type="button" onClick={() => navigate("/login")}>
                ログイン
              </button>
            </div>

            <div>
              <h3>その他</h3>
              <button type="button">利用規約</button>
              <button type="button">プライバシーポリシー</button>
              <button type="button">お問い合わせ</button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 まにまに</span>
          <span>競技かるた大会申込システム</span>
        </div>
      </footer>
    </div>
  );
}