export function normalizePhoneNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeSearchValue(value) {
  return String(value || "").trim().toLowerCase();
}
