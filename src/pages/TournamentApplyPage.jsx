// src/pages/TournamentApplyPage.jsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function TournamentApplyPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { profile, user } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [form, setForm] = useState({
    applicant_name: "",
    organization: "",
    grade: "",
    division: "",
    notes: "",
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchTournament = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      setLoading(false);

      if (error) {
        setMessage(`大会情報の取得に失敗しました：${error.message}`);
        return;
      }

      setTournament(data);
    };

    fetchTournament();
  }, [id]);

  useEffect(() => {
    if (profile || user) {
      setForm((prev) => ({
        ...prev,
        applicant_name:
          prev.applicant_name ||
          profile?.full_name ||
          profile?.display_name ||
          "",
        organization: prev.organization || profile?.organization || "",
        grade: prev.grade || profile?.grade || "",
      }));
    }
  }, [profile, user]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    setMessage("");

    if (!form.applicant_name || !form.grade || !form.division) {
      setMessage("氏名、段位、参加区分は必須です。");
      return;
    }

    sessionStorage.setItem(
      `applicationDraft:${id}`,
      JSON.stringify({
        tournamentId: id,
        tournament,
        applicationForm: form,
      })
    );

    navigate(`/tournaments/${id}/confirm`);
  };

  if (loading) {
    return (
      <div className="screen page-shell">
        <div className="empty-card">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="screen page-shell">
      <button className="back-link" onClick={() => navigate(`/tournaments/${id}`)}>
        ← 大会詳細へ戻る
      </button>

      <div className="form-layout">
        <section className="form-main-card">
          <div className="page-title-block compact">
            <p>APPLICATION</p>
            <h1>大会申込</h1>
            <span>プロフィール情報をもとに申込内容を入力してください。</span>
          </div>

          {message && <p className="error-text">{message}</p>}

          <label>
            氏名
            <input
              value={form.applicant_name}
              onChange={(e) => handleChange("applicant_name", e.target.value)}
            />
          </label>

          <label>
            所属会
            <input
              value={form.organization}
              onChange={(e) => handleChange("organization", e.target.value)}
            />
          </label>

          <label>
            段位
            <select
              value={form.grade}
              onChange={(e) => handleChange("grade", e.target.value)}
            >
              <option value="">選択してください</option>
              <option value="無段">無段</option>
              <option value="初段">初段</option>
              <option value="二段">二段</option>
              <option value="三段">三段</option>
              <option value="四段">四段</option>
              <option value="五段">五段</option>
              <option value="六段">六段</option>
              <option value="七段">七段</option>
            </select>
          </label>

          <label>
            参加区分
            <select
              value={form.division}
              onChange={(e) => handleChange("division", e.target.value)}
            >
              <option value="">選択してください</option>
              <option value="個人戦">個人戦</option>
              <option value="団体戦">団体戦</option>
            </select>
          </label>

          <label>
            備考
            <textarea
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
            />
          </label>

          <button className="primary-button" onClick={handleConfirm}>
            確認画面へ
          </button>
        </section>

        <aside className="form-side-card">
          <h2>申込大会</h2>
          <p>{tournament?.title}</p>
          <span>{tournament?.event_date}</span>
          <span>{tournament?.venue}</span>
        </aside>
      </div>
    </div>
  );
}