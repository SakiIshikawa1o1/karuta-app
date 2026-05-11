// src/pages/TournamentEditPage.jsx

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ROLE } from "../utils/roles";
import {
  buildGuidelineFilePath,
  getGuidelineContentType,
  GUIDELINE_FILE_ACCEPT,
  TOURNAMENT_FILE_BUCKET,
  validateGuidelineFile,
} from "../utils/tournamentFiles";

const STATUS_LABEL = {
  draft: "下書き",
  preparing: "準備中",
  published: "受付中",
  closed: "受付終了",
};

const CLASS_OPTIONS = [
  { key: "allow_class_a", label: "A級" },
  { key: "allow_class_b", label: "B級" },
  { key: "allow_class_c", label: "C級" },
  { key: "allow_class_d", label: "D級" },
  { key: "allow_class_e", label: "E級" },
  { key: "allow_class_f", label: "F級" },
];

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
    entry_fee: "",
    notes: "",
    address: "",
    status: "draft",
    allow_class_a: false,
    allow_class_b: false,
    allow_class_c: false,
    allow_class_d: false,
    allow_class_e: false,
    allow_class_f: false,
  });

  const [requirementFile, setRequirementFile] = useState(null);
  const [removeGuidelineFile, setRemoveGuidelineFile] = useState(false);
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
      entry_fee: "",
      notes: "",
      address: "",
      status: "draft",
      allow_class_a: false,
      allow_class_b: false,
      allow_class_c: false,
      allow_class_d: false,
      allow_class_e: false,
      allow_class_f: false,
    });
    setRequirementFile(null);
    setRemoveGuidelineFile(false);
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
      entry_fee:
        selected.entry_fee === null || selected.entry_fee === undefined
          ? ""
          : String(selected.entry_fee),
      notes: selected.notes ?? "",
      address: selected.address ?? "",
      status: selected.status ?? "draft",
      allow_class_a: selected.allow_class_a === true,
      allow_class_b: selected.allow_class_b === true,
      allow_class_c: selected.allow_class_c === true,
      allow_class_d: selected.allow_class_d === true,
      allow_class_e: selected.allow_class_e === true,
      allow_class_f: selected.allow_class_f === true,
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
    setRequirementFile(null);
    setRemoveGuidelineFile(false);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGuidelineFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    const validationMessage = validateGuidelineFile(file);

    if (validationMessage) {
      setMessage(validationMessage);
      setRequirementFile(null);
      event.target.value = "";
      return;
    }

    setMessage("");
    setRequirementFile(file);
    setRemoveGuidelineFile(false);
  };

  const handleRemoveGuidelineFile = () => {
    setRequirementFile(null);
    setRemoveGuidelineFile(true);
    setMessage("");
  };

  const validateForm = () => {
    if (!selectedId) return "変更対象の大会を選択してください。";
    if (!form.title.trim()) return "大会名は必須です。";
    if (!form.event_date) return "開催日は必須です。";
    if (!form.venue.trim()) return "会場は必須です。";
    if (!form.application_start_at) return "申込開始日は必須です。";
    if (!form.application_deadline) return "申込締切日は必須です。";
    if (!CLASS_OPTIONS.some((item) => form[item.key])) {
      return "参加可能な級を1つ以上選択してください。";
    }
    if (!form.entry_fee) return "参加費は必須です。";

    const entryFee = sanitizeNumber(form.entry_fee);

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
      notes: form.notes.trim() || null,
      event_date: form.event_date,
      venue: form.venue.trim(),
      address: form.address.trim() || null,
      entry_fee: sanitizeNumber(form.entry_fee),
      application_start_at: form.application_start_at || null,
      application_deadline: form.application_deadline || null,
      status: nextStatus,
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
      allow_class_a: form.allow_class_a,
      allow_class_b: form.allow_class_b,
      allow_class_c: form.allow_class_c,
      allow_class_d: form.allow_class_d,
      allow_class_e: form.allow_class_e,
      allow_class_f: form.allow_class_f,
    };

    const oldFilePath = selectedTournament?.guideline_file_path ?? null;
    let uploadedFilePath = "";

    if (requirementFile) {
      uploadedFilePath = buildGuidelineFilePath(selectedId, requirementFile.name);

      const { error: uploadError } = await supabase.storage
        .from(TOURNAMENT_FILE_BUCKET)
        .upload(uploadedFilePath, requirementFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: getGuidelineContentType(requirementFile),
        });

      if (uploadError) {
        console.error("要項ファイルアップロードエラー:", {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          error: uploadError.error,
          fileName: requirementFile.name,
          fileType: requirementFile.type,
          fileSize: requirementFile.size,
          filePath: uploadedFilePath,
        });

        setSaving(false);
        setMessage(
          `要項ファイルのアップロードに失敗しました：${uploadError.message}`
        );
        return;
      }

      updatePayload.guideline_file_path = uploadedFilePath;
      updatePayload.guideline_file_name = requirementFile.name;
    } else if (removeGuidelineFile) {
      updatePayload.guideline_file_path = null;
      updatePayload.guideline_file_name = null;
    }

    const { error } = await supabase
      .from("tournaments")
      .update(updatePayload)
      .eq("id", selectedId);

    setSaving(false);

    if (error) {
      if (uploadedFilePath) {
        const { error: removeUploadedError } = await supabase.storage
          .from(TOURNAMENT_FILE_BUCKET)
          .remove([uploadedFilePath]);

        if (removeUploadedError) {
          console.warn("要項ファイル削除エラー:", removeUploadedError.message);
        }
      }

      setMessage(`更新に失敗しました：${error.message}`);
      return;
    }

    if (
      oldFilePath &&
      (removeGuidelineFile || uploadedFilePath) &&
      oldFilePath !== uploadedFilePath
    ) {
      const { error: removeOldError } = await supabase.storage
        .from(TOURNAMENT_FILE_BUCKET)
        .remove([oldFilePath]);

      if (removeOldError) {
        console.warn("要項ファイル削除エラー:", removeOldError.message);
      }
    }

    setRequirementFile(null);
    setRemoveGuidelineFile(false);

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
                    <span>参加可能な級</span>
                    <strong>必須</strong>
                  </div>

                  <div className="tournament-edit-radio-list">
                    {CLASS_OPTIONS.map((item) => (
                      <label key={item.key}>
                        <input
                          type="checkbox"
                          checked={form[item.key]}
                          onChange={(e) =>
                            handleChange(item.key, e.target.checked)
                          }
                        />
                        <span>{item.label}参加可</span>
                      </label>
                    ))}
                    <p className="tournament-edit-help">
                      複数の級を選択できます
                    </p>
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
                    <span>大会備考</span>
                    <em>任意</em>
                  </div>

                  <div>
                    <textarea
                      value={form.notes}
                      onChange={(e) =>
                        handleChange("notes", e.target.value)
                      }
                      maxLength={1000}
                      placeholder="大会備考や参加時の注意などを入力してください"
                    />
                    <p className="tournament-edit-count">
                      {form.notes.length} / 1000
                    </p>
                  </div>
                </div>

                <div className="tournament-edit-row">
                  <div className="tournament-edit-label">
                    <span>要項ファイル</span>
                    <em>任意</em>
                  </div>

                  <div>
                    {selectedTournament?.guideline_file_path &&
                      !removeGuidelineFile && (
                        <div className="tournament-edit-current-file">
                          <p>
                            現在の要項ファイル：
                            {selectedTournament.guideline_file_name ||
                              "大会要項ファイル"}
                          </p>
                          <button
                            type="button"
                            className="tournament-edit-remove-file-button"
                            onClick={handleRemoveGuidelineFile}
                          >
                            削除する
                          </button>
                        </div>
                      )}

                    {removeGuidelineFile && (
                      <p className="tournament-edit-help">
                        保存すると現在の要項ファイルを削除します。
                      </p>
                    )}

                    <label className="tournament-edit-upload">
                      <input
                        type="file"
                        accept={GUIDELINE_FILE_ACCEPT}
                        onChange={handleGuidelineFileChange}
                      />
                      <UploadIcon />
                      <span>
                        {requirementFile
                          ? requirementFile.name
                          : "PDFファイルを選択 またはドラッグ＆ドロップ"}
                      </span>
                      <small>PDFのみ・最大10MB</small>
                    </label>
                  </div>
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
                        checked={form.status === "published"}
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
                        value="preparing"
                        checked={form.status === "preparing"}
                        onChange={(e) =>
                          handleChange("status", e.target.value)
                        }
                      />
                      <span>
                        準備中
                        <small>大会ページは表示し、申込は受け付けません</small>
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
