import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import SiteFooter from "../components/SiteFooter";

const STATUS_LABEL = {
  draft: "下書き",
  preparing: "準備中",
  published: "受付中",
  closed: "受付終了",
};

const STATUS_OPTIONS = [
  { value: "", label: "すべての受付状態" },
  { value: "preparing", label: "準備中" },
  { value: "published", label: "受付中" },
  { value: "closed", label: "受付終了" },
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

function formatShortDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatMonthKey(value) {
  if (!value) return "未定";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未定";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function normalizeClassCode(code) {
  if (!code) return "";

  return String(code)
    .trim()
    .replace("級", "")
    .toLowerCase();
}

function getAllowedClassColumn(classCode) {
  const normalizedCode = normalizeClassCode(classCode);

  if (!normalizedCode) return "";

  return `allow_class_${normalizedCode}`;
}

function isTournamentAllowedForClass(tournament, classCode) {
  const columnName = getAllowedClassColumn(classCode);

  if (!columnName) return true;

  return tournament[columnName] === true;
}

function getAllowedClassLabels(tournament, classLevels) {
  return classLevels
    .filter((classLevel) =>
      isTournamentAllowedForClass(tournament, classLevel.code)
    )
    .map((classLevel) => classLevel.name || `${classLevel.code}級`)
    .join("・");
}

/**
 * DB上のstatusではなく、画面上で扱う実質ステータスを返す
 *
 * draft      → 下書き
 * preparing  → 準備中
 * published  → 締切前なら受付中、締切後なら受付終了
 * closed     → 受付終了
 */
function getEffectiveStatus(tournament) {
  if (!tournament) return "";

  if (tournament.status === "draft") {
    return "draft";
  }

  if (tournament.status === "preparing") {
    return "preparing";
  }

  if (tournament.status === "closed") {
    return "closed";
  }

  if (tournament.status === "published" && tournament.application_deadline) {
    const now = new Date();
    const deadline = new Date(tournament.application_deadline);

    if (!Number.isNaN(deadline.getTime()) && now > deadline) {
      return "closed";
    }
  }

  return tournament.status;
}

function getStatusLabel(tournament) {
  const effectiveStatus = getEffectiveStatus(tournament);
  const statusLabel = STATUS_LABEL[effectiveStatus] || effectiveStatus;

  if (
    effectiveStatus === "published" &&
    tournament.application_deadline
  ) {
    return `${statusLabel}（${formatShortDate(
      tournament.application_deadline
    )}まで）`;
  }

  return statusLabel;
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
  const [classLevels, setClassLevels] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedClassCode, setSelectedClassCode] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setMessage("");

      const [tournamentsResult, classLevelsResult] = await Promise.all([
        supabase
          .from("tournaments")
          .select("*")
          .neq("status", "draft")
          .order("event_date", { ascending: true }),

        supabase
          .from("class_levels")
          .select("id, code, name, sort_order, is_active")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);

      setLoading(false);

      if (tournamentsResult.error) {
        setMessage(
          `大会一覧の取得に失敗しました: ${tournamentsResult.error.message}`
        );
        return;
      }

      if (classLevelsResult.error) {
        setMessage(
          `級マスタの取得に失敗しました: ${classLevelsResult.error.message}`
        );
        return;
      }

      const tournamentList = tournamentsResult.data ?? [];
      const classLevelList = classLevelsResult.data ?? [];

      setTournaments(tournamentList);
      setClassLevels(classLevelList);

      const tabs = buildMonthTabs(tournamentList);
      if (tabs.length > 0) {
        setSelectedMonth(tabs[0].key);
      }
    };

    fetchInitialData();
  }, []);

  const monthTabs = useMemo(() => buildMonthTabs(tournaments), [tournaments]);

  const filteredTournaments = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return tournaments.filter((tournament) => {
      const title = tournament.title || "";
      const venue = tournament.venue || "";
      const allowedClassLabels = getAllowedClassLabels(
        tournament,
        classLevels
      );
      const monthKey = formatMonthKey(tournament.event_date);
      const effectiveStatus = getEffectiveStatus(tournament);

      const matchesKeyword =
        !normalizedKeyword ||
        title.toLowerCase().includes(normalizedKeyword) ||
        venue.toLowerCase().includes(normalizedKeyword) ||
        allowedClassLabels.toLowerCase().includes(normalizedKeyword);

      const matchesMonth = !selectedMonth || monthKey === selectedMonth;

      const matchesStatus =
        !selectedStatus || effectiveStatus === selectedStatus;

      const matchesClass =
        !selectedClassCode ||
        isTournamentAllowedForClass(tournament, selectedClassCode);

      return matchesKeyword && matchesMonth && matchesStatus && matchesClass;
    });
  }, [
    tournaments,
    classLevels,
    keyword,
    selectedMonth,
    selectedStatus,
    selectedClassCode,
  ]);

  const groupedTournaments = useMemo(
    () => Array.from(groupByDate(filteredTournaments).entries()),
    [filteredTournaments]
  );

  const activeFilterCount = [
    keyword,
    selectedStatus,
    selectedClassCode,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setKeyword("");
    setSelectedStatus("");
    setSelectedClassCode("");
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
                className={
                  selectedMonth === month.key ? "month-tab active" : "month-tab"
                }
                onClick={() => {
                  setSelectedMonth(month.key);
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
              }}
              placeholder="大会名・会場・級で検索"
            />

            <select
              value={selectedStatus}
              onChange={(event) => {
                setSelectedStatus(event.target.value);
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={selectedClassCode}
              onChange={(event) => {
                setSelectedClassCode(event.target.value);
              }}
            >
              <option value="">すべての級</option>
              {classLevels.map((classLevel) => (
                <option key={classLevel.id} value={classLevel.code}>
                  {classLevel.name}
                </option>
              ))}
            </select>

            <button
              className="filter-reset-button"
              type="button"
              onClick={clearFilters}
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
          {groupedTournaments.map(([dateLabel, dateTournaments]) => (
            <div className="tournament-date-group" key={dateLabel}>
              <h2 className="tournament-date-heading">
                <span>●</span>
                {dateLabel}
              </h2>

              <div className="tournament-list-stack">
                {dateTournaments.map((tournament) => {
                  const allowedClassLabels = getAllowedClassLabels(
                    tournament,
                    classLevels
                  );
                  const effectiveStatus = getEffectiveStatus(tournament);

                  return (
                    <article
                      className="tournament-list-item"
                      key={tournament.id}
                    >
                      <div className="tournament-list-main">
                        <h3>{tournament.title}</h3>

                        <div className="tournament-list-meta">
                          <span
                            className={`tournament-inline-status status-${effectiveStatus}`}
                          >
                            {getStatusLabel(tournament)}
                          </span>

                          <div className="tournament-place-grade-row">
                            <span className="tournament-venue">
                              場所：{tournament.venue || "会場未設定"}
                            </span>

                            {allowedClassLabels && (
                              <span className="tournament-grade">
                                級：{allowedClassLabels}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="tournament-list-actions">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/tournaments/${tournament.id}`)
                          }
                        >
                          詳細
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      <SiteFooter />
    </div>
  );
}
