import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import SiteFooter from "../components/SiteFooter";

const STATUS_LABEL = {
  draft: "準備中",
  published: "受付中",
  closed: "受付終了",
  cancelled: "中止",
};

const STATUS_OPTIONS = [
  { value: "", label: "すべての受付状態" },
  { value: "published", label: "受付中" },
  { value: "closed", label: "受付終了" },
  { value: "cancelled", label: "中止" },
  { value: "draft", label: "準備中" },
];

function formatDate(value) {
  if (!value) return "未設定";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}/${String(date.getDate()).padStart(2, "0")}`;
}

function formatMonthKey(value) {
  if (!value) return "未定";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未定";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getTournamentGrade(tournament) {
  return (
    tournament.grade ||
    tournament.target_grade ||
    tournament.eligible_grade ||
    tournament.eligible_grades ||
    tournament.class_level ||
    ""
  );
}

function buildMonthTabs(tournaments) {
  const months = new Map();

  tournaments.forEach((tournament) => {
    const key = formatMonthKey(tournament.event_date);
    if (key === "未定") return;

    if (!months.has(key)) {
      const date = new Date(`${key}-01T00:00:00`);
      months.set(key, {
        key,
        label: `${date.getMonth() + 1}月`,
        count: 0,
      });
    }

    months.get(key).count += 1;
  });

  return Array.from(months.values());
}

function groupByDate(tournaments) {
  return tournaments.reduce((groups, tournament) => {
    const key = formatDate(tournament.event_date);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(tournament);
    return groups;
  }, new Map());
}

export default function TournamentListPage() {
  const navigate = useNavigate();

  const [tournaments, setTournaments] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [visibleCount, setVisibleCount] = useState(8);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("event_date", { ascending: true });

      setLoading(false);

      if (error) {
        setMessage(`大会一覧の取得に失敗しました: ${error.message}`);
        return;
      }

      const list = data ?? [];
      setTournaments(list);

      const tabs = buildMonthTabs(list);
      if (tabs.length > 0) {
        setSelectedMonth(tabs[0].key);
      }
    };

    fetchTournaments();
  }, []);

  const monthTabs = useMemo(() => buildMonthTabs(tournaments), [tournaments]);

  const gradeOptions = useMemo(() => {
    return Array.from(
      new Set(tournaments.map(getTournamentGrade).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "ja"));
  }, [tournaments]);

  const filteredTournaments = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return tournaments.filter((tournament) => {
      const title = tournament.title || "";
      const venue = tournament.venue || "";
      const grade = getTournamentGrade(tournament);
      const monthKey = formatMonthKey(tournament.event_date);

      const matchesKeyword =
        !normalizedKeyword ||
        title.toLowerCase().includes(normalizedKeyword) ||
        venue.toLowerCase().includes(normalizedKeyword) ||
        grade.toLowerCase().includes(normalizedKeyword);

      const matchesMonth = !selectedMonth || monthKey === selectedMonth;
      const matchesStatus =
        !selectedStatus || tournament.status === selectedStatus;
      const matchesGrade = !selectedGrade || grade === selectedGrade;

      return matchesKeyword && matchesMonth && matchesStatus && matchesGrade;
    });
  }, [tournaments, keyword, selectedMonth, selectedStatus, selectedGrade]);

  const visibleTournaments = filteredTournaments.slice(0, visibleCount);
  const groupedTournaments = useMemo(
    () => Array.from(groupByDate(visibleTournaments).entries()),
    [visibleTournaments]
  );
  const activeFilterCount = [keyword, selectedStatus, selectedGrade].filter(Boolean).length;

  const clearFilters = () => {
    setKeyword("");
    setSelectedStatus("");
    setSelectedGrade("");
    setVisibleCount(8);
  };

  return (
    <div className="tournament-search-page">
      <section className="tournament-search-hero">
        <div className="tournament-search-hero-copy">
          <p>TOURNAMENTS</p>
          <h1>大会を探す</h1>
          <span>
            開催予定の大会を検索し、詳細情報や受付状況を確認できます。
          </span>
        </div>
      </section>

      {monthTabs.length > 0 && (
        <section className="tournament-month-tabs">
          <button className="month-arrow" type="button" disabled>
            ‹
          </button>
          <div className="month-tab-scroll">
            {monthTabs.map((month) => (
              <button
                type="button"
                key={month.key}
                className={selectedMonth === month.key ? "month-tab active" : "month-tab"}
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
          <button className="month-arrow" type="button" disabled>
            ›
          </button>
        </section>
      )}

      <section className="filter-accordion">
        <button
          type="button"
          className="filter-accordion-button"
          onClick={() => setIsFilterOpen((prev) => !prev)}
        >
          <span>検索・絞り込み</span>
          <strong>{activeFilterCount}件の条件</strong>
          <em>{isFilterOpen ? "閉じる" : "開く"}</em>
        </button>

        {isFilterOpen && (
          <div className="tournament-filter-panel">
            <input
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setVisibleCount(8);
              }}
              placeholder="大会名・会場・級で検索"
            />

            <select
              value={selectedStatus}
              onChange={(event) => {
                setSelectedStatus(event.target.value);
                setVisibleCount(8);
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
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
              <option value="">すべての級</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>

            <button className="filter-reset-button" type="button" onClick={clearFilters}>
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
          {groupedTournaments.map(([dateLabel, dateTournaments]) => (
            <div className="tournament-date-group" key={dateLabel}>
              <h2 className="tournament-date-heading">
                <span>●</span>
                {dateLabel}
              </h2>

              <div className="tournament-list-stack">
                {dateTournaments.map((tournament) => (
                  <article className="tournament-list-item" key={tournament.id}>
                    <div className="tournament-list-main">
                      <h3>{tournament.title}</h3>

                      <div className="tournament-list-meta">
                        <span className={`tournament-inline-status status-${tournament.status}`}>
                          {STATUS_LABEL[tournament.status] || tournament.status}
                        </span>
                        <span className="tournament-venue">
                          場所：{tournament.venue || "会場未設定"}
                        </span>
                        {getTournamentGrade(tournament) && (
                          <span className="tournament-grade">
                            級：{getTournamentGrade(tournament)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="tournament-list-actions">
                      <button
                        type="button"
                        onClick={() => navigate(`/tournaments/${tournament.id}`)}
                      >
                        詳細
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}

          {visibleCount < filteredTournaments.length && (
            <button
              type="button"
              className="load-more-tournaments"
              onClick={() => setVisibleCount((prev) => prev + 8)}
            >
              さらに先の大会を表示
              <span>›</span>
            </button>
          )}
        </section>
      )}

      <SiteFooter />
    </div>
  );
}
