// src/pages/TournamentApplyPage.jsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatDateJa(value) {
  if (!value) return "未定";

  const normalized =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T00:00:00`
      : value;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const day = WEEKDAYS[date.getDay()];

  return `${yyyy}/${mm}/${dd}(${day})`;
}

function formatFee(value, note) {
  if (value === null || value === undefined || value === "") return "未定";

  const numberValue = Number(value);
  const feeText = Number.isNaN(numberValue)
    ? String(value)
    : `${numberValue.toLocaleString("ja-JP")}円`;

  return note ? `${feeText}（${note}）` : feeText;
}

function formatStatus(status) {
  if (!status) return "受付中";

  if (status === "Published" || status === "published") {
    return "受付中";
  }

  if (status === "Closed" || status === "closed") {
    return "締切";
  }

  return status;
}

export default function TournamentApplyPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { profile, user } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [organizations, setOrganizations] = useState([]);

  const [form, setForm] = useState({
    applicant_name: "",
    email: "",
    organization: "",
    grade: "",
    division: "個人戦",
    notes: "",
    checkedRequirements: false,
    checkedCautions: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchTournament = async () => {
      setLoading(true);
      setMessage("");

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

      if (!data) {
        setMessage("大会情報が見つかりませんでした。");
        return;
      }

      setTournament(data);
    };

    fetchTournament();
  }, [id]);

  useEffect(() => {
    const fetchOrganizations = async () => {
      const { data, error } = await supabase
        .from("affiliations")
        .select("name")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.warn("所属会一覧の取得に失敗しました", error.message);
        return;
      }

      setOrganizations(
        (data || [])
          .map((item) => item.name)
          .filter(Boolean)
      );
    };

    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (profile || user) {
      setForm((prev) => ({
        ...prev,
        applicant_name:
          prev.applicant_name ||
          profile?.full_name ||
          profile?.display_name ||
          "",
        email: prev.email || profile?.email || user?.email || "",
        organization:
          prev.organization ||
          profile?.organization ||
          profile?.affiliation ||
          "",
        grade: prev.grade || profile?.grade || "",
      }));
    }
  }, [profile, user]);

  const tournamentView = useMemo(() => {
    const title = tournament?.title || tournament?.name || "大会名未設定";
    const eventDate = tournament?.event_date || tournament?.date;
    const venue = tournament?.venue || tournament?.place || "会場未定";
    const fee =
      tournament?.entry_fee ??
      tournament?.participation_fee ??
      tournament?.fee ??
      "";
    const feeNote = tournament?.fee_note || tournament?.fee_unit || "";

    return {
      title,
      eventDate: formatDateJa(eventDate),
      venue,
      fee: formatFee(fee, feeNote),
      status: formatStatus(tournament?.status),
      requirementUrl:
        tournament?.requirement_url ||
        tournament?.guideline_url ||
        tournament?.outline_url ||
        "",
      cautionUrl:
        tournament?.caution_url ||
        tournament?.notice_url ||
        tournament?.notes_url ||
        "",
    };
  }, [tournament]);

  const organizationOptions = useMemo(() => {
    const merged = [
      form.organization,
      profile?.organization,
      profile?.affiliation,
      ...organizations,
    ].filter(Boolean);

    return Array.from(new Set(merged));
  }, [form.organization, profile, organizations]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDocumentClick = (event, url) => {
    if (url) return;

    event.preventDefault();
    navigate(`/tournaments/${id}`);
  };

  const handleConfirm = async () => {
    setMessage("");

    if (!user) {
      setMessage("ログイン情報が確認できません。再度ログインしてください。");
      return;
    }

    if (!form.applicant_name || !form.email || !form.organization || !form.grade) {
      setMessage("氏名、メールアドレス、所属会、段位は必須です。");
      return;
    }

    if (!form.checkedRequirements || !form.checkedCautions) {
      setMessage("参加要項の確認と注意事項への同意が必要です。");
      return;
    }

    const confirmMessage = `以下の内容で申し込みます。

【大会名】
${tournamentView.title}

【開催日】
${tournamentView.eventDate}

【会場】
${tournamentView.venue}

【氏名】
${form.applicant_name}

【メールアドレス】
${form.email}

【所属会】
${form.organization}

【段位】
${form.grade}

この内容で申し込みを確定しますか？`;

    const isConfirmed = window.confirm(confirmMessage);

    if (!isConfirmed) {
      return;
    }

    setSaving(true);

    const { data: existingApplication, error: checkError } = await supabase
      .from("applications")
      .select("id")
      .eq("tournament_id", id)
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .maybeSingle();

    if (checkError) {
      setSaving(false);
      setMessage(`申込状況の確認に失敗しました：${checkError.message}`);
      return;
    }

    if (existingApplication) {
      setSaving(false);
      setMessage("この大会にはすでに申し込み済みです。");
      return;
    }

    const { error } = await supabase.from("applications").insert({
      tournament_id: id,
      user_id: user.id,
      applicant_name: form.applicant_name,
      organization: form.organization,
      grade: form.grade,
      division: form.division || "個人戦",
      notes: form.notes || "",
      status: "applied",
      updated_by: user.id,
    });

    setSaving(false);

    if (error) {
      setMessage(`申し込みに失敗しました：${error.message}`);
      return;
    }

    navigate("/applications/status", { replace: true });
  };

  if (loading) {
    return (
      <div className="screen tournament-apply-page">
        <div className="apply-loading-card">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="screen tournament-apply-page">
      <section className="apply-hero">
        <div className="apply-hero-text">
          <p className="apply-hero-label">大会申し込み</p>
          <h1>大会申し込み</h1>
          <p>必要事項を確認のうえ、申し込みを完了してください。</p>
        </div>

        <div className="apply-hero-leaves" aria-hidden="true">
          <span>🍁</span>
          <span>🍁</span>
          <span>🍁</span>
        </div>
      </section>

      <main className="apply-content">
        <section className="apply-tournament-card">
          <div className="apply-tournament-head">
            <h2>{tournamentView.title}</h2>
          </div>

          <div className="apply-info-table">
            <div className="apply-info-row">
              <div className="apply-info-label">
                <span className="apply-info-icon">📅</span>
                <span>開催日</span>
              </div>
              <div className="apply-info-value">{tournamentView.eventDate}</div>
            </div>

            <div className="apply-info-row">
              <div className="apply-info-label">
                <span className="apply-info-icon">📍</span>
                <span>会場</span>
              </div>
              <div className="apply-info-value">{tournamentView.venue}</div>
            </div>

            <div className="apply-info-row">
              <div className="apply-info-label">
                <span className="apply-info-icon">￥</span>
                <span>参加費</span>
              </div>
              <div className="apply-info-value">{tournamentView.fee}</div>
            </div>
          </div>
        </section>

        <section className="apply-form-card">
          <div className="apply-section-title">
            <h2>申込者情報</h2>
            <p>
              ※ プロフィール情報は自動入力されています。変更はマイページから行ってください。
            </p>
          </div>

          {message && <p className="apply-error-text">{message}</p>}

          <div className="apply-form-field">
            <label htmlFor="applicantName">
              氏名 <span className="apply-required">必須</span>
            </label>
            <input
              id="applicantName"
              value={form.applicant_name}
              readOnly
              className="apply-readonly-input"
              placeholder="山田 太郎"
            />
          </div>

          <div className="apply-form-field">
            <label htmlFor="email">
              メールアドレス <span className="apply-required">必須</span>
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              readOnly
              className="apply-readonly-input"
              placeholder="yamada.taro@example.com"
            />
          </div>

          <div className="apply-form-field">
            <label htmlFor="organization">
              所属会 <span className="apply-required">必須</span>
            </label>
            <select
              id="organization"
              value={form.organization}
              disabled
              className="apply-readonly-input"
            >
              <option value="">未設定</option>
              {organizationOptions.map((organization) => (
                <option key={organization} value={organization}>
                  {organization}
                </option>
              ))}
            </select>
          </div>

          <div className="apply-form-field">
            <label htmlFor="grade">
              段位 <span className="apply-required">必須</span>
            </label>
            <select
              id="grade"
              value={form.grade}
              disabled
              className="apply-readonly-input"
            >
              <option value="">未設定</option>
              <option value="無段">無段</option>
              <option value="初段">初段</option>
              <option value="二段">二段</option>
              <option value="三段">三段</option>
              <option value="四段">四段</option>
              <option value="五段">五段</option>
              <option value="六段">六段</option>
              <option value="七段">七段</option>
            </select>
          </div>

          <div className="apply-check-list">
            <div className="apply-check-row">
              <label>
                <input
                  type="checkbox"
                  checked={form.checkedRequirements}
                  onChange={(e) =>
                    handleChange("checkedRequirements", e.target.checked)
                  }
                />
                <span>参加要項を確認しました</span>
              </label>

              <a
                href={tournamentView.requirementUrl || `/tournaments/${id}`}
                target={tournamentView.requirementUrl ? "_blank" : undefined}
                rel={tournamentView.requirementUrl ? "noreferrer" : undefined}
                onClick={(e) =>
                  handleDocumentClick(e, tournamentView.requirementUrl)
                }
              >
                参加要項を開く ↗
              </a>
            </div>

            <div className="apply-check-row">
              <label>
                <input
                  type="checkbox"
                  checked={form.checkedCautions}
                  onChange={(e) =>
                    handleChange("checkedCautions", e.target.checked)
                  }
                />
                <span>注意事項に同意します</span>
              </label>

              <a
                href={tournamentView.cautionUrl || `/tournaments/${id}`}
                target={tournamentView.cautionUrl ? "_blank" : undefined}
                rel={tournamentView.cautionUrl ? "noreferrer" : undefined}
                onClick={(e) =>
                  handleDocumentClick(e, tournamentView.cautionUrl)
                }
              >
                注意事項を開く ↗
              </a>
            </div>
          </div>

          <p className="apply-note">
            ※ お申し込み後のキャンセルは、締切後は受け付けできません。
          </p>
        </section>

        <button
          className="apply-submit-button"
          onClick={handleConfirm}
          disabled={saving}
        >
          <span>{saving ? "申し込み中..." : "この大会に申し込む"}</span>
          <span aria-hidden="true">›</span>
        </button>
      </main>
    </div>
  );
}