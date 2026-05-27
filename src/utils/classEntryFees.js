export const CLASS_ENTRY_FEES = {
  a: 2500,
  b: 2500,
  c: 2000,
  d: 2000,
  e: 1500,
};

export function normalizeClassFeeCode(code) {
  return String(code || "")
    .trim()
    .replace("級", "")
    .toLowerCase();
}

export function formatYen(value) {
  if (value === null || value === undefined || value === "") return "未設定";

  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return String(value);

  return `${numberValue.toLocaleString("ja-JP")}円`;
}

export function getClassEntryFee(code) {
  const normalized = normalizeClassFeeCode(code);
  return CLASS_ENTRY_FEES[normalized] ?? null;
}

export function getClassEntryFeeText(code) {
  const fee = getClassEntryFee(code);
  return fee === null ? "未設定" : formatYen(fee);
}

export function getSelectedClassEntryFeeText(tournament, classLevels) {
  const lines = getSelectedClassEntryFeeItems(tournament, classLevels)
    .map((item) => `${item.label}：${item.feeText}`);

  return lines.length > 0 ? lines.join(" / ") : "未設定";
}

export function getSelectedClassEntryFeeItems(tournament, classLevels) {
  return (classLevels || [])
    .filter((classLevel) => {
      const code = normalizeClassFeeCode(classLevel.code);
      return code && tournament?.[`allow_class_${code}`] === true;
    })
    .map((classLevel) => {
      const label = classLevel.name || `${String(classLevel.code || "").toUpperCase()}級`;
      return {
        code: normalizeClassFeeCode(classLevel.code),
        label,
        feeText: getClassEntryFeeText(classLevel.code),
      };
    });
}

export function getFormClassEntryFeeItems(form, classOptions) {
  return (classOptions || [])
    .filter((classOption) => form?.[classOption.key])
    .map((classOption) => {
      const code = classOption.key.replace("allow_class_", "");

      return {
        code,
        label: classOption.label,
        feeText: getClassEntryFeeText(code),
      };
    });
}

export function getDefaultEntryFeeForTournament(form) {
  const selectedFees = Object.entries(CLASS_ENTRY_FEES)
    .filter(([code]) => form?.[`allow_class_${code}`])
    .map(([, fee]) => fee);

  return selectedFees.length > 0 ? Math.min(...selectedFees) : 2500;
}
