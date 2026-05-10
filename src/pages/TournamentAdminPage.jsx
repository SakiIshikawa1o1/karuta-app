// src/pages/TournamentAdminPage.jsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ROLE } from "../utils/roles";

const STATUS_TABS = [
  {
    key: "scheduled",
    label: "開催予定",
    statuses: ["preparing", "published"],
  },
  {
    key: "draft",
    label: "下書き",
    statuses: ["draft"],
  },
  {
    key: "closed",
    label: "終了済み",
    statuses: ["closed"],
  },
];

function formatDate(dateString) {
  if (!dateString) return "日程未定";

  const [year, month, day] = dateString.split("-").map(Number);
  return `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(
    2,
    "0"
  )}`;
}

function getTournamentGrade(tournament) {
  const labels = [
    tournament.allow_class_a && "A級",
    tournament.allow_class_b && "B級",
    tournament.allow_class_c && "C級",
    tournament.allow_class_d && "D級",
    tournament.allow_class_e && "E級",
    tournament.allow_class_f && "F級",
  ].filter(Boolean);

  return labels.length > 0 ? labels.join("・") : "級未設定";
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

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MedalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2a5 5 0 0 0-3 9v4.8l3-1.8 3 1.8V11a5 5 0 0 0-3-9Zm0 7.2a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4ZM7 22l5-3 5 3v-8.2l-5-3-5 3V22Z"
        fill="currentColor"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 17.5V21h3.5L18.1 10.4l-3.5-3.5L4 17.5ZM20.7 7.8a1 1 0 0 0 0-1.4l-2.1-2.1a1 1 0 0 0-1.4 0l-1.5 1.5 3.5 3.5 1.5-1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5ZM9 11h8v2H9v-2Zm0 4h8v2H9v-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" fill="currentColor" />
    </svg>
  );
}

export default function TournamentAdminPage() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  const [tournaments, setTournaments] = useState([]);
  const [activeTab, setActiveTab] = useState("scheduled");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const isSystemAdmin =
    typeof hasRole === "function" ? hasRole(ROLE.SYSTEM_ADMIN) : false;

  const fetchTournaments = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    let query = supabase
      .from("tournaments")
      .select("*")
      .order("event_date", { ascending: true });

    if (!isSystemAdmin) {
      query = query.eq("created_by", user.id);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      setMessage(`大会一覧の取得に失敗しました：${error.message}`);
      return;
    }

    setTournaments(data ?? []);
  };

  useEffect(() => {
    fetchTournaments();
  }, [user, isSystemAdmin]);

  const tabCounts = useMemo(() => {
    return STATUS_TABS.reduce((acc, tab) => {
      acc[tab.key] = tournaments.filter((t) =>
        tab.statuses.includes(t.status)
      ).length;
      return acc;
    }, {});
  }, [tournaments]);

  const filteredTournaments = useMemo(() => {
    const tab = STATUS_TABS.find((item) => item.key === activeTab);

    if (!tab) return tournaments;

    return tournaments.filter((t) => tab.statuses.includes(t.status));
  }, [tournaments, activeTab]);

  const goEdit = (tournamentId) => {
    navigate("/admin/tournament/edit", {
      state: {
        tournamentId,
      },
    });
  };

  const goRequirement = (tournamentId) => {
    navigate(`/tournaments/${tournamentId}`);
  };

  return (
    <div className="tournament-admin-page">
      <section className="tournament-admin-hero">
        <div className="tournament-admin-hero-icon">
          <ClipboardIcon />
        </div>

        <div>
          <h1>大会管理</h1>
          <p>大会の作成・編集、申込状況の確認、要項の管理ができます。</p>
        </div>
      </section>

      {message && <p className="tournament-admin-message">{message}</p>}

      <section className="tournament-admin-tabs">
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

      <div className="tournament-admin-action-row">
        <button
          type="button"
          className="tournament-admin-add-button"
          onClick={() => navigate("/admin/tournament/new")}
        >
          <PlusIcon />
          大会を追加
        </button>
      </div>

      {loading ? (
        <div className="tournament-admin-empty">読み込み中...</div>
      ) : filteredTournaments.length === 0 ? (
        <div className="tournament-admin-empty">対象の大会がありません。</div>
      ) : (
        <section className="tournament-admin-list">
          {filteredTournaments.map((t) => (
            <article className="tournament-admin-card" key={t.id}>
              <div className="tournament-admin-card-main">
                <h2>{t.title}</h2>

                <div className="tournament-admin-card-meta">
                  <p>
                    <PinIcon />
                    <span>場所：{t.venue || "会場未定"}</span>
                  </p>

                  <p>
                    <MedalIcon />
                    <span>級：{getTournamentGrade(t)}</span>
                  </p>
                </div>

                <div className="tournament-admin-card-buttons">
                  <button type="button" onClick={() => goEdit(t.id)}>
                    <EditIcon />
                    編集する
                  </button>

                  <button type="button" onClick={() => goRequirement(t.id)}>
                    <DocumentIcon />
                    要項確認
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
