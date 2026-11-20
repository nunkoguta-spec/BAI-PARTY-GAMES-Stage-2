// Centralized i18n — two languages: id (Bahasa Indonesia), de (Deutsch).
// Default: id. Persisted in localStorage. Reactive via listeners.

import { id } from "./id.js";
import { de } from "./de.js";

const STORAGE_KEY = "bai-lang";
const LANGUAGES = { id, de };
const VALID = ["id", "de"];
const DEFAULT = "id";

let current = loadLang();
const listeners = new Set();

function loadLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID.includes(stored)) return stored;
  } catch { /* ignore */ }
  return DEFAULT;
}

function saveLang(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch { /* ignore */ }
}

/** Get nested key like "host.heading" from translation dict */
function resolve(dict, key) {
  const parts = key.split(".");
  let node = dict;
  for (const part of parts) {
    if (node == null || typeof node !== "object") return undefined;
    node = node[part];
  }
  return node;
}

/**
 * Translate a key, with optional template vars.
 * t("host.loadingPlayer", { name: "Ali" }) → "Memuat Ali..."
 * Falls back to id, then returns key itself.
 */
export function t(key, vars) {
  let text = resolve(LANGUAGES[current], key);
  if (text === undefined) text = resolve(LANGUAGES[DEFAULT], key);
  if (text === undefined) return key;

  if (vars && typeof text === "string") {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

/** Current language code */
export function getLang() {
  return current;
}

/** Switch language. Notifies all listeners. */
export function setLang(lang) {
  if (!VALID.includes(lang)) return;
  if (lang === current) return;
  current = lang;
  saveLang(lang);
  for (const fn of listeners) {
    try { fn(lang); } catch (e) { console.error("[i18n] listener error:", e); }
  }
}

/** Register callback for language changes. Returns unsubscribe fn. */
export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** List of supported languages for UI */
export const SUPPORTED_LANGUAGES = [
  { code: "id", label: "🇮🇩 Bahasa Indonesia" },
  { code: "de", label: "🇩🇪 Deutsch" }
];
