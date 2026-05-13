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

function normalizeClassCode(code) {
  return String(code || "").trim().replace("級", "").toLowerCase();
}

function getAllowedClassColumn(classCode) {
  const normalized = normalizeClassCode(classCode);
  return normalized ? `allow_class_${normalized}` : "";
}

function isDeadlineFuture(value) {
  if (!value) return false;
  const deadline = new Date(value);
  return !Number.isNaN(deadline.getTime()) && deadline > new Date();
}

export default function TournamentApplyPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { profile, user } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [affiliations, setAffiliations] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [danRanks, setDanRanks] = useState([]);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  const [form, setForm] = useState({
    applicant_name: "",
    email: "",
    organization: "",
    class_level_id: "",
    dan_rank_id: "",
    school_name: "",
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
    const fetchMastersAndApplication = async () => {
      const [affiliationsResult, classLevelsResult, danRanksResult] =
        await Promise.all([
          supabase
            .from("affiliations")
            .select("id, name, is_active")
            .eq("is_active", true)
            .order("name", { ascending: true }),
          supabase
            .from("class_levels")
            .select("id, code, name, sort_order, is_active")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase
            .from("dan_ranks")
            .select("id, code, name, sort_order, is_active")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
        ]);

      if (!affiliationsResult.error) setAffiliations(affiliationsResult.data ?? []);
      if (!classLevelsResult.error) setClassLevels(classLevelsResult.data ?? []);
      if (!danRanksResult.error) setDanRanks(danRanksResult.data ?? []);

      if (user) {
        const { data } = await supabase
          .from("applications")
          .select("id")
          .eq("tournament_id", id)
          .eq("user_id", user.id)
          .neq("status", "cancelled")
          .maybeSingle();

        setAlreadyApplied(!!data);
      }
    };

    fetchMastersAndApplication();
  }, [id, user]);

  useEffect(() => {
    if (profile || user) {
      const affiliationName =
        affiliations.find((item) => item.id === profile?.affiliation_id)?.name ||
        "";

      setForm((prev) => ({
        ...prev,
        applicant_name:
          prev.applicant_name ||
          profile?.full_name ||
          profile?.display_name ||
          "",
        email: prev.email || profile?.email || user?.email || "",
        organization: prev.organization || affiliationName,
        class_level_id: prev.class_level_id || profile?.class_level_id || "",
        dan_rank_id: prev.dan_rank_id || profile?.dan_rank_id || "",
        school_name: prev.school_name || profile?.school_name || "",
      }));
    }
  }, [profile, user, affiliations]);

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

  const classLevelName = useMemo(
    () => classLevels.find((item) => item.id === form.class_level_id)?.name || "",
    [classLevels, form.class_level_id]
  );

  const danRankName = useMemo(
    () => danRanks.find((item) => item.id === form.dan_rank_id)?.name || "",
    [danRanks, form.dan_rank_id]
  );

  const userClassLevel = useMemo(
    () => classLevels.find((item) => item.id === profile?.class_level_id),
    [classLevels, profile?.class_level_id]
  );

  const isUserClassAllowed = useMemo(() => {
    if (!tournament || !userClassLevel) return false;
    const columnName = getAllowedClassColumn(userClassLevel.code);
    return !!columnName && tournament[columnName] === true;
  }, [tournament, userClassLevel]);

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

    if (!tournament) {
      setMessage("大会情報が確認できません。");
      return;
    }

    if (tournament.status !== "published" || !isDeadlineFuture(tournament.application_deadline)) {
      setMessage("この大会は現在申し込みできません。");
      return;
    }

    if (alreadyApplied) {
      setMessage("この大会にはすでに申し込み済みです。");
      return;
    }

    if (!isUserClassAllowed) {
      setMessage("あなたの級はこの大会の参加対象外です。");
      return;
    }

    if (
      !form.applicant_name ||
      !form.email ||
      !form.organization ||
      !form.class_level_id ||
      !form.dan_rank_id
    ) {
      setMessage("氏名、メールアドレス、所属会、級、段位は必須です。");
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

【級】
${classLevelName || "未設定"}

【段位】
${danRankName || "未設定"}

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

    const applicationPayload = {
      tournament_id: id,
      user_id: user.id,
      applicant_name: form.applicant_name,
      organization: form.organization,
      notes: form.notes || "",
      status: "applied",
      applied_at: new Date().toISOString(),
      updated_by: user.id,
      class_level_id: form.class_level_id,
      dan_rank_id: form.dan_rank_id,
      tournament_title: tournamentView.title,
      user_email: form.email,
      school_name: form.school_name || "",
    };

    const { data: cancelledApplication, error: cancelledCheckError } =
      await supabase
        .from("applications")
        .select("id")
        .eq("tournament_id", id)
        .eq("user_id", user.id)
        .eq("status", "cancelled")
        .order("applied_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (cancelledCheckError) {
      setSaving(false);
      setMessage(`キャンセル済み申込の確認に失敗しました：${cancelledCheckError.message}`);
      return;
    }

    const { error } = cancelledApplication
      ? await supabase
          .from("applications")
          .update(applicationPayload)
          .eq("id", cancelledApplication.id)
          .eq("user_id", user.id)
      : await supabase.from("applications").insert(applicationPayload);

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
              {form.organization && (
                <option value={form.organization}>{form.organization}</option>
              )}
            </select>
          </div>

          <div className="apply-form-field">
            <label htmlFor="classLevel">
              級 <span className="apply-required">必須</span>
            </label>
            <input
              id="classLevel"
              value={classLevelName || "未設定"}
              readOnly
              className="apply-readonly-input"
            />
          </div>

          <div className="apply-form-field">
            <label htmlFor="danRank">
              段位 <span className="apply-required">必須</span>
            </label>
            <input
              id="danRank"
              value={danRankName || "未設定"}
              readOnly
              className="apply-readonly-input"
            />
          </div>

          <div className="apply-form-field">
            <label htmlFor="schoolName">学校名</label>
            <input
              id="schoolName"
              value={form.school_name || "未設定"}
              readOnly
              className="apply-readonly-input"
            />
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
