// src/pages/NoticesPage.jsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import SiteFooter from "../components/SiteFooter";

const FALLBACK_NOTICES = [
  {
    id: "sample-1",
    date: "2026.04.30",
    tag: "重要",
    important: true,
    title: "大会申込システムの試験運用を開始しました",
    body: "大会情報の閲覧、申込状況の確認などを順次利用できるようにしています。利用中に気になる点がある場合は、運営担当者までご連絡ください。",
  },
  {
    id: "sample-2",
    date: "2026.04.28",
    tag: "大会",
    important: false,
    title: "春季大会の申込受付を開始しました",
    body: "申込期間・開催場所・参加条件を確認のうえ、期日までにお申し込みください。申込後はマイページまたは申込状況確認ページから状態を確認できます。",
  },
  {
    id: "sample-3",
    date: "2026.04.25",
    tag: "案内",
    important: false,
    title: "マイページ機能を更新しました",
    body: "プロフィール情報、所属、段位、申込状況を確認しやすくしました。登録情報に誤りがある場合は、マイページから修正してください。",
  },
];

function getNoticeDate(notice) {
  return (
    notice.published_at ||
    notice.created_at ||
    notice.date ||
    notice.notice_date ||
    null
  );
}

function formatDate(value) {
  if (!value) return "日付未設定";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function normalizeNotice(notice) {
  const label = notice.label || "お知らせ";
  return {
    id: notice.id,
    date: formatDate(getNoticeDate(notice)),
    tag: label,
    important: label === "重要",
    title: notice.title || "タイトル未設定",
    body: notice.body || "お知らせの本文は登録されていません。",
  };
}

export default function NoticesPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function fetchNotices() {
      setLoading(true);
      setFetchError("");

      const { data, error } = await supabase
        .from("notices")
        .select("id, title, body, label, is_published, published_at, created_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error("お知らせの取得に失敗しました:", error);
        setFetchError(
          "お知らせ情報を取得できませんでした。時間をおいて再度お試しください。"
        );
        setNotices([]);
      } else {
        setNotices(data ?? []);
      }

      setLoading(false);
    }

    fetchNotices();

    return () => {
      mounted = false;
    };
  }, []);

  const sortedNotices = useMemo(() => {
    return [...notices]
      .sort((a, b) => {
        const dateA = new Date(getNoticeDate(a));
        const dateB = new Date(getNoticeDate(b));

        if (Number.isNaN(dateA.getTime())) return 1;
        if (Number.isNaN(dateB.getTime())) return -1;

        return dateB - dateA;
      })
      .map(normalizeNotice);
  }, [notices]);

  return (
    <main className="tournament-search-page notices-page">
      <section className="tournament-search-hero">
        <div className="tournament-search-hero-copy">
          <p>NEWS</p>
          <h1>お知らせ一覧</h1>
          <span>大会申込システムからのお知らせを掲載しています。</span>
        </div>
      </section>

      {loading ? (
        <div className="empty-card">お知らせを読み込んでいます。</div>
      ) : (
        <>
          {fetchError && <div className="error-text">{fetchError}</div>}

          {sortedNotices.length === 0 ? (
            <div className="empty-card">現在、公開中のお知らせはありません。</div>
          ) : (
            <section className="notice-list-page">
              {sortedNotices.map((notice) => (
                <article key={notice.id} className="notice-detail-card">
                  <div className="notice-detail-meta">
                    <span className="notice-date">{notice.date}</span>
                    <span
                      className={`notice-tag ${
                        notice.important ? "important" : ""
                      }`}
                    >
                      {notice.tag}
                    </span>
                  </div>

                  <div>
                    <h2>{notice.title}</h2>
                    <p>{notice.body}</p>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}

      <SiteFooter />
    </main>
  );
}
