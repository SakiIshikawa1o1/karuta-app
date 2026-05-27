const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();

const BASE_URL = "https://www.karuta.or.jp";
const LIST_URL = "https://www.karuta.or.jp/cup-info/";
const CLASS_ENTRY_FEES = {
  A: 2500,
  B: 2500,
  C: 2000,
  D: 2000,
  E: 1500,
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function toAbsoluteUrl(href) {
  if (!href) return null;
  return href.startsWith("http") ? href : BASE_URL + href;
}

function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultEntryFeeForGrades(grades) {
  const fees = (grades || [])
    .map((grade) => CLASS_ENTRY_FEES[grade])
    .filter((fee) => Number.isFinite(fee));

  return fees.length > 0 ? Math.min(...fees) : 2500;
}

function isTournamentDetailUrl(url) {
  return /^https:\/\/www\.karuta\.or\.jp\/cup-info\/\d{6}\/\d+\/?$/.test(url);
}

function normalizeDate(text) {
  const value = cleanText(text);

  const m1 = value.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (m1) {
    return `${m1[1]}-${m1[2].padStart(2, "0")}-${m1[3].padStart(2, "0")}`;
  }

  const m2 = value.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (m2) {
    return `${m2[1]}-${m2[2].padStart(2, "0")}-${m2[3].padStart(2, "0")}`;
  }

  return null;
}

function normalizeGrades(text) {
  const normalized = cleanText(text)
    .replace(/Ａ/g, "A")
    .replace(/Ｂ/g, "B")
    .replace(/Ｃ/g, "C")
    .replace(/Ｄ/g, "D")
    .replace(/Ｅ/g, "E")
    .replace(/Ｆ/g, "F")
    .toUpperCase();

  const grades = new Set();

  ["A", "B", "C", "D", "E", "F"].forEach((g) => {
    if (
      normalized.includes(`${g}級`) ||
      normalized.includes(`${g} 級`) ||
      normalized.includes(g)
    ) {
      grades.add(g);
    }
  });

  return [...grades];
}

function extractLabeledItems($) {
  const items = [];

  $("tr").each((_, tr) => {
    const cells = $(tr)
      .find("th,td")
      .map((_, cell) => cleanText($(cell).text()))
      .get()
      .filter(Boolean);

    if (cells.length >= 2) {
      items.push({
        label: cells[0],
        value: cells.slice(1).join(" "),
      });
    }
  });

  $("dt").each((_, dt) => {
    const label = cleanText($(dt).text());
    const value = cleanText($(dt).next("dd").text());

    if (label && value) {
      items.push({ label, value });
    }
  });

  return items;
}

function findByLabel(items, keywords) {
  const item = items.find((i) =>
    keywords.some((kw) => cleanText(i.label).includes(kw))
  );

  return item ? item.value : null;
}

function extractEntryFee(text) {
  const normalized = cleanText(text);

  const match = normalized.match(
    /(?:参加費|会費|出場料)[^0-9０-９]*(\d{1,3}(?:,\d{3})*|\d+)\s*円/
  );

  if (!match) return null;

  return Number(
    match[1]
      .replace(/,/g, "")
      .replace(/[０-９]/g, (s) =>
        String.fromCharCode(s.charCodeAt(0) - 0xfee0)
      )
  );
}

function buildTournamentData({
  detailUrl,
  pageTitle,
  h1,
  labeledItems,
  bodyText,
  fileUrls,
}) {
  const title =
    findByLabel(labeledItems, ["大会名称", "大会名", "名称"]) ||
    h1 ||
    pageTitle.replace("| 全日本かるた協会", "").replace("大会情報", "").trim();

  const rawEventDate =
    findByLabel(labeledItems, ["開催日", "日時", "日程"]) || bodyText;

  const eventDate = normalizeDate(rawEventDate);

  const venue = findByLabel(labeledItems, ["会場", "場所"]) || "会場未確認";

  const rawGrades = findByLabel(labeledItems, ["級", "参加級", "対象"]);
  const grades = normalizeGrades(rawGrades);
  const fixedEntryFee = getDefaultEntryFeeForGrades(grades);

  const entryFee = extractEntryFee(
    findByLabel(labeledItems, ["参加費", "会費", "出場料"]) || bodyText
  );

  const notes = [
    "全日本かるた協会より自動取得。",
    "詳細・申込締切・住所等は管理者確認後に更新。",
    rawGrades ? `級: ${rawGrades}` : null,
    fileUrls.length > 0 ? `添付ファイル: ${fileUrls.join(" / ")}` : null,
    `取得元: ${detailUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    title: title || "大会名未確認",
    event_date: eventDate,
    venue: venue || "会場未確認",
    address: null,
    entry_fee: fixedEntryFee,
    application_start_at: getTodayDateInputValue(),
    application_deadline: null,
    status: "draft",
    guideline_file_name: fileUrls.length > 0 ? fileUrls[0].split("/").pop() : null,
    guideline_file_path: fileUrls.length > 0 ? fileUrls[0] : null,
    source_url: detailUrl,
    source_name: "全日本かるた協会",
    imported_at: new Date().toISOString(),

    allow_class_a: grades.includes("A"),
    allow_class_b: grades.includes("B"),
    allow_class_c: grades.includes("C"),
    allow_class_d: grades.includes("D"),
    allow_class_e: grades.includes("E"),
    allow_class_f: grades.includes("F"),
  };
}

app.post("/import-tournaments", async (req, res) => {
  try {
    const response = await axios.get(LIST_URL);
    const $ = cheerio.load(response.data);

    const detailUrls = [];

    $("a").each((_, element) => {
      const href = $(element).attr("href");
      if (!href) return;

      const url = toAbsoluteUrl(href);
      if (!url) return;

      if (isTournamentDetailUrl(url) && !detailUrls.includes(url)) {
        detailUrls.push(url);
      }
    });

    const parsedResults = [];
    const savedResults = [];
    const skippedResults = [];

    for (const detailUrl of detailUrls) {
      const detailResponse = await axios.get(detailUrl);
      const detail$ = cheerio.load(detailResponse.data);

      const pageTitle = cleanText(detail$("title").first().text());
      const h1 = cleanText(detail$("h1").first().text());
      const bodyText = cleanText(detail$("body").text());
      const labeledItems = extractLabeledItems(detail$);

      const fileUrls = [];

      detail$("a").each((_, element) => {
        const href = detail$(element).attr("href");
        if (!href) return;

        const lower = href.toLowerCase();

        if (
          lower.includes(".pdf") ||
          lower.includes(".xlsx") ||
          lower.includes(".xls") ||
          lower.includes(".docx") ||
          lower.includes(".doc")
        ) {
          fileUrls.push(toAbsoluteUrl(href));
        }
      });

      const tournamentData = buildTournamentData({
        detailUrl,
        pageTitle,
        h1,
        labeledItems,
        bodyText,
        fileUrls,
      });

      parsedResults.push({
        source_url: detailUrl,
        title: tournamentData.title,
        event_date: tournamentData.event_date,
        venue: tournamentData.venue,
        raw_grade_text:
          findByLabel(labeledItems, ["級", "参加級", "対象"]) || null,
        guideline_file_name: tournamentData.guideline_file_name,
        guideline_file_path: tournamentData.guideline_file_path,
        allow_class_a: tournamentData.allow_class_a,
        allow_class_b: tournamentData.allow_class_b,
        allow_class_c: tournamentData.allow_class_c,
        allow_class_d: tournamentData.allow_class_d,
        allow_class_e: tournamentData.allow_class_e,
        allow_class_f: tournamentData.allow_class_f,
      });

      if (!tournamentData.title || tournamentData.title === "大会名未確認") {
        skippedResults.push({
          source_url: detailUrl,
          reason: "大会名を抽出できませんでした",
        });
        continue;
      }

      if (!tournamentData.event_date) {
        skippedResults.push({
          source_url: detailUrl,
          title: tournamentData.title,
          reason: "開催日を抽出できませんでした",
        });
        continue;
      }

      const { data, error } = await supabase
        .from("tournaments")
        .upsert(tournamentData, {
          onConflict: "source_url",
        })
        .select();

      if (error) {
        skippedResults.push({
          source_url: detailUrl,
          title: tournamentData.title,
          reason: error.message,
        });
        continue;
      }

      savedResults.push(...(data || []));
    }

    return res.json({
      success: true,
      targetListUrl: LIST_URL,
      foundDetailUrls: detailUrls.length,
      checkedCount: parsedResults.length,
      savedCount: savedResults.length,
      skippedCount: skippedResults.length,
      parsedResults,
      skippedResults,
      savedResults,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log("server started");
});
