import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import SiteFooter from "../components/SiteFooter";

const STATUS_LABEL = {
  applied: "申込済み",
  lottery: "抽選中",
  selected: "当選",
  rejected: "落選",
  payment_pending: "当選・未入金",
  payment_confirming: "入金確認中",
  payment_confirmed: "入金確認済み",
  confirmed: "参加確定",
  cancelled: "キャンセル済み",
};

const STATUS_CLASS = {
  applied: "status-applied",
  lottery: "status-lottery",
  selected: "status-selected",
  rejected: "status-not-selected",
  payment_pending: "status-selected",
  payment_confirming: "status-payment-checking",
  payment_confirmed: "status-payment-confirmed",
  confirmed: "status-payment-confirmed",
  cancelled: "status-cancelled",
};

const STATUS_TABS = [
  {
    key: "all",
    label: "すべて",
    statuses: [
      "applied",
      "lottery",
      "selected",
      "rejected",
      "payment_pending",
      "payment_confirming",
      "payment_confirmed",
      "confirmed",
    ],
  },
  {
    key: "applying",
    label: "申し込み中",
    statuses: ["applied"],
  },
  {
    key: "lottery",
    label: "抽選",
    statuses: ["lottery", "rejected"],
  },
  {
    key: "payment",
    label: "振り込み",
    statuses: ["selected", "payment_pending", "payment_confirming"],
  },
  {
    key: "confirmed",
    label: "確定",
    statuses: ["payment_confirmed", "confirmed"],
  },
];

function formatDate(dateString) {
  if (!dateString) return "日程未定";

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  return `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(
    2,
    "0"
  )}（${weekdays[date.getDay()]}）`;
}

function formatLastUpdated(date) {
  if (!date) return "未取得";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}/${month}/${day} ${hour}:${minute}`;
}

export default function ApplicationStatusPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [classLevels, setClassLevels] = useState([]);
  const [danRanks, setDanRanks] = useState([]);

  const fetchApplications = async () => {
    if (!user) {
      setApplications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const [applicationsResult, classLevelsResult, danRanksResult] =
      await Promise.all([
        supabase
      .from("applications")
      .select(`
        id,
        status,
        applied_at,
        applicant_name,
        tournament_title,
        class_level_id,
        dan_rank_id,
        tournaments (
          id,
          title,
          event_date,
          venue
        )
      `)
      .eq("user_id", user.id)
      .neq("status", "cancelled")
          .order("applied_at", { ascending: false }),
        supabase
          .from("class_levels")
          .select("id, name, sort_order")
          .order("sort_order", { ascending: true }),
        supabase
          .from("dan_ranks")
          .select("id, name, sort_order")
          .order("sort_order", { ascending: true }),
      ]);

    setLoading(false);

    if (applicationsResult.error) {
      setMessage(`申し込み状況の取得に失敗しました：${applicationsResult.error.message}`);
      return;
    }

    if (!classLevelsResult.error) setClassLevels(classLevelsResult.data ?? []);
    if (!danRanksResult.error) setDanRanks(danRanksResult.data ?? []);

    const sortedData = [...(applicationsResult.data ?? [])].sort((a, b) => {
      const dateA = a.tournaments?.event_date ?? "";
      const dateB = b.tournaments?.event_date ?? "";
      return dateA.localeCompare(dateB);
    });

    setApplications(sortedData);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    if (authLoading) return;
    fetchApplications();
  }, [authLoading, user]);

  const tabCounts = useMemo(() => {
    return STATUS_TABS.reduce((acc, tab) => {
      acc[tab.key] = applications.filter((app) =>
        tab.statuses.includes(app.status)
      ).length;
      return acc;
    }, {});
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const activeTabConfig = STATUS_TABS.find((tab) => tab.key === activeTab);
    const activeStatuses = activeTabConfig?.statuses ?? [];

    return applications.filter((app) => {
      const title = app.tournaments?.title ?? "";
      const snapshotTitle = app.tournament_title ?? "";
      const venue = app.tournaments?.venue ?? "";

      const matchesTab = activeStatuses.includes(app.status);

      const matchesSearch =
        searchText.trim() === "" ||
        title.toLowerCase().includes(searchText.toLowerCase()) ||
        snapshotTitle.toLowerCase().includes(searchText.toLowerCase()) ||
        venue.toLowerCase().includes(searchText.toLowerCase());

      return matchesTab && matchesSearch;
    });
  }, [applications, activeTab, searchText]);

  const updateApplicationStatus = async (event, application, nextStatus) => {
    event.stopPropagation();

    const statusText = STATUS_LABEL[nextStatus] ?? nextStatus;

    const ok = window.confirm(
      `「${application.tournaments?.title}」のステータスを「${statusText}」に変更しますか？`
    );

    if (!ok) return;

    const { error } = await supabase
      .from("applications")
      .update({
        status: nextStatus,
        updated_by: user.id,
      })
      .eq("id", application.id)
      .eq("user_id", user.id);

    if (error) {
      setMessage(`ステータス変更に失敗しました：${error.message}`);
      return;
    }

    if (nextStatus === "cancelled") {
      setApplications((prev) =>
        prev.filter((item) => item.id !== application.id)
      );
      setMessage("申し込みをキャンセルしました。");
      return;
    }

    setApplications((prev) =>
      prev.map((item) =>
        item.id === application.id ? { ...item, status: nextStatus } : item
      )
    );

    setMessage(`ステータスを「${statusText}」に変更しました。`);
  };

  const goToDetail = (tournamentId) => {
    if (!tournamentId) return;
    navigate(`/tournaments/${tournamentId}`);
  };

  return (
    <div className="application-status-page">
      <section className="application-status-hero">
        <div className="application-status-hero-copy">
          <p>APPLICATION STATUS</p>
          <h1>申込状況</h1>
          <span>お申し込みいただいた大会の状況を確認できます。</span>
        </div>
      </section>

      <section className="application-status-tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? "active" : ""}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.label}</span>
            <strong>{tabCounts[tab.key] ?? 0}</strong>
          </button>
        ))}
      </section>

      <section className="as-search-area">
        <div className="as-search-box">
          <span className="as-search-icon" aria-hidden="true">
            ⌕
          </span>

          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="大会名・会場名で検索"
            aria-label="大会名・会場名で検索"
          />

          {searchText && (
            <button
              type="button"
              className="as-search-clear"
              onClick={() => setSearchText("")}
            >
              クリア
            </button>
          )}
        </div>

        <div className="as-search-sub">
          <span>表示中：{filteredApplications.length}件</span>
          {searchText && <span>検索中：{searchText}</span>}
        </div>
      </section>

      {message && <p className="application-status-message">{message}</p>}

      {loading || authLoading ? (
        <div className="application-status-empty">読み込み中...</div>
      ) : applications.length === 0 ? (
        <div className="application-status-empty">
          現在、申し込み中の大会はありません。
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="application-status-empty">
          条件に一致する大会はありません。
        </div>
      ) : (
        <section className="application-status-list">
          {filteredApplications.map((app) => {
            const tournament = app.tournaments;
            const statusClass = STATUS_CLASS[app.status] ?? "";
            const classLevelName =
              classLevels.find((item) => item.id === app.class_level_id)?.name ||
              "";
            const danRankName =
              danRanks.find((item) => item.id === app.dan_rank_id)?.name || "";

            return (
              <article
                key={app.id}
                className="application-status-card"
                onClick={() => goToDetail(tournament?.id)}
              >
                <div className="application-status-card-main">
                  <div className="application-status-status-row">
                    <span className={`application-status-pill ${statusClass}`}>
                      {STATUS_LABEL[app.status] || app.status}
                    </span>
                  </div>

                  <h2>{tournament?.title ?? app.tournament_title ?? "大会名未設定"}</h2>

                  <div className="application-status-date-block">
                    <span className="application-status-date-label">
                      開催日
                    </span>
                    <span className="application-status-date-value">
                      {formatDate(tournament?.event_date)}
                    </span>
                  </div>

                  <div className="application-status-date-block">
                    <span className="application-status-date-label">
                      申込日時
                    </span>
                    <span className="application-status-date-value">
                      {formatLastUpdated(
                        app.applied_at ? new Date(app.applied_at) : null
                      )}
                    </span>
                  </div>

                  {(classLevelName || danRankName) && (
                    <div className="application-status-date-block">
                      <span className="application-status-date-label">
                        級・段位
                      </span>
                      <span className="application-status-date-value">
                        {[classLevelName, danRankName].filter(Boolean).join(" / ")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="application-status-card-side">
                  {app.status === "applied" && (
                    <button
                      type="button"
                      className="application-status-action-button cancel"
                      onClick={(event) =>
                        updateApplicationStatus(event, app, "cancelled")
                      }
                    >
                      キャンセル
                    </button>
                  )}

                  {app.status === "selected" || app.status === "payment_pending" ? (
                    <button
                      type="button"
                      className="application-status-action-button paid"
                      onClick={(event) =>
                        updateApplicationStatus(event, app, "payment_confirming")
                      }
                    >
                      入金確認依頼
                    </button>
                  ) : null}

                  {app.status === "payment_confirming" && (
                    <button
                      type="button"
                      className="application-status-action-button back-unpaid"
                      onClick={(event) =>
                        updateApplicationStatus(event, app, "payment_pending")
                      }
                    >
                      未入金に戻す
                    </button>
                  )}

                  <span className="application-status-chevron">›</span>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <div className="application-status-footer-note">
        <span>申込状況の反映には時間がかかる場合があります。</span>
        <button type="button" onClick={fetchApplications}>
          更新：{formatLastUpdated(lastUpdated)} ↻
        </button>
      </div>

      <SiteFooter />
    </div>
  );
}
