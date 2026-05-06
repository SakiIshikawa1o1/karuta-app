// src/pages/ApplicationAdminPage.jsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const STATUS_LABEL = {
  applied: "申込済み",
  cancelled: "キャンセル済み",
  lottery: "抽選中",
  lottery_wait: "抽選中",
  not_selected: "落選",
  selected: "当選・未入金",
  paid: "入金済み",
  payment_checking: "入金確認中",
  payment_confirmed: "入金確認済み",
  confirmed: "入金確認済み",
};

const STATUS_CLASS = {
  applied: "status-applied",
  cancelled: "status-cancelled",
  lottery: "status-lottery",
  lottery_wait: "status-lottery",
  not_selected: "status-not-selected",
  selected: "status-selected",
  paid: "status-paid",
  payment_checking: "status-payment-checking",
  payment_confirmed: "status-payment-confirmed",
  confirmed: "status-payment-confirmed",
};

const STATUS_OPTIONS = [
  { value: "applied", label: "申込済み" },
  { value: "cancelled", label: "キャンセル済み" },
  { value: "lottery", label: "抽選中" },
  { value: "not_selected", label: "落選" },
  { value: "selected", label: "当選・未入金" },
  { value: "paid", label: "入金済み" },
  { value: "payment_checking", label: "入金確認中" },
  { value: "payment_confirmed", label: "入金確認済み" },
];

function normalizeStatus(status) {
  if (status === "lottery_wait") return "lottery";
  if (status === "confirmed") return "payment_confirmed";
  return status;
}

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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10.5 3a7.5 7.5 0 0 1 5.93 12.09l4.24 4.24-1.34 1.34-4.24-4.24A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 2h6l1 2h3v18H5V4h3l1-2Zm1.2 3h3.6l-.5-1h-2.6l-.5 1ZM8 9h8v2H8V9Zm0 4h8v2H8v-2Zm0 4h5v2H8v-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function KanaIcon() {
  return <span className="application-admin-kana-icon">あ</span>;
}

export default function ApplicationAdminPage() {
  const { user } = useAuth();

  const [applications, setApplications] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");

  const [nameKeyword, setNameKeyword] = useState("");
  const [kanaKeyword, setKanaKeyword] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [appliedSearch, setAppliedSearch] = useState({
    name: "",
    kana: "",
  });

  const [pendingStatuses, setPendingStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedTournament = useMemo(() => {
    return tournaments.find((t) => t.id === selectedTournamentId);
  }, [tournaments, selectedTournamentId]);

  const filteredApplications = useMemo(() => {
    const name = appliedSearch.name.trim().toLowerCase();
    const kana = appliedSearch.kana.trim().toLowerCase();

    return applications.filter((app) => {
      const applicantName = app.applicant_name ?? "";
      const organization = app.organization ?? "";

      const matchesName =
        !name ||
        applicantName.toLowerCase().includes(name) ||
        organization.toLowerCase().includes(name);

      const matchesKana =
        !kana || applicantName.toLowerCase().includes(kana);

      return matchesName && matchesKana;
    });
  }, [applications, appliedSearch]);

  const pendingCount = useMemo(() => {
    return applications.filter((app) => {
      const nextStatus = pendingStatuses[app.id];
      if (!nextStatus) return false;
      return nextStatus !== normalizeStatus(app.status);
    }).length;
  }, [applications, pendingStatuses]);

  const fetchTournaments = async () => {
    const { data, error } = await supabase
      .from("tournaments")
      .select("id, title, event_date, venue")
      .order("event_date", { ascending: false });

    if (error) {
      setMessage(`大会一覧の取得に失敗しました：${error.message}`);
      return;
    }

    setTournaments(data ?? []);

    if (!selectedTournamentId && data && data.length > 0) {
      setSelectedTournamentId(data[0].id);
    }
  };

  const fetchApplications = async (tournamentId = selectedTournamentId) => {
    setLoading(true);
    setMessage("");
    setPendingStatuses({});

    let query = supabase
      .from("applications")
      .select(`
        id,
        applicant_name,
        organization,
        grade,
        division,
        notes,
        status,
        applied_at,
        cancelled_at,
        tournaments (
          id,
          title,
          event_date,
          venue
        )
      `)
      .order("applied_at", { ascending: false });

    if (tournamentId) {
      query = query.eq("tournament_id", tournamentId);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      setMessage(`申込一覧の取得に失敗しました：${error.message}`);
      return;
    }

    setApplications(data ?? []);
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    fetchApplications(selectedTournamentId);
  }, [selectedTournamentId]);

  const handleSearch = () => {
    setAppliedSearch({
      name: nameKeyword,
      kana: kanaKeyword,
    });
  };

  const handleClearSearch = () => {
    setNameKeyword("");
    setKanaKeyword("");
    setAppliedSearch({
      name: "",
      kana: "",
    });
  };

  const handleStatusChange = (applicationId, nextStatus) => {
    setPendingStatuses((prev) => ({
      ...prev,
      [applicationId]: nextStatus,
    }));
  };

  const handleSaveChanges = async () => {
    const changes = applications
      .map((app) => {
        const nextStatus = pendingStatuses[app.id];
        const currentStatus = normalizeStatus(app.status);

        if (!nextStatus || nextStatus === currentStatus) return null;

        return {
          application: app,
          oldStatus: app.status,
          newStatus: nextStatus,
        };
      })
      .filter(Boolean);

    if (changes.length === 0) {
      setMessage("変更されたステータスはありません。");
      return;
    }

    const ok = window.confirm(`${changes.length}件の変更内容を保存しますか？`);
    if (!ok) return;

    setSaving(true);
    setMessage("");

    for (const change of changes) {
      const { application, oldStatus, newStatus } = change;

      const { error } = await supabase
        .from("applications")
        .update({
          status: newStatus,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
          cancelled_at:
            newStatus === "cancelled"
              ? new Date().toISOString()
              : application.cancelled_at,
        })
        .eq("id", application.id);

      if (error) {
        setSaving(false);
        setMessage(`ステータス更新に失敗しました：${error.message}`);
        return;
      }

      const { error: logError } = await supabase
        .from("application_status_logs")
        .insert({
          application_id: application.id,
          old_status: oldStatus,
          new_status: newStatus,
          changed_by: user?.id,
          comment: "申し込み管理者によるステータス一括変更",
        });

      if (logError) {
        console.error(logError);
      }
    }

    setApplications((prev) =>
      prev.map((app) => {
        const nextStatus = pendingStatuses[app.id];

        if (!nextStatus || nextStatus === normalizeStatus(app.status)) {
          return app;
        }

        return {
          ...app,
          status: nextStatus,
          cancelled_at:
            nextStatus === "cancelled"
              ? new Date().toISOString()
              : app.cancelled_at,
        };
      })
    );

    setPendingStatuses({});
    setSaving(false);
    setMessage(`${changes.length}件の変更内容を保存しました。`);
  };

  const exportApplicationsCsv = () => {
    if (filteredApplications.length === 0) {
      setMessage("エクスポートできる申込者がいません。");
      return;
    }

    const headers = ["氏名", "所属会", "段位", "参加区分", "申込状況", "備考"];

    const rows = filteredApplications.map((app) => {
      const status = pendingStatuses[app.id] || normalizeStatus(app.status);

      return [
        app.applicant_name || "",
        app.organization || "",
        app.grade || "",
        app.division || "",
        STATUS_LABEL[status] || status,
        app.notes || "",
      ];
    });

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fileName = selectedTournament?.title
      ? `${selectedTournament.title}_申込者一覧.csv`
      : "申込者一覧.csv";

    a.href = url;
    a.download = fileName;
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="application-admin-page">
      <section className="application-admin-hero">
        <div className="application-admin-hero-icon">
          <ClipboardIcon />
        </div>

        <div>
          <h1>申し込み管理</h1>
          <p>大会の申込状況を確認・更新できます。</p>
        </div>
      </section>

      {message && <p className="application-admin-message">{message}</p>}

      <section className="application-admin-panel tournament-select-panel">
        <h2>大会を選択</h2>

        <div className="application-admin-tournament-select compact">
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
          >
            <option value="">すべての大会</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}（{formatDate(t.event_date)}）
              </option>
            ))}
          </select>
        </div>

        <div className="application-admin-export-row">
          <button type="button" onClick={exportApplicationsCsv}>
            エクスポート
          </button>
        </div>
      </section>

      <section className="application-admin-panel search-panel-modern">
        <button
          type="button"
          className={`application-admin-search-toggle ${
            searchOpen ? "is-open" : ""
          }`}
          onClick={() => setSearchOpen((prev) => !prev)}
        >
          <div className="application-admin-section-title">
            <SearchIcon />
            <h2>人名で検索</h2>
          </div>

          <span>{searchOpen ? "閉じる" : "開く"}</span>
        </button>

        {searchOpen && (
          <div className="application-admin-search-body">
            <div className="application-admin-search-grid">
              <label>
                氏名（部分一致）
                <div className="application-admin-input-with-icon">
                  <UserIcon />
                  <input
                    value={nameKeyword}
                    onChange={(e) => setNameKeyword(e.target.value)}
                    placeholder="例）山田 太郎"
                  />
                </div>
              </label>

              <label>
                ふりがな（部分一致）
                <div className="application-admin-input-with-icon">
                  <KanaIcon />
                  <input
                    value={kanaKeyword}
                    onChange={(e) => setKanaKeyword(e.target.value)}
                    placeholder="例）やまだ たろう"
                  />
                </div>
              </label>
            </div>

            <button
              type="button"
              className="application-admin-search-button"
              onClick={handleSearch}
            >
              <SearchIcon />
              検索
            </button>

            <div className="application-admin-clear-row">
              <button type="button" onClick={handleClearSearch}>
                検索条件をクリア
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="application-admin-panel application-admin-list-panel">
        <div className="application-admin-list-header">
          <h2>申込者一覧</h2>
          <span>{filteredApplications.length}件</span>
        </div>

        {loading ? (
          <div className="application-admin-empty">読み込み中...</div>
        ) : filteredApplications.length === 0 ? (
          <div className="application-admin-empty">申込者がいません。</div>
        ) : (
          <div className="application-admin-table-card">
            <div className="application-admin-table-scroll">
              <table className="application-admin-table">
                <thead>
                  <tr>
                    <th>氏名 ↕</th>
                    <th>所属会 ↕</th>
                    <th>段位 ↕</th>
                    <th>申込状況 ↕</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredApplications.map((app) => {
                    const currentStatus =
                      pendingStatuses[app.id] || normalizeStatus(app.status);

                    const statusClass = STATUS_CLASS[currentStatus] || "";
                    const isChanged =
                      currentStatus !== normalizeStatus(app.status);

                    return (
                      <tr
                        key={app.id}
                        className={isChanged ? "is-changed" : ""}
                      >
                        <td>{app.applicant_name || "未入力"}</td>
                        <td>{app.organization || "未入力"}</td>
                        <td>{app.grade || "未入力"}</td>
                        <td>
                          <select
                            className={`application-admin-status-select ${statusClass}`}
                            value={currentStatus}
                            onChange={(e) =>
                              handleStatusChange(app.id, e.target.value)
                            }
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="application-admin-table-note">
              <span>‹</span>
              横にスワイプして他の列を表示
              <span>›</span>
            </div>
          </div>
        )}
      </section>

      <div className="application-admin-save-area">
        <button
          type="button"
          onClick={handleSaveChanges}
          disabled={saving || pendingCount === 0}
        >
          {saving
            ? "保存中..."
            : pendingCount > 0
            ? `変更内容を保存する（${pendingCount}件）`
            : "変更内容を保存する"}
        </button>
      </div>
    </div>
  );
}