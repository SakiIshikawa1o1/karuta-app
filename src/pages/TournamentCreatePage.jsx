// src/pages/TournamentCreatePage.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function TournamentCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    title: "",
    description: "",
    event_date: "",
    venue: "",
    address: "",
    capacity: "",
    entry_fee: "",
    application_start_at: "",
    application_deadline: "",
    status: "draft",
  });

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage("");

    if (!form.title || !form.event_date || !form.venue) {
      setSaving(false);
      setErrorMessage("大会名、開催日、会場は必須です。");
      return;
    }

    const { error } = await supabase
      .from("tournaments")
      .insert({
        title: form.title,
        description: form.description,
        event_date: form.event_date,
        venue: form.venue,
        address: form.address,
        capacity: form.capacity ? Number(form.capacity) : null,
        entry_fee: form.entry_fee ? Number(form.entry_fee) : null,
        application_start_at: form.application_start_at || null,
        application_deadline: form.application_deadline || null,
        status: form.status,
        created_by: user?.id,
        updated_by: user?.id,
      });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    alert("大会を登録しました。");
    navigate("/admin/tournament");
  };

  return (
    <div className="screen">
      <button className="back-button" onClick={() => navigate("/admin/tournament")}>
        ← 大会管理者ページへ戻る
      </button>

      <h1>大会登録</h1>

      <div className="form-card">
        {errorMessage && <p className="error-text">{errorMessage}</p>}

        <label>
          大会名
          <input
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="第72回 全日本かるた選手権大会"
          />
        </label>

        <label>
          大会説明
          <textarea
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="大会概要、参加資格、注意事項など"
          />
        </label>

        <label>
          開催日
          <input
            type="date"
            value={form.event_date}
            onChange={(e) => handleChange("event_date", e.target.value)}
          />
        </label>

        <label>
          会場
          <input
            value={form.venue}
            onChange={(e) => handleChange("venue", e.target.value)}
            placeholder="大阪府立体育会館"
          />
        </label>

        <label>
          住所
          <input
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="大阪府大阪市..."
          />
        </label>

        <label>
          定員
          <input
            type="number"
            value={form.capacity}
            onChange={(e) => handleChange("capacity", e.target.value)}
            placeholder="400"
          />
        </label>

        <label>
          参加費
          <input
            type="number"
            value={form.entry_fee}
            onChange={(e) => handleChange("entry_fee", e.target.value)}
            placeholder="3000"
          />
        </label>

        <label>
          申込開始日時
          <input
            type="datetime-local"
            value={form.application_start_at}
            onChange={(e) => handleChange("application_start_at", e.target.value)}
          />
        </label>

        <label>
          申込締切日時
          <input
            type="datetime-local"
            value={form.application_deadline}
            onChange={(e) => handleChange("application_deadline", e.target.value)}
          />
        </label>

        <label>
          公開状態
          <select
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
          >
            <option value="draft">下書き</option>
            <option value="published">公開</option>
            <option value="closed">受付終了</option>
            <option value="cancelled">中止</option>
          </select>
        </label>

        <button className="primary" onClick={handleSave} disabled={saving}>
          {saving ? "登録中..." : "登録する"}
        </button>
      </div>
    </div>
  );
}