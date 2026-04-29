// src/pages/TournamentEditPage.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ROLE } from "../utils/roles";

const STATUS_LABEL = {
  draft: "下書き",
  published: "公開",
  closed: "受付終了",
  cancelled: "中止",
};

export default function TournamentEditPage() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  const isSystemAdmin = hasRole(ROLE.SYSTEM_ADMIN);

  const [tournaments, setTournaments] = useState([]);
  const [selectedId, setSelectedId] = useState("");

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const resetForm = () => {
    setForm({
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
  };

  const formatDateTimeLocal = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);

    return localDate.toISOString().slice(0, 16);
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

    // システム管理者は全大会
    // 大会管理者は自分が登録した大会のみ
    if (!isSystemAdmin) {
      query = query.eq("created_by", user.id);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      setMessage(`大会取得に失敗しました：${error.message}`);
      return;
    }

    setTournaments(data ?? []);
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

    setForm({
      title: selected.title ?? "",
      description: selected.description ?? "",
      event_date: selected.event_date ?? "",
      venue: selected.venue ?? "",
      address: selected.address ?? "",
      capacity:
        selected.capacity === null || selected.capacity === undefined
          ? ""
          : String(selected.capacity),
      entry_fee:
        selected.entry_fee === null || selected.entry_fee === undefined
          ? ""
          : String(selected.entry_fee),
      application_start_at: formatDateTimeLocal(selected.application_start_at),
      application_deadline: formatDateTimeLocal(selected.application_deadline),
      status: selected.status ?? "draft",
    });
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!selectedId) {
      return "変更対象の大会を選択してください。";
    }

    if (!form.title.trim()) {
      return "大会名は必須です。";
    }

    if (!form.event_date) {
      return "開催日は必須です。";
    }

    if (!form.venue.trim()) {
      return "会場は必須です。";
    }

    if (form.capacity && Number(form.capacity) < 0) {
      return "定員は0以上で入力してください。";
    }

    if (form.entry_fee && Number(form.entry_fee) < 0) {
      return "参加費は0以上で入力してください。";
    }

    if (
      form.application_start_at &&
      form.application_deadline &&
      new Date(form.application_start_at) > new Date(form.application_deadline)
    ) {
      return "申込開始日時は申込締切日時より前にしてください。";
    }

    return "";
  };

  const handleUpdate = async () => {
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
      capacity: form.capacity ? Number(form.capacity) : null,
      entry_fee: form.entry_fee ? Number(form.entry_fee) : null,
      application_start_at: form.application_start_at || null,
      application_deadline: form.application_deadline || null,
      status: form.status,
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
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

    await fetchTournaments();
  };

  return (
    <div className="screen">
      <button
        className="back-button"
        onClick={() => navigate("/admin/tournament")}
      >
        ← 大会管理者ページへ戻る
      </button>

      <h1>大会変更</h1>

      {message && <p className="info-text">{message}</p>}

      <div className="card">
        <h2>{isSystemAdmin ? "全大会を変更" : "自分が登録した大会を変更"}</h2>
        <p>
          {isSystemAdmin
            ? "システム管理者は、すべての大会情報を変更できます。"
            : "大会管理者は、自分が登録した大会のみ変更できます。"}
        </p>
      </div>

      {loading ? (
        <div className="card">
          <p>読み込み中...</p>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="card">
          <p>変更できる大会がありません。</p>
          <button
            className="primary"
            onClick={() => navigate("/admin/tournament/new")}
          >
            大会を登録する
          </button>
        </div>
      ) : (
        <div className="form-card">
          <label>
            変更対象の大会
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
          </label>

          {selectedId && (
            <>
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
                  onChange={(e) =>
                    handleChange("description", e.target.value)
                  }
                  placeholder="大会概要、参加資格、注意事項など"
                />
              </label>

              <label>
                開催日
                <input
                  type="date"
                  value={form.event_date}
                  onChange={(e) =>
                    handleChange("event_date", e.target.value)
                  }
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
                  min="0"
                  value={form.capacity}
                  onChange={(e) => handleChange("capacity", e.target.value)}
                  placeholder="400"
                />
              </label>

              <label>
                参加費
                <input
                  type="number"
                  min="0"
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
                  onChange={(e) =>
                    handleChange("application_start_at", e.target.value)
                  }
                />
              </label>

              <label>
                申込締切日時
                <input
                  type="datetime-local"
                  value={form.application_deadline}
                  onChange={(e) =>
                    handleChange("application_deadline", e.target.value)
                  }
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

              <button
                className="primary"
                onClick={handleUpdate}
                disabled={saving}
              >
                {saving ? "更新中..." : "更新する"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}