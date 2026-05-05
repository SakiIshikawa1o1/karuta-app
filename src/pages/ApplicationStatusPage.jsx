import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import SiteFooter from "../components/SiteFooter";

const STATUS_LABEL = {
  applied: "申込済み",
  cancelled: "キャンセル済み",
  lottery: "抽選中",
  not_selected: "落選",
  selected: "当選・未入金",
  paid: "入金済み",
  payment_checking: "入金確認中",
  payment_confirmed: "入金確認済み",
};

const STATUS_CLASS = {
  applied: "status-applied",
  cancelled: "status-cancelled",
  lottery: "status-lottery",
  not_selected: "status-not-selected",
  selected: "status-selected",
  paid: "status-paid",
  payment_checking: "status-payment-checking",
  payment_confirmed: "status-payment-confirmed",
};

const STATUS_TABS = [
  {
    key: "all",
    label: "すべて",
    statuses: [
      "applied",
      "lottery",
      "not_selected",
      "selected",
      "paid",
      "payment_checking",
      "payment_confirmed",
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
    statuses: ["lottery", "not_selected"],
  },
  {
    key: "payment",
    label: "振り込み",
    statuses: ["selected", "paid", "payment_checking"],
  },
  {
    key: "confirmed",
    label: "確定",
    statuses: ["payment_confirmed"],
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

  const fetchApplications = async () => {
    if (!user) {
      setApplications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("applications")
      .select(`
        id,
        status,
        applied_at,
        applicant_name,
        tournaments (
          id,
          title,
          event_date,
          venue
        )
      `)
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .order("applied_at", { ascending: false });

    setLoading(false);

    if (error) {
      setMessage(`申し込み状況の取得に失敗しました：${error.message}`);
      return;
    }

    const sortedData = [...(data ?? [])].sort((a, b) => {
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
      const venue = app.tournaments?.venue ?? "";

      const matchesTab = activeStatuses.includes(app.status);

      const matchesSearch =
        searchText.trim() === "" ||
        title.toLowerCase().includes(searchText.toLowerCase()) ||
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
        updated_at: new Date().toISOString(),
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

                  <h2>{tournament?.title ?? "大会名未設定"}</h2>

                  <div className="application-status-date-block">
                    <span className="application-status-date-label">
                      開催日
                    </span>
                    <span className="application-status-date-value">
                      {formatDate(tournament?.event_date)}
                    </span>
                  </div>
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

                  {app.status === "selected" && (
                    <button
                      type="button"
                      className="application-status-action-button paid"
                      onClick={(event) =>
                        updateApplicationStatus(event, app, "paid")
                      }
                    >
                      入金済み
                    </button>
                  )}

                  {app.status === "payment_checking" && (
                    <button
                      type="button"
                      className="application-status-action-button back-unpaid"
                      onClick={(event) =>
                        updateApplicationStatus(event, app, "selected")
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