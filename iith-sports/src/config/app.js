/* ============================================================
   APP-WIDE SETTINGS — edit these each season
   ============================================================ */
export const APP_NAME = "IITH Sports Council";
export const SEASON_START = "2026-09-21";
export const SEASON_END = "2027-06-30";
// Placeholder — set the real InterIIT Sports Meet start date.
export const MEET_DATE = "2026-12-14";
export const MEET_NAME = "InterIIT Sports Meet";

// Teams below this season attendance % are flagged on the council board.
export const ATTENDANCE_TARGET = 78;

/* ---------- sessions ---------- */
export const SESSION_SLOTS = ["morning", "evening"];
export const SLOT_LABEL = { morning: "Morning", evening: "Evening" };
export const NOPRACTICE_ID = "__NOPRACTICE__";

// `escape` is kept as the database value so existing hockey data still works.
export const STATUS = {
  present: { label: "Present", color: "#1c7a4a", bg: "#e2f2e8", points: 1 },
  late: { label: "Late", color: "#b87d00", bg: "#fbf0d6", points: 0.5 },
  absent: { label: "Absent", color: "#c23b30", bg: "#fbe5e2", points: -1 },
  escape: { label: "Left early", color: "#7a2320", bg: "#f3dede", points: -2 },
};
export const ATTENDED = ["present", "late"];

/* ---------- scoring (same model as the hockey app) ---------- */
export const WEIGHTS = { rating: 0.4, team: 0.3, att: 0.3 };
export const PRESEASON_PRIOR = 2;
export const MATCH_DAY_MISS_PENALTY = 0.4;
export const MATCH_DAY_MISS_PENALTY_CAP = 2.0;
export const DEFAULT_MATCH_DAYS = [0, 6]; // Sunday, Saturday

export const CATEGORIES = ["Men", "Women", "Mixed"];
export const GENDERS = { M: "Male", F: "Female", X: "Other" };

export const ROLES = { council: "Sports council", coach: "Coach / captain", player: "Athlete" };
