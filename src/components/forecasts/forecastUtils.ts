import type { Forecast } from "@/lib/api/forecasts";

// 방향 — 서구식: 상승=녹·하락=적·보합=회. 색은 항상 글리프(▲▼▬) 동반.
export const DIR_META: Record<string, { glyph: string; label: string }> = {
  up: { glyph: "▲", label: "上昇" },
  down: { glyph: "▼", label: "下落" },
  flat: { glyph: "▬", label: "横ばい" },
};
// 방향 토큰 클래스(리터럴 — Tailwind JIT 스캔 대상). text=글리프/수치, badge=배지, spark=스파크라인 currentColor.
export const DIR_CLS: Record<string, { text: string; badge: string; spark: string }> = {
  up: { text: "text-direction-up", badge: "bg-direction-up/10 text-direction-up", spark: "text-direction-up" },
  down: { text: "text-direction-down", badge: "bg-direction-down/10 text-direction-down", spark: "text-direction-down" },
  flat: { text: "text-direction-flat", badge: "bg-direction-flat/10 text-direction-flat", spark: "text-direction-flat" },
};
export const dirCls = (dir: string | null | undefined) => DIR_CLS[dir ?? "flat"] ?? DIR_CLS.flat;

// 표시 라벨·순서 단일 소스(보드·카드·상세·admin 공통). metric_ref 불변 — 표시 레이어만.
// baseLabel 있는 권역 라벨 카드만 "기준 지표:" 캡션 의무(권역 일반화 근거 공개).
export type TargetMeta = { metric_ref: string; displayLabel: string; displayOrder: number; baseLabel?: string };
export const TARGET_META: TargetMeta[] = [
  { metric_ref: "WCI", displayLabel: "WCI", displayOrder: 1 },
  { metric_ref: "SCFI", displayLabel: "SCFI", displayOrder: 2 },
  { metric_ref: "KCCI", displayLabel: "KCCI", displayOrder: 3 },
  { metric_ref: "kita_sea_rates:부산-뉴욕", displayLabel: "釜山 → 北米東岸", displayOrder: 4, baseLabel: "KITA 釜山–ニューヨーク (USD/FEU)" },
  { metric_ref: "kita_sea_rates:부산-로테르담", displayLabel: "釜山 → 欧州", displayOrder: 5, baseLabel: "KITA 釜山–ロッテルダム (USD/FEU)" },
  { metric_ref: "WCI_SHA_RTM", displayLabel: "上海 → 欧州", displayOrder: 6, baseLabel: "Drewry WCI 上海–ロッテルダム" },
  { metric_ref: "kita_sea_rates:부산-로스앤젤레스", displayLabel: "釜山 → 北米西岸", displayOrder: 7, baseLabel: "KITA 釜山–ロサンゼルス (USD/FEU)" },
  { metric_ref: "WCI_SHA_LAX", displayLabel: "上海 → 北米西岸", displayOrder: 8, baseLabel: "Drewry WCI 上海–ロサンゼルス" },
  { metric_ref: "kita_sea_rates:부산-함부르크", displayLabel: "釜山 → ハンブルク", displayOrder: 9, baseLabel: "KITA 釜山–ハンブルク (USD/FEU)" },
];
const META_BY_REF = new Map(TARGET_META.map((m) => [m.metric_ref, m]));

export const FACTOR_LABEL: Record<string, string> = {
  momentum: "モメンタム",
  supply: "供給(船腹)",
  demand: "需要",
  cost: "コスト(燃料油)",
  pricing: "価格(運賃水準)",
};
export const MISSING_LABEL: Record<string, string> = {
  cost: "燃料油",
  pricing: "運賃の公示",
  demand: "需要",
  supply: "供給",
  momentum: "モメンタム",
};

// 지표 계열 — 시안의 '출처' 필터 대체(출처별 件수는 모호해 부정확).
export type SeriesClass = "KITA" | "KCCI" | "SCFI" | "WCI";
export const SERIES_LABEL: Record<SeriesClass, string> = {
  KITA: "KITA 路線",
  KCCI: "KCCI",
  SCFI: "SCFI",
  WCI: "WCI",
};
export function seriesClassOf(f: Forecast): SeriesClass | null {
  const ref = f.metric_ref ?? "";
  if (ref.startsWith("kita_sea_rates:")) return "KITA";
  if (ref === "KCCI") return "KCCI";
  if (ref === "SCFI") return "SCFI";
  if (ref.startsWith("WCI")) return "WCI";
  return null;
}

// 路線명 — kita면 "부산 → 도착지", 지수면 metric_ref.
export function routeName(f: Forecast): string {
  const ref = f.metric_ref ?? "";
  if (ref.startsWith("kita_sea_rates:")) {
    const lane = ref.slice("kita_sea_rates:".length);
    const i = lane.indexOf("-");
    return i >= 0 ? `${lane.slice(0, i)} → ${lane.slice(i + 1)}` : lane;
  }
  return ref || f.module;
}

// 표시 라벨(단일 소스). 미등록 metric_ref는 routeName 폴백.
export function displayLabelOf(f: Forecast): string {
  return META_BY_REF.get(f.metric_ref ?? "")?.displayLabel ?? routeName(f);
}
export function displayOrderOf(f: Forecast): number {
  return META_BY_REF.get(f.metric_ref ?? "")?.displayOrder ?? 999;
}
// 권역 라벨 카드 기준지표 캡션(지수 자체 WCI/SCFI/KCCI는 라벨=지표라 null).
export function baseIndexCaption(f: Forecast): string | null {
  const b = META_BY_REF.get(f.metric_ref ?? "")?.baseLabel;
  return b ? `基準指標: ${b}` : null;
}

// 필터 적용(URL 쿼리 状態 → 카드 필터). 순수 함수.
export type ForecastFilter = { cadence?: "weekly" | "monthly"; dir: string[]; series: string[] };
export function applyFilter(fs: Forecast[], f: ForecastFilter): Forecast[] {
  return fs.filter((x) => {
    if (f.cadence && x.cadence !== f.cadence) return false;
    if (f.dir.length && !(x.direction && f.dir.includes(x.direction))) return false;
    if (f.series.length) {
      const sc = seriesClassOf(x);
      if (!sc || !f.series.includes(sc)) return false;
    }
    return true;
  });
}

// 지표(metric_ref)별 최신 1件만 — 카드 표시 전용. 적중률·추이 등 분석엔 적용 금지(분모=전수 필요).
// 매주 생성된 見通し이 카드로 누적되는 것을 막아 지표당 "현재 見通し" 1장만 보이게 한다.
export function latestPerMetric(forecasts: Forecast[]): Forecast[] {
  const stamp = (x: Forecast) => x.published_at ?? x.created_at ?? "";
  const best = new Map<string, Forecast>();
  for (const f of forecasts) {
    const key = f.metric_ref ?? f.id;
    const cur = best.get(key);
    if (!cur || stamp(f) > stamp(cur)) best.set(key, f);
  }
  return [...best.values()];
}

// statement → 문장 배열(소수점·천단위 쉼표 오분할 방지: 종결부호 뒤 공백/끝만).
export function sentences(s: string): string[] {
  return (s || "").split(/(?<=[.!?。])\s+/).map((x) => x.trim()).filter(Boolean);
}

// /rates "최근 レポート" 인라인 카드용 — rates 모듈 published 見通し에서 파생.
// lead=첫 문장(항상 노출), outlook=나머지 문장(클릭 시 펼침). 제목은 metric_ref 기반(WCI 중복 제목 버그 방지).
export type RateReport = {
  id: string;
  title: string;
  indexCode: SeriesClass | null;
  date: string;
  lead: string;
  outlook: string;
};

// "최근 レポート"는 総合 지수 3종(WCI·SCFI·KCCI)만 노출 — 路線/권역 見通し은 제외.
const RATE_REPORT_CODES = ["WCI", "SCFI", "KCCI"];

export function recentRateReports(forecasts: Forecast[], limit = 3): RateReport[] {
  // 総合 지수 3종만 → 지표별 최신 1件(latestPerMetric)으로 dedup. 표시 전용이라 안전.
  const eligible = forecasts.filter(
    (f) => f.module === "rates" && RATE_REPORT_CODES.includes(f.metric_ref ?? ""),
  );
  const rows: { f: Forecast; r: RateReport }[] = [];
  for (const f of latestPerMetric(eligible)) {
    const stamp = f.published_at ?? f.created_at ?? "";
    const sents = sentences(f.statement ?? "");
    const lead = sents[0] ?? "";
    const outlook = sents.slice(1).join(" ");
    if (!lead.trim() && !outlook.trim()) continue; // lead·outlook 둘 다 비면 제외(빈 껍데기 금지)
    rows.push({
      f,
      r: {
        id: f.id,
        title: displayLabelOf(f),
        indexCode: seriesClassOf(f),
        date: stamp.slice(0, 10),
        lead,
        outlook,
      },
    });
  }
  rows.sort(
    (a, b) =>
      b.r.date.localeCompare(a.r.date) || // 최신 발행일 순
      displayOrderOf(a.f) - displayOrderOf(b.f) || // 동일 발행일 tiebreak
      a.r.id.localeCompare(b.r.id),
  );
  return rows.slice(0, limit).map((x) => x.r);
}

export function dDay(horizon: string | null | undefined): string | null {
  if (!horizon) return null;
  const d = Math.round((Date.parse(`${horizon}T00:00:00Z`) - Date.now()) / 86400000);
  return d >= 0 ? `D-${d}` : `D+${-d}`;
}
export const mdLabel = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

// 근거 N/5 — non-missing 팩터 수.
export function evidenceCount(f: Forecast): { present: number; total: number } {
  const fs = f.factor_scores ?? [];
  return { present: fs.filter((x) => !x.missing && x.score != null).length, total: fs.length || 5 };
}
export function missingNames(f: Forecast): string[] {
  return (f.factor_scores ?? []).filter((x) => x.missing).map((x) => MISSING_LABEL[x.factor] ?? x.factor);
}

// 방향 강도(확률 아님) — composite |점수|/2 → 0~100%, 부호로 방향. 더미 금지·방법론 준수.
export function directionStrength(
  score: number | null | undefined,
  direction?: string | null,
): { dir: "up" | "down" | "flat"; pct: number; label: string } {
  const s = score ?? 0;
  const dir = (direction as "up" | "down" | "flat" | null) ?? (s >= 0.4 ? "up" : s <= -0.4 ? "down" : "flat");
  const pct = Math.round(Math.min(Math.abs(s) / 2, 1) * 100);
  return { dir, pct, label: dir === "up" ? "上昇" : dir === "down" ? "下落" : "横ばい" };
}

// 전 見通し watch_points 통합 → 다가오는 이벤트 캘린더(실 일정만, 중복 제거).
export function upcomingEvents(
  forecasts: Forecast[],
  now = Date.now(),
  limit = 6,
): { due: string; source: string; label: string }[] {
  const today = new Date(now).toISOString().slice(0, 10);
  const seen = new Set<string>();
  const out: { due: string; source: string; label: string }[] = [];
  for (const f of forecasts) {
    for (const w of f.watch_points ?? []) {
      if (!w.due || w.due < today) continue;
      const k = `${w.due}|${w.source}|${w.label}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(w);
    }
  }
  out.sort((a, b) => a.due.localeCompare(b.due));
  return out.slice(0, limit);
}

// ─── KPI 산출(전부 실데이터, 더미 0) ───
const DAY = 86400000;
const weekStartMonday = (now = Date.now()) => {
  const d = new Date(now);
  const dow = (d.getUTCDay() + 6) % 7; // 월=0
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow);
};

export type Kpis = {
  hitRate: { rate: number | null; sample: number; gate: boolean }; // gate=표본<10
  publishedThisWeek: number;
  awaitingJudgment: number; // published & horizon 미도래
  avgEvidence: number | null; // N/5
  leadTimeDays: number | null;
};

export function computeKpis(forecasts: Forecast[], now = Date.now()): Kpis {
  const todayIso = new Date(now).toISOString().slice(0, 10);
  // 적중률 — 최근 12주 resolved
  const resolved12 = forecasts.filter(
    (f) => f.status === "resolved" && f.resolved_at && Date.parse(f.resolved_at) >= now - 12 * 7 * DAY,
  );
  const hit = resolved12.filter((f) => f.outcome === "hit").length;
  const partial = resolved12.filter((f) => f.outcome === "partial").length;
  const sample = resolved12.length;
  const rate = sample > 0 ? Math.round(((hit + partial * 0.5) / sample) * 100) : null;

  const published = forecasts.filter((f) => f.status === "published" || f.status === "resolved");
  const ws = weekStartMonday(now);
  const publishedThisWeek = forecasts.filter((f) => f.published_at && Date.parse(f.published_at) >= ws).length;
  const awaitingJudgment = forecasts.filter(
    (f) => f.status === "published" && f.horizon_date && f.horizon_date > todayIso,
  ).length;

  const evs = published.map((f) => evidenceCount(f).present);
  const avgEvidence = evs.length ? Math.round((evs.reduce((a, b) => a + b, 0) / evs.length) * 10) / 10 : null;

  const leads = forecasts
    .filter((f) => f.published_at && f.created_at)
    .map((f) => (Date.parse(f.published_at as string) - Date.parse(f.created_at)) / DAY)
    .filter((d) => d >= 0);
  const leadTimeDays = leads.length ? Math.round((leads.reduce((a, b) => a + b, 0) / leads.length) * 10) / 10 : null;

  return {
    hitRate: { rate, sample, gate: sample < 10 },
    publishedThisWeek,
    awaitingJudgment,
    avgEvidence,
    leadTimeDays,
  };
}

// 주간 방향 적중률 추이 — 각 주말 시점의 트레일링 12주 적중률(분모 = resolved 전수, 표본 빼기 금지).
export type HitTrendPoint = { label: string; rate: number | null; sample: number };
export function hitRateTrend(forecasts: Forecast[], weeks = 12, now = Date.now()): HitTrendPoint[] {
  const ws = weekStartMonday(now);
  const pts: HitTrendPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = ws - i * 7 * DAY + 7 * DAY; // 해당 주 종료(배타)
    const resolved = forecasts.filter(
      (f) =>
        f.status === "resolved" &&
        f.resolved_at &&
        Date.parse(f.resolved_at) < end &&
        Date.parse(f.resolved_at) >= end - 12 * 7 * DAY,
    );
    const hit = resolved.filter((f) => f.outcome === "hit").length;
    const partial = resolved.filter((f) => f.outcome === "partial").length;
    const sample = resolved.length;
    const d = new Date(end - 7 * DAY);
    pts.push({
      label: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`,
      rate: sample ? Math.round(((hit + partial * 0.5) / sample) * 100) : null,
      sample,
    });
  }
  return pts;
}
