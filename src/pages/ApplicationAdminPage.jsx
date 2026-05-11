// src/pages/ApplicationAdminPage.jsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ROLE } from "../utils/roles";

const STATUS_LABEL = {
  applied: "申込済み",
  lottery: "抽選中",
  selected: "当選",
  rejected: "落選",
  payment_pending: "当選・未入金",
  payment_confirming: "入金確認中",
  confirmed: "参加確定",
  cancelled: "キャンセル済み",
};

const STATUS_CLASS = {
  applied: "status-applied",
  cancelled: "status-cancelled",
  lottery: "status-lottery",
  selected: "status-selected",
  rejected: "status-not-selected",
  payment_pending: "status-selected",
  payment_confirming: "status-payment-checking",
  confirmed: "status-payment-confirmed",
  cancelled: "status-cancelled",
};

const STATUS_OPTIONS = [
  { value: "applied", label: "申込済み" },
  { value: "lottery", label: "抽選中" },
  { value: "selected", label: "当選" },
  { value: "rejected", label: "落選" },
  { value: "payment_pending", label: "当選・未入金" },
  { value: "payment_confirming", label: "入金確認中" },
  { value: "confirmed", label: "参加確定" },
  { value: "cancelled", label: "キャンセル済み" },
];

function normalizeStatus(status) {
  if (status === "payment_confirmed") return "confirmed";
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
  const { user, profile, hasRole } = useAuth();
  const isSystemAdmin = hasRole(ROLE.SYSTEM_ADMIN);

  const [applications, setApplications] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [danRanks, setDanRanks] = useState([]);
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

  };

  const fetchApplications = async (tournamentId = selectedTournamentId) => {
    setLoading(true);
    setMessage("");
    setPendingStatuses({});

    const [classLevelsResult, danRanksResult] = await Promise.all([
      supabase
        .from("class_levels")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true }),
      supabase
        .from("dan_ranks")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true }),
    ]);

    if (!classLevelsResult.error) setClassLevels(classLevelsResult.data ?? []);
    if (!danRanksResult.error) setDanRanks(danRanksResult.data ?? []);

    let scopedUserIds = null;

    if (!isSystemAdmin) {
      if (!profile?.affiliation_id) {
        setApplications([]);
        setLoading(false);
        setMessage("所属会が設定されていないため、申込一覧を表示できません。");
        return;
      }

      const { data: sameAffiliationUsers, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("affiliation_id", profile.affiliation_id);

      if (profileError) {
        setApplications([]);
        setLoading(false);
        setMessage(`所属会ユーザーの取得に失敗しました：${profileError.message}`);
        return;
      }

      scopedUserIds = (sameAffiliationUsers ?? []).map((item) => item.id);

      if (scopedUserIds.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }
    }

    let query = supabase
      .from("applications")
      .select(`
        id,
        user_id,
        applicant_name,
        organization,
        class_level_id,
        dan_rank_id,
        user_email,
        school_name,
        tournament_title,
        notes,
        status,
        applied_at,
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

    if (scopedUserIds) {
      query = query.in("user_id", scopedUserIds);
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
  }, [selectedTournamentId, profile?.affiliation_id, isSystemAdmin]);

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
          created_at: new Date().toISOString(),
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

    const headers = ["氏名", "メール", "学校名", "所属会", "級", "段位", "申込状況", "備考"];

    const rows = filteredApplications.map((app) => {
      const status = pendingStatuses[app.id] || normalizeStatus(app.status);

      return [
        app.applicant_name || "",
        app.user_email || "",
        app.school_name || "",
        app.organization || "",
        classLevels.find((item) => item.id === app.class_level_id)?.name || "",
        danRanks.find((item) => item.id === app.dan_rank_id)?.name || "",
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
                    <th>メール</th>
                    <th>学校名</th>
                    <th>所属会 ↕</th>
                    <th>級 ↕</th>
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
                    const classLevelName =
                      classLevels.find((item) => item.id === app.class_level_id)
                        ?.name || "未入力";
                    const danRankName =
                      danRanks.find((item) => item.id === app.dan_rank_id)
                        ?.name || "未入力";

                    return (
                      <tr
                        key={app.id}
                        className={isChanged ? "is-changed" : ""}
                      >
                        <td>{app.applicant_name || "未入力"}</td>
                        <td>{app.user_email || "未入力"}</td>
                        <td>{app.school_name || "未入力"}</td>
                        <td>{app.organization || "未入力"}</td>
                        <td>{classLevelName}</td>
                        <td>{danRankName}</td>
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
