export const TOURNAMENT_FILE_BUCKET = "tournament-files";

export const MAX_GUIDELINE_FILE_SIZE = 10 * 1024 * 1024;

export const ALLOWED_GUIDELINE_MIME_TYPES = ["application/pdf"];

export const GUIDELINE_FILE_ACCEPT = "application/pdf,.pdf";

export function getFileExtension(fileName) {
  if (!fileName) return "";

  const normalizedName = String(fileName).trim().toLowerCase();
  const extensionIndex = normalizedName.lastIndexOf(".");

  if (extensionIndex < 0) return "";

  return normalizedName.slice(extensionIndex + 1);
}

export function validateGuidelineFile(file) {
  if (!file) return "";

  if (file.size > MAX_GUIDELINE_FILE_SIZE) {
    return "要項ファイルは10MB以下にしてください。";
  }

  const hasPdfMimeType = ALLOWED_GUIDELINE_MIME_TYPES.includes(file.type);
  const hasPdfExtension = getFileExtension(file.name) === "pdf";

  if (!hasPdfMimeType && !hasPdfExtension) {
    return "アップロードできる要項ファイルはPDFのみです。";
  }

  return "";
}

export function buildGuidelineFilePath(tournamentId, fileName) {
  const timestamp = Date.now();
  const extension = getFileExtension(fileName) || "pdf";

  return `tournament-guidelines/${tournamentId}/${timestamp}-guideline.${extension}`;
}

export function getGuidelineContentType(file) {
  if (ALLOWED_GUIDELINE_MIME_TYPES.includes(file?.type)) {
    return file.type;
  }

  return "application/pdf";
}
