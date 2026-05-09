// src/pages/TournamentCreatePage.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

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

export default function TournamentCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

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
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateRequired = () => {
    if (!form.title.trim()) return "大会名は必須です。";
    if (!form.event_date) return "開催日は必須です。";
    if (!form.venue.trim()) return "会場は必須です。";
    if (!form.application_start_at) return "申込開始日は必須です。";
    if (!form.application_deadline) return "申込締切日は必須です。";
    if (!form.department_grade) return "部門・級は必須です。";
    if (!form.capacity) return "定員は必須です。";
    if (!form.entry_fee) return "参加費は必須です。";
    return "";
  };

  const handleSave = async (nextStatus) => {
    setErrorMessage("");

    const validationMessage = validateRequired();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      event_date: form.event_date,
      venue: form.venue.trim(),
      address: form.address.trim(),
      capacity: sanitizeNumber(form.capacity),
      entry_fee: sanitizeNumber(form.entry_fee),
      application_start_at: form.application_start_at || null,
      application_deadline: form.application_deadline || null,
      status: nextStatus,
      created_by: user?.id,
      updated_by: user?.id,

      // tournaments テーブルに grade カラムがない場合は、この1行を削除してください
      grade: form.department_grade,
    };

    const { error } = await supabase.from("tournaments").insert(payload);

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    alert(nextStatus === "draft" ? "下書き保存しました。" : "大会を登録しました。");
    navigate("/admin/tournament");
  };

  return (
    <div className="tournament-create-page">
      <section className="tournament-create-hero">
        <div className="tournament-create-hero-copy">
          <h1>大会を新規追加</h1>
          <p>
            新しい大会の情報を入力してください。
            <br />
            入力後、「大会を登録する」ボタンで公開できます。
          </p>
        </div>
      </section>

      <section className="tournament-create-card">
        {errorMessage && <p className="tournament-create-error">{errorMessage}</p>}

        <div className="tournament-create-form">
          <div className="tournament-create-row">
            <div className="tournament-create-label">
              <span>大会名</span>
              <strong>必須</strong>
            </div>

            <input
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="大会名を入力してください"
            />
          </div>

          <div className="tournament-create-row">
            <div className="tournament-create-label">
              <span>開催日</span>
              <strong>必須</strong>
            </div>

            <input
              type="date"
              value={form.event_date}
              onChange={(e) => handleChange("event_date", e.target.value)}
            />
          </div>

          <div className="tournament-create-row">
            <div className="tournament-create-label">
              <span>会場</span>
              <strong>必須</strong>
            </div>

            <input
              value={form.venue}
              onChange={(e) => handleChange("venue", e.target.value)}
              placeholder="会場名を入力してください"
            />
          </div>

          <div className="tournament-create-row">
            <div className="tournament-create-label">
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

          <div className="tournament-create-row">
            <div className="tournament-create-label">
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

          <div className="tournament-create-row">
            <div className="tournament-create-label">
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

              <p className="tournament-create-help">
                複数の部門・級を設定できます（登録後に編集可能）
              </p>
            </div>
          </div>

          <div className="tournament-create-row">
            <div className="tournament-create-label">
              <span>定員</span>
              <strong>必須</strong>
            </div>

            <div className="tournament-create-inline-input">
              <input
                type="text"
                inputMode="numeric"
                value={form.capacity}
                onChange={(e) => handleChange("capacity", e.target.value)}
                placeholder="例）100"
              />
              <span>人</span>
            </div>
          </div>

          <div className="tournament-create-row">
            <div className="tournament-create-label">
              <span>参加費</span>
              <strong>必須</strong>
            </div>

            <div className="tournament-create-inline-input">
              <input
                type="text"
                inputMode="numeric"
                value={form.entry_fee}
                onChange={(e) => handleChange("entry_fee", e.target.value)}
                placeholder="例）2,000"
              />
              <span>円</span>
            </div>
          </div>

          <div className="tournament-create-row">
            <div className="tournament-create-label">
              <span>大会概要</span>
              <em>任意</em>
            </div>

            <div>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                maxLength={1000}
                placeholder="大会の概要や見どころなどを入力してください"
              />
              <p className="tournament-create-count">
                {form.description.length} / 1000
              </p>
            </div>
          </div>

          <div className="tournament-create-row">
            <div className="tournament-create-label">
              <span>要項ファイル</span>
              <em>任意</em>
            </div>

            <label className="tournament-create-upload">
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

          <div className="tournament-create-row">
            <div className="tournament-create-label">
              <span>公開ステータス</span>
              <strong>必須</strong>
            </div>

            <div className="tournament-create-radio-list">
              <label>
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={form.status === "draft"}
                  onChange={(e) => handleChange("status", e.target.value)}
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
                  onChange={(e) => handleChange("status", e.target.value)}
                />
                <span>
                  公開する
                  <small>登録後すぐに大会ページが公開されます</small>
                </span>
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="tournament-create-actions">
        <button
          type="button"
          className="tournament-create-draft-button"
          disabled={saving}
          onClick={() => handleSave("draft")}
        >
          <FileIcon />
          下書き保存
        </button>

        <button
          type="button"
          className="tournament-create-submit-button"
          disabled={saving}
          onClick={() => handleSave(form.status === "draft" ? "published" : form.status)}
        >
          <CheckIcon />
          {saving ? "登録中..." : "大会を登録する"}
        </button>
      </section>

      <p className="tournament-create-note">
        ※ 登録後も内容の編集や公開ステータスの変更が可能です。
      </p>
    </div>
  );
}