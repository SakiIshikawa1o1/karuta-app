// src/pages/TournamentEditPage.jsx

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ROLE } from "../utils/roles";

const STATUS_LABEL = {
  draft: "下書き",
  published: "公開",
  open: "受付中",
  closed: "受付終了",
  cancelled: "中止",
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9.2 16.6 4.9 12.3l-1.4 1.4 5.7 5.7L21 7.6l-1.4-1.4L9.2 16.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5ZM9 11h8v2H9v-2Zm0 4h8v2H9v-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3 7 8h3v6h4V8h3l-5-5ZM5 18h14v2H5v-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function sanitizeNumber(value) {
  if (!value) return null;
  const normalized = String(value).replaceAll(",", "");
  const number = Number(normalized);
  return Number.isNaN(number) ? null : number;
}

function formatDateInput(value) {
  if (!value) return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 10);
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

export default function TournamentEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasRole } = useAuth();

  const isSystemAdmin =
    typeof hasRole === "function" ? hasRole(ROLE.SYSTEM_ADMIN) : false;

  const initialTournamentId = location.state?.tournamentId || "";

  const [tournaments, setTournaments] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  const [form, setForm] = useState({
    title: "",
    event_date: "",
    venue: "",
    application_start_at: "",
    application_deadline: "",
    department_grade: "",
    capacity: "",
    entry_fee: "",
    description: "",
    address: "",
    status: "draft",
  });

  const [requirementFile, setRequirementFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedTournament = useMemo(() => {
    return tournaments.find((tournament) => tournament.id === selectedId);
  }, [tournaments, selectedId]);

  const resetForm = () => {
    setForm({
      title: "",
      event_date: "",
      venue: "",
      application_start_at: "",
      application_deadline: "",
      department_grade: "",
      capacity: "",
      entry_fee: "",
      description: "",
      address: "",
      status: "draft",
    });
    setRequirementFile(null);
  };

  const fillFormFromTournament = (selected) => {
    setForm({
      title: selected.title ?? "",
      event_date: formatDateInput(selected.event_date),
      venue: selected.venue ?? "",
      application_start_at: formatDateInput(
        selected.application_start_at ||
          selected.application_start_date ||
          selected.entry_start_date ||
          selected.apply_start_date
      ),
      application_deadline: formatDateInput(
        selected.application_deadline ||
          selected.application_end_date ||
          selected.entry_end_date ||
          selected.apply_end_date
      ),
      department_grade: getTournamentGrade(selected),
      capacity:
        selected.capacity === null || selected.capacity === undefined
          ? ""
          : String(selected.capacity),
      entry_fee:
        selected.entry_fee === null || selected.entry_fee === undefined
          ? ""
          : String(selected.entry_fee),
      description: selected.description ?? "",
      address: selected.address ?? "",
      status: selected.status ?? "draft",
    });
  };

  const fetchTournaments = async () => {
    if (!user) {
      setTournaments([]);
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
      setMessage(`大会取得に失敗しました：${error.message}`);
      return;
    }

    const tournamentList = data ?? [];
    setTournaments(tournamentList);

    const targetId =
      selectedId ||
      initialTournamentId ||
      tournamentList[0]?.id ||
      "";

    if (targetId) {
      const selected = tournamentList.find(
        (tournament) => tournament.id === targetId
      );

      if (selected) {
        setSelectedId(targetId);
        fillFormFromTournament(selected);
      }
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [user, isSystemAdmin]);

  const handleSelectTournament = (id) => {
    setSelectedId(id);
    setMessage("");

    if (!id) {
      resetForm();
      return;
    }

    const selected = tournaments.find((tournament) => tournament.id === id);

    if (!selected) {
      resetForm();
      setMessage("選択した大会が見つかりません。");
      return;
    }

    fillFormFromTournament(selected);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!selectedId) return "変更対象の大会を選択してください。";
    if (!form.title.trim()) return "大会名は必須です。";
    if (!form.event_date) return "開催日は必須です。";
    if (!form.venue.trim()) return "会場は必須です。";
    if (!form.application_start_at) return "申込開始日は必須です。";
    if (!form.application_deadline) return "申込締切日は必須です。";
    if (!form.department_grade) return "部門・級は必須です。";
    if (!form.capacity) return "定員は必須です。";
    if (!form.entry_fee) return "参加費は必須です。";

    const capacity = sanitizeNumber(form.capacity);
    const entryFee = sanitizeNumber(form.entry_fee);

    if (capacity !== null && capacity < 0) {
      return "定員は0以上で入力してください。";
    }

    if (entryFee !== null && entryFee < 0) {
      return "参加費は0以上で入力してください。";
    }

    if (
      form.application_start_at &&
      form.application_deadline &&
      new Date(form.application_start_at) > new Date(form.application_deadline)
    ) {
      return "申込開始日は申込締切日より前にしてください。";
    }

    return "";
  };

  const handleUpdate = async (nextStatus = form.status) => {
    setMessage("");

    const validationMessage = validateForm();

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setSaving(true);

    const updatePayload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      event_date: form.event_date,
      venue: form.venue.trim(),
      address: form.address.trim() || null,
      capacity: sanitizeNumber(form.capacity),
      entry_fee: sanitizeNumber(form.entry_fee),
      application_start_at: form.application_start_at || null,
      application_deadline: form.application_deadline || null,
      status: nextStatus,
      updated_by: user?.id,
      updated_at: new Date().toISOString(),

      // tournaments テーブルに grade カラムがない場合は、この1行を削除してください
      grade: form.department_grade,
    };

    const { error } = await supabase
      .from("tournaments")
      .update(updatePayload)
      .eq("id", selectedId);

    setSaving(false);

    if (error) {
      setMessage(`更新に失敗しました：${error.message}`);
      return;
    }

    setMessage("大会情報を更新しました。");
    alert("大会情報を更新しました。");

    await fetchTournaments();
    navigate("/admin/tournament");
  };

  return (
    <div className="tournament-edit-page">
      <section className="tournament-edit-hero">
        <div className="tournament-edit-hero-copy">
          <h1>大会情報を変更</h1>
          <p>
            登録済みの大会情報を編集できます。
            <br />
            変更後、「変更内容を保存する」ボタンで反映されます。
          </p>
        </div>
      </section>

      <section className="tournament-edit-card">
        {message && <p className="tournament-edit-message">{message}</p>}

        {loading ? (
          <div className="tournament-edit-empty">読み込み中...</div>
        ) : tournaments.length === 0 ? (
          <div className="tournament-edit-empty">
            <p>変更できる大会がありません。</p>
            <button
              type="button"
              onClick={() => navigate("/admin/tournament/new")}
            >
              大会を登録する
            </button>
          </div>
        ) : (
          <div className="tournament-edit-form">
            <div className="tournament-edit-row">
              <div className="tournament-edit-label">
                <span>変更対象</span>
                <strong>必須</strong>
              </div>

              <select
                value={selectedId}
                onChange={(e) => handleSelectTournament(e.target.value)}
              >
                <option value="">選択してください</option>
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.title}（
                    {STATUS_LABEL[tournament.status] || tournament.status}）
                  </option>
                ))}
              </select>
            </div>

            {selectedId && (
              <>
                <div className="tournament-edit-row">
                  <div className="tournament-edit-label">
                    <span>大会名</span>
                    <strong>必須</strong>
                  </div>

                  <input
                    value={form.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="大会名を入力してください"
                  />
                </div>

                <div className="tournament-edit-row">
                  <div className="tournament-edit-label">
                    <span>開催日</span>
                    <strong>必須</strong>
                  </div>

                  <input
                    type="date"
                    value={form.event_date}
                    onChange={(e) =>
                      handleChange("event_date", e.target.value)
                    }
                  />
                </div>

                <div className="tournament-edit-row">
                  <div className="tournament-edit-label">
                    <span>会場</span>
                    <strong>必須</strong>
                  </div>

                  <input
                    value={form.venue}
                    onChange={(e) => handleChange("venue", e.target.value)}
                    placeholder="会場名を入力してください"
                  />
                </div>

                <div className="tournament-edit-row">
                  <div className="tournament-edit-label">
                    <span>申込開始日</span>
                    <strong>必須</strong>
                  </div>

                  <input
                    type="date"
                    value={form.application_start_at}
                    onChange={(e) =>
                      handleChange("application_start_at", e.target.value)
                    }
                  />
                </div>

                <div className="tournament-edit-row">
                  <div className="tournament-edit-label">
                    <span>申込締切日</span>
                    <strong>必須</strong>
                  </div>

                  <input
                    type="date"
                    value={form.application_deadline}
                    onChange={(e) =>
                      handleChange("application_deadline", e.target.value)
                    }
                  />
                </div>

                <div className="tournament-edit-row">
                  <div className="tournament-edit-label">
                    <span>部門・級</span>
                    <strong>必須</strong>
                  </div>

                  <div>
                    <select
                      value={form.department_grade}
                      onChange={(e) =>
                        handleChange("department_grade", e.target.value)
                      }
                    >
                      <option value="">選択してください</option>
                      <option value="A級">A級</option>
                      <option value="B級">B級</option>
                      <option value="C級">C級</option>
                      <option value="D級">D級</option>
                      <option value="E級">E級</option>
                      <option value="全級">全級</option>
                    </select>

                    <p className="tournament-edit-help">
                      複数の部門・級を設定できます
                    </p>
                  </div>
                </div>

                <div className="tournament-edit-row">
                  <div className="tournament-edit-label">
                    <span>定員</span>
                    <strong>必須</strong>
                  </div>

                  <div className="tournament-edit-inline-input">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.capacity}
                      onChange={(e) =>
                        handleChange("capacity", e.target.value)
                      }
                      placeholder="例）100"
                    />
                    <span>人</span>
                  </div>
                </div>

                <div className="tournament-edit-row">
                  <div className="tournament-edit-label">
                    <span>参加費</span>
                    <strong>必須</strong>
                  </div>

                  <div className="tournament-edit-inline-input">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.entry_fee}
                      onChange={(e) =>
                        handleChange("entry_fee", e.target.value)
                      }
                      placeholder="例）2,000"
                    />
                    <span>円</span>
                  </div>
                </div>

                <div className="tournament-edit-row">
                  <div className="tournament-edit-label">
                    <span>大会概要</span>
                    <em>任意</em>
                  </div>

                  <div>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        handleChange("description", e.target.value)
                      }
                      maxLength={1000}
                      placeholder="大会の概要や見どころなどを入力してください"
                    />
                    <p className="tournament-edit-count">
                      {form.description.length} / 1000
                    </p>
                  </div>
                </div>

                <div className="tournament-edit-row">
                  <div className="tournament-edit-label">
                    <span>要項ファイル</span>
                    <em>任意</em>
                  </div>

                  <label className="tournament-edit-upload">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(e) =>
                        setRequirementFile(e.target.files?.[0] ?? null)
                      }
                    />
                    <UploadIcon />
                    <span>
                      {requirementFile
                        ? requirementFile.name
                        : "ファイルを選択 またはドラッグ＆ドロップ"}
                    </span>
                    <small>PDF・Word・Excel（最大10MB）</small>
                  </label>
                </div>

                <div className="tournament-edit-row">
                  <div className="tournament-edit-label">
                    <span>公開ステータス</span>
                    <strong>必須</strong>
                  </div>

                  <div className="tournament-edit-radio-list">
                    <label>
                      <input
                        type="radio"
                        name="status"
                        value="draft"
                        checked={form.status === "draft"}
                        onChange={(e) =>
                          handleChange("status", e.target.value)
                        }
                      />
                      <span>
                        非公開（下書き）
                        <small>大会はまだ公開されません</small>
                      </span>
                    </label>

                    <label>
                      <input
                        type="radio"
                        name="status"
                        value="published"
                        checked={
                          form.status === "published" || form.status === "open"
                        }
                        onChange={(e) =>
                          handleChange("status", e.target.value)
                        }
                      />
                      <span>
                        公開する
                        <small>大会ページが公開されます</small>
                      </span>
                    </label>

                    <label>
                      <input
                        type="radio"
                        name="status"
                        value="closed"
                        checked={form.status === "closed"}
                        onChange={(e) =>
                          handleChange("status", e.target.value)
                        }
                      />
                      <span>
                        受付終了
                        <small>新規申込を停止します</small>
                      </span>
                    </label>

                    <label>
                      <input
                        type="radio"
                        name="status"
                        value="cancelled"
                        checked={form.status === "cancelled"}
                        onChange={(e) =>
                          handleChange("status", e.target.value)
                        }
                      />
                      <span>
                        中止
                        <small>大会を中止扱いにします</small>
                      </span>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {selectedId && (
        <>
          <section className="tournament-edit-actions">
            <button
              type="button"
              className="tournament-edit-draft-button"
              disabled={saving}
              onClick={() => handleUpdate("draft")}
            >
              <FileIcon />
              下書き保存
            </button>

            <button
              type="button"
              className="tournament-edit-submit-button"
              disabled={saving}
              onClick={() => handleUpdate(form.status)}
            >
              <CheckIcon />
              {saving ? "更新中..." : "変更内容を保存する"}
            </button>
          </section>

          <p className="tournament-edit-note">
            ※ 変更後も内容の再編集や公開ステータスの変更が可能です。
          </p>
        </>
      )}
    </div>
  );
}