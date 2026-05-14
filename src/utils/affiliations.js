export function sortAffiliationsByKana(affiliations) {
  return [...(affiliations ?? [])].sort((a, b) => {
    const kanaA = a?.name_kana || a?.name || "";
    const kanaB = b?.name_kana || b?.name || "";
    const kanaCompare = kanaA.localeCompare(kanaB, "ja");

    if (kanaCompare !== 0) return kanaCompare;

    return (a?.name || "").localeCompare(b?.name || "", "ja");
  });
}
