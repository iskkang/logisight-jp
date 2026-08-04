// 見通し(Forecast) 페이지 — 사용자 제공 샘플(LogisightForecast) 디자인을 실데이터에 연결.
// 데이터/헬퍼는 기존 /forecasts 와 동일(published forecasts + series + forecastUtils). 표현만 샘플 디자인.
import { useId } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { InsightSubNav } from "@/components/insight/InsightSubNav";
import { publishedForecastsQueryOptions, forecastSeriesQueryOptions, MODULE_LABEL, type Forecast, type ForecastSeries } from "@/lib/api/forecasts";
import { eurasiaRailBriefQueryOptions } from "@/lib/api/eurasia-rail-brief";
import { GeoArticleSchema } from "@/components/geo/GeoArticleSchema";
import {
  DIR_META,
  applyFilter,
  baseIndexCaption,
  computeKpis,
  dDay,
  displayLabelOf,
  displayOrderOf,
  evidenceCount,
  hitRateTrend,
  latestPerMetric,
  sentences,
  type ForecastFilter,
} from "@/components/forecasts/forecastUtils";

const WRAP = "mx-auto w-full max-w-[1240px] px-4 min-[640px]:px-7";
const CARD = "rounded-[14px] border border-[#d8dfe9] bg-[#f4f7fb] shadow-[0_1px_2px_rgba(16,24,40,0.04)]";
const FONT = "Pretendard, system-ui, sans-serif";

const STYLE = `
.lsgf-root{font-family:"Pretendard","Pretendard Variable",system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;-webkit-font-smoothing:antialiased;letter-spacing:-.01em}
.lsg-mono{font-feature-settings:"tnum" 1;letter-spacing:0}
.lsg-ls{background:linear-gradient(95deg,#fff 35%,#2dd4bf);-webkit-background-clip:text;background-clip:text;color:transparent}
@media (prefers-reduced-motion:reduce){.lsgf-root [data-anim]{display:none}}
`;

const routeApi = getRouteApi("/forecasts");

/* ---------- helpers ---------- */
function isUp(dir: string | null | undefined): boolean { return dir === "up"; }
function confPct(c: Forecast["confidence"]): number { return c === "high" ? 80 : c === "medium" ? 55 : c === "low" ? 30 : 0; }
function fmtKstStamp(iso: string | null): string {
  if (!iso) return "収集中";
  return iso.slice(0, 16).replace("T", " ") + " KST";
}

// 카드 리드 전용: 본문 첫 문장의 추세 종결구를 간결한 状態구로 치환(미리보기 한정 — 상세 본문은 원문 유지).
const LEAD_ENDINGS: ReadonlyArray<readonly [RegExp, string]> = [
  [/(상승\s*우세\s*국면)을\s*나타냈다\.?$/, "$1"],
  [/(하락\s*우세\s*국면)을\s*나타냈다\.?$/, "$1"],
  [/(보합\s*우세\s*국면)을\s*나타냈다\.?$/, "$1"],
  [/오름세가\s*이어지고\s*있다\.?$/, "상승세 이어짐"],
  [/하락세가\s*이어지고\s*있다\.?$/, "하락세 이어짐"],
  [/오름세를\s*이어왔다\.?$/, "상승세 이어짐"],
  [/하락세를\s*이어왔다\.?$/, "하락세 이어짐"],
  [/내림세를\s*이어왔다\.?$/, "하락세 이어짐"],
  [/오름세를\s*나타냈다\.?$/, "상승중"],
  [/하락세를\s*나타냈다\.?$/, "하락중"],
  [/내림세를\s*나타냈다\.?$/, "하락중"],
  [/보합세를\s*(나타냈다|이어왔다)\.?$/, "보합"],
];
function cardLead(statement: string | null | undefined): string {
  const first = sentences(statement ?? "")[0] ?? (statement ?? "");
  for (const [re, rep] of LEAD_ENDINGS) {
    if (re.test(first)) return first.replace(re, rep).replace(/\s*\.+$/, "");
  }
  return first;
}

/* ---------- spark / dots / donut ---------- */
function Spark({ vals, color, className }: { vals: number[]; color: string; className?: string }) {
  const rawId = useId();
  const id = "sp" + rawId.replace(/[^a-zA-Z0-9]/g, "");
  if (vals.length < 2) return null;
  const w = 120, h = 38, min = Math.min(...vals), max = Math.max(...vals), rng = max - min || 1;
  const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * w).toFixed(1)},${(h - ((v - min) / rng) * (h - 4) - 2).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.22" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polygon points={`${pts} ${w},${h} 0,${h}`} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Dots({ n, total = 5 }: { n: number; total?: number }) {
  return <span className="inline-flex gap-[3px]">{Array.from({ length: total }).map((_, i) => <i key={i} className={`h-[6px] w-[6px] rounded-full ${i < n ? "bg-[#0d9488]" : "bg-[#cfd8e3]"}`} />)}</span>;
}
function Donut({ pct }: { pct: number }) {
  const r = 34, c = 2 * Math.PI * r, dash = (pct / 100) * c;
  return (
    <svg width="84" height="84" viewBox="0 0 84 84">
      <circle cx="42" cy="42" r={r} fill="none" stroke="#dde4ee" strokeWidth="9" />
      <circle cx="42" cy="42" r={r} fill="none" stroke="#16a34a" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${dash.toFixed(1)} ${c.toFixed(1)}`} transform="rotate(-90 42 42)" />
      <text x="42" y="47" textAnchor="middle" fontSize="17" fontWeight="800" fill="#1a2433" fontFamily={FONT}>{pct}%</text>
    </svg>
  );
}

/* ---------- forecast detail chart (실 시계열 + 見通し cone) ---------- */
function ForecastDetailChart({ series, f }: { series?: ForecastSeries; f: Forecast }) {
  const pts = series?.points ?? [];
  if (pts.length < 2) return <div className="grid h-[200px] place-items-center text-[12px] text-[#828d9d]">見通しデータを収集中</div>;
  const last = pts[pts.length - 1].value;
  const lo = f.range_low_pct, hi = f.range_high_pct;
  const projHi = hi != null ? last * (1 + hi / 100) : last;
  const projLo = lo != null ? last * (1 + lo / 100) : last;
  const projMid = (projHi + projLo) / 2;

  const W = 620, H = 240, pL = 46, pR = 14, pT = 16, pB = 26, iw = W - pL - pR, ih = H - pT - pB;
  const all = [...pts.map((p) => p.value), projHi, projLo];
  let yMin = Math.min(...all), yMax = Math.max(...all);
  const pad = (yMax - yMin || 1) * 0.12; yMin -= pad; yMax += pad;
  const n = pts.length, stepX = iw / n; // 한 칸 더 두고 그 자리에 見通し점
  const X = (i: number) => pL + i * stepX;
  const Y = (v: number) => pT + (1 - (v - yMin) / (yMax - yMin)) * ih;
  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(yMin + t * (yMax - yMin)));
  const histPts = pts.map((p, i) => `${X(i).toFixed(1)},${Y(p.value).toFixed(1)}`).join(" ");
  const lastX = X(n - 1), lastY = Y(last), projX = X(n);
  const up = isUp(f.direction);
  const projColor = up ? "#16a34a" : f.direction === "down" ? "#dc2626" : "#94a3b8";
  const dateTicks = [0, Math.floor((n - 1) / 3), Math.floor((2 * (n - 1)) / 3), n - 1].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
      <defs>
        <linearGradient id="lsgf-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0d9488" stopOpacity="0.18" /><stop offset="100%" stopColor="#0d9488" stopOpacity="0" /></linearGradient>
        <linearGradient id="lsgf-cone" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={projColor} stopOpacity="0.16" /><stop offset="100%" stopColor={projColor} stopOpacity="0.03" /></linearGradient>
      </defs>
      {gridVals.map((g) => (
        <g key={g}>
          <line x1={pL} y1={Y(g)} x2={W - pR} y2={Y(g)} stroke="#dbe2ec" strokeWidth="1" />
          <text x={pL - 9} y={Y(g) + 3} textAnchor="end" fontSize="10" fill="#828d9d" fontFamily={FONT}>{g.toLocaleString()}</text>
        </g>
      ))}
      <polygon points={`${lastX.toFixed(1)},${lastY.toFixed(1)} ${projX.toFixed(1)},${Y(projHi).toFixed(1)} ${projX.toFixed(1)},${Y(projLo).toFixed(1)}`} fill="url(#lsgf-cone)" />
      <polygon points={`${histPts} ${lastX.toFixed(1)},${(pT + ih).toFixed(1)} ${X(0).toFixed(1)},${(pT + ih).toFixed(1)}`} fill="url(#lsgf-area)" />
      <line x1={lastX.toFixed(1)} y1={pT} x2={lastX.toFixed(1)} y2={pT + ih} stroke="#c7d0dc" strokeWidth="1" strokeDasharray="3 4" />
      <text x={(lastX + 6).toFixed(1)} y={pT + ih - 8} fontSize="10" fill="#0d9488" fontFamily={FONT} fontWeight="600">見通し区間</text>
      <polyline points={histPts} fill="none" stroke="#0d9488" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`${lastX.toFixed(1)},${lastY.toFixed(1)} ${projX.toFixed(1)},${Y(projMid).toFixed(1)}`} fill="none" stroke={projColor} strokeWidth="2.4" strokeDasharray="6 5" strokeLinecap="round" />
      <circle cx={projX.toFixed(1)} cy={Y(projMid).toFixed(1)} r="4" fill={projColor} />
      {f.expected_range_pct && (
        <text x={W - pR - 6} y={pT + 11} textAnchor="end" fontFamily={FONT} className="lsg-mono">
          <tspan fontSize="13" fontWeight="800" fill={up ? "#067647" : "#54606f"}>{Math.round(projMid).toLocaleString()}</tspan>
          <tspan fontSize="11" fontWeight="600" fill={projColor} dx="6">{f.expected_range_pct}</tspan>
        </text>
      )}
      {dateTicks.map((i) => <text key={i} x={X(i).toFixed(1)} y={H - 7} textAnchor="middle" fontSize="9" fill="#828d9d" fontFamily={FONT}>{pts[i].date.slice(5)}</text>)}
      {f.horizon_date && <text x={projX.toFixed(1)} y={H - 7} textAnchor="middle" fontSize="9" fill="#0d9488" fontFamily={FONT} fontWeight="600">{f.horizon_date.slice(5)} 판정</text>}
    </svg>
  );
}

/* ============================ HERO ============================ */
function Hero({ kpis, lastUpdated, modules, activeModule, onModule }: {
  kpis: ReturnType<typeof computeKpis>; lastUpdated: string | null;
  modules: { key: string; label: string }[]; activeModule: string | null; onModule: (k: string | null) => void;
}) {
  const pills: { c: string; label: string; value: string }[] = [
    { c: "bg-[#2dd4bf]", label: "今週の発行", value: `${kpis.publishedThisWeek}件` },
    { c: "bg-[#d97706]", label: "判定待ち", value: `${kpis.awaitingJudgment}件` },
    { c: "bg-[#3b82f6]", label: "最終更新", value: fmtKstStamp(lastUpdated) },
  ];
  return (
    <section className="relative overflow-hidden bg-[#070b16]">
      <div className="pointer-events-none absolute inset-0">
        <svg className="absolute right-[1%] top-1/2 w-[560px] max-w-[54%] -translate-y-1/2 opacity-90 max-[640px]:opacity-50" viewBox="0 0 560 420" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <radialGradient id="lsgf-glow" cx="50%" cy="46%" r="55%"><stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.16" /><stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" /></radialGradient>
            <linearGradient id="lsgf-cn" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.26" /><stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.02" /></linearGradient>
            <linearGradient id="lsgf-ha" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.22" /><stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" /></linearGradient>
          </defs>
          <circle cx="280" cy="200" r="210" fill="url(#lsgf-glow)" />
          <g stroke="rgba(120,170,205,.14)" strokeWidth="1">
            <line x1="40" y1="320" x2="540" y2="320" /><line x1="40" y1="240" x2="540" y2="240" /><line x1="40" y1="160" x2="540" y2="160" /><line x1="40" y1="80" x2="540" y2="80" />
            <line x1="40" y1="40" x2="40" y2="360" /><line x1="160" y1="40" x2="160" y2="360" /><line x1="280" y1="40" x2="280" y2="360" /><line x1="400" y1="40" x2="400" y2="360" />
          </g>
          <path d="M340 150 L540 70 L540 230 Z" fill="url(#lsgf-cn)" />
          <path d="M40 300 L120 290 L200 250 L280 270 L340 150 L340 360 L40 360 Z" fill="url(#lsgf-ha)" opacity="0.6" />
          <polyline points="40,300 120,290 200,250 280,270 340,150" fill="none" stroke="#2dd4bf" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="340,150 440,120 540,96" fill="none" stroke="#2dd4bf" strokeWidth="2.2" strokeDasharray="6 6" strokeLinecap="round" />
          <line x1="340" y1="40" x2="340" y2="360" stroke="rgba(45,212,191,.45)" strokeWidth="1" strokeDasharray="3 4" />
          <g fill="#2dd4bf"><circle cx="200" cy="250" r="3" /><circle cx="280" cy="270" r="3" /></g>
          <circle cx="340" cy="150" r="5" fill="#070b16" stroke="#2dd4bf" strokeWidth="2" />
          <circle cx="540" cy="96" r="4.5" fill="#2dd4bf" />
          <circle data-anim cx="540" cy="96" r="4.5" fill="none" stroke="#2dd4bf" strokeWidth="1.4" opacity="0.5"><animate attributeName="r" from="4.5" to="13" dur="2.4s" repeatCount="indefinite" /><animate attributeName="opacity" from="0.5" to="0" dur="2.4s" repeatCount="indefinite" /></circle>
        </svg>
        <div className="absolute inset-0" style={{ background: "radial-gradient(110% 80% at 82% 35%, rgba(45,212,191,.12), transparent 55%), linear-gradient(90deg, #070b16 38%, rgba(7,11,22,.5) 66%, transparent 100%)" }} />
      </div>
      <div className={`${WRAP} relative z-[1]`}>
        <div className="max-w-[760px] pt-[58px] pb-[68px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#2dd4bf]">Verified Forecast</span>
          <h1 className="mt-3.5 text-[clamp(32px,4.4vw,50px)] font-extrabold leading-[1.06] tracking-[-0.035em] text-[#e9eef7]">物流市場 <span className="text-[#2dd4bf]">見通し</span></h1>
          <p className="mt-4 max-w-[640px] text-[15px] leading-[1.6] text-[#93a1b7]">Logisight AI が現在と過去のデータを分析し、運賃の方向を見通します。</p>
          {modules.length > 0 && (
            <div className="mt-[18px] flex flex-wrap gap-2">
              <button type="button" onClick={() => onModule(null)} className={`rounded-full border px-3 py-[5px] text-[12px] ${activeModule == null ? "border-[#2dd4bf73] bg-[#0e2a2a] text-[#2dd4bf]" : "border-[#78a0cd1c] bg-[#0e1626] text-[#93a1b7]"}`}>전체</button>
              {modules.map((m) => (
                <button key={m.key} type="button" onClick={() => onModule(m.key)} className={`rounded-full border px-3 py-[5px] text-[12px] ${activeModule === m.key ? "border-[#2dd4bf73] bg-[#0e2a2a] text-[#2dd4bf]" : "border-[#78a0cd1c] bg-[#0e1626] text-[#93a1b7]"}`}>{m.label}</button>
              ))}
            </div>
          )}
          <div className="mt-[22px] flex flex-wrap gap-2.5">
            {pills.map((p) => (
              <span key={p.label} className="inline-flex items-center gap-2 rounded-full border border-[#78a0cd1c] bg-[#0e1626] px-[13px] py-[7px] text-[12.5px] text-[#93a1b7]">
                <span className={`h-[7px] w-[7px] rounded-full ${p.c}`} />{p.label} <b className="lsg-mono text-[#e9eef7]">{p.value}</b>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================ KPIs ============================ */
function Kpis({ kpis }: { kpis: ReturnType<typeof computeKpis> }) {
  const items = [
    { lab: "方向的中率(12週)", ic: "✓", bg: "#16a34a", v: kpis.hitRate.gate ? "集計中" : `${kpis.hitRate.rate}%`, num: false, s: kpis.hitRate.gate ? `判定サンプル ${kpis.hitRate.sample}/10` : `${kpis.hitRate.sample}件 판정 기준` },
    { lab: "今週の発行", ic: "+", bg: "#0d9488", v: `${kpis.publishedThisWeek}件`, num: true, s: "校閲を通過して発行" },
    { lab: "判定待ち", ic: "⏳", bg: "#d97706", v: `${kpis.awaitingJudgment}件`, num: true, s: "確認予定日の前" },
    { lab: "根拠データ 平均", ic: "◉", bg: "#3b82f6", v: kpis.avgEvidence != null ? `${kpis.avgEvidence}/5` : "—", num: true, s: "発行済みの見通しが基準" },
    { lab: "平均リードタイム", ic: "→", bg: "#64748b", v: kpis.leadTimeDays != null ? `${kpis.leadTimeDays}日` : "—", num: true, s: "発行 → 判定" },
  ];
  return (
    <div className="mt-[22px] grid grid-cols-1 gap-3.5 min-[640px]:grid-cols-3 min-[1080px]:grid-cols-5">
      {items.map((k) => (
        <div key={k.lab} className={`p-[18px] ${CARD}`}>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#828d9d]">{k.lab}</span>
            <span className="grid h-6 w-6 place-items-center rounded-[7px] text-[12px] text-white" style={{ background: k.bg }}>{k.ic}</span>
          </div>
          <div className={`mt-2.5 font-extrabold tracking-[-0.02em] text-[#1a2433] ${k.num ? "lsg-mono text-[26px]" : "text-[21px]"}`}>{k.v}</div>
          <div className="mt-1 text-[11.5px] text-[#828d9d]">{k.s}</div>
        </div>
      ))}
    </div>
  );
}

/* ============================ TREND ============================ */
function TrendBlock({ trend }: { trend: ReturnType<typeof hitRateTrend> }) {
  const hasTrend = trend.some((p) => p.sample > 0);
  return (
    <div className={`mt-3.5 px-[22px] py-5 ${CARD}`}>
      <div className="mb-2.5 flex items-center gap-2.5">
        <b className="text-[16px] font-bold text-[#1a2433]">週次の方向的中率の推移</b>
        <span className="rounded-full border border-[#d8dfe9] bg-[#eef1f6] px-[9px] py-[3px] text-[11px] text-[#828d9d]">直近12週 · 分母は発行全件</span>
      </div>
      {hasTrend ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#dde4ee" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#828d9d" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickFormatter={(v: number) => `${v}%`} width={40} tick={{ fontSize: 10, fill: "#828d9d" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: number) => [`${v}%`, "方向的中率"]} contentStyle={{ background: "#fff", border: "1px solid #d8dfe9", borderRadius: 8, fontSize: 12 }} />
            <ReferenceLine y={60} stroke="#828d9d" strokeDasharray="4 4" label={{ value: "目標 60%", position: "insideTopRight", fontSize: 10, fill: "#828d9d" }} />
            <Line dataKey="rate" stroke="#16a34a" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="relative h-32 overflow-hidden rounded-[10px] border border-[#d8dfe9] bg-gradient-to-b from-[#eef2f8] to-[#f4f7fb]">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3px]">
            <b className="text-[13px] font-semibold text-[#54606f]">データ収集中</b>
            <span className="text-[11.5px] text-[#828d9d]">判定済みの見通しが貯まると、週次の的中率推移を表示します。</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ FILTERS ============================ */
const CAD_SEG = ["すべて", "週次", "月次"] as const;
const DIR_SEG = ["すべての方向", "上昇", "横ばい", "下落"] as const;
function Seg<T extends string>({ items, value, onChange }: { items: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex gap-[3px] rounded-[9px] border border-[#d8dfe9] bg-[#e7ecf3] p-[3px]">
      {items.map((t) => (
        <button key={t} type="button" onClick={() => onChange(t)} className={t === value ? "rounded-[6px] bg-white px-[13px] py-[5px] text-[12.5px] font-semibold text-[#0d9488] shadow-[0_1px_2px_rgba(16,24,40,0.08)]" : "rounded-[6px] px-[13px] py-[5px] text-[12.5px] text-[#54606f]"}>{t}</button>
      ))}
    </div>
  );
}

/* ============================ CARDS ============================ */
function ForecastCards({ cards, series, selectedId, onSelect }: {
  cards: Forecast[]; series: Record<string, ForecastSeries>; selectedId: string | null; onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-3.5 grid grid-cols-1 gap-3.5 min-[640px]:grid-cols-2 min-[1080px]:grid-cols-3">
      {cards.map((c) => {
        const up = isUp(c.direction);
        const dir = DIR_META[c.direction ?? "flat"] ?? DIR_META.flat;
        const ev = evidenceCount(c);
        const sp = (series[c.id]?.points ?? []).map((p) => p.value).slice(-8);
        const src = baseIndexCaption(c);
        return (
          <div
            key={c.id}
            role="button"
            tabIndex={0}
            aria-pressed={c.id === selectedId}
            aria-label={`${displayLabelOf(c)} 見通しの詳細`}
            onClick={() => onSelect(c.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(c.id);
              }
            }}
            className={`cursor-pointer p-[18px] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 ${CARD} ${c.id === selectedId ? "!border-[#0d9488] shadow-[0_0_0_1px_#0d9488,0_6px_18px_-10px_rgba(13,148,136,0.4)]" : "hover:border-[#c8d2df]"}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-extrabold text-[#1a2433]">{displayLabelOf(c)}</span>
              <span className={`inline-flex items-center gap-1 rounded-[6px] px-2 py-[3px] text-[11.5px] font-bold ${up ? "border border-[#c7ead6] bg-[#ecfdf3] text-[#067647]" : c.direction === "down" ? "border border-[#fbd5d5] bg-[#fef2f2] text-[#dc2626]" : "border border-[#d8dfe9] bg-[#eef1f6] text-[#54606f]"}`}>{dir.glyph} {c.expected_range_pct ?? dir.label}</span>
            </div>
            <div className="mt-2 flex items-center gap-2"><span className="text-[11.5px] text-[#828d9d]">根拠 {ev.present}/{ev.total}</span><Dots n={ev.present} total={ev.total} /></div>
            {sp.length > 1 && <Spark vals={sp} color={up ? "#16a34a" : c.direction === "down" ? "#dc2626" : "#94a3b8"} className="my-[10px] block h-[38px] w-full" />}
            <p className="mt-2 text-[12.5px] leading-[1.55] text-[#54606f]">{cardLead(c.statement)}</p>
            {src && <div className="mt-[9px] text-[11px] text-[#828d9d]">基準指標: {src}</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ============================ DETAIL ============================ */
function DetailPanel({ f, series }: { f: Forecast; series?: ForecastSeries }) {
  const up = isUp(f.direction);
  const dir = DIR_META[f.direction ?? "flat"] ?? DIR_META.flat;
  const insights = sentences(f.statement);
  const dd = dDay(f.horizon_date);
  const cadenceLabel = f.cadence === "weekly" ? "週次" : f.cadence === "monthly" ? "月次" : "—";
  const dirColor = up ? "text-[#16a34a]" : f.direction === "down" ? "text-[#dc2626]" : "text-[#54606f]";
  return (
    <div className={`mt-3.5 p-6 ${CARD}`}>
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-[#828d9d]">{displayLabelOf(f)} · {cadenceLabel}</span>
        <span className="flex items-center gap-2 text-[11.5px]">
          {f.horizon_date && <span className="rounded-full border border-[#d8dfe9] bg-[#eef1f6] px-[9px] py-[3px] lsg-mono text-[#54606f]">判定 {f.horizon_date.slice(5)}</span>}
          {dd && <span className="rounded-full border border-[#c7ead6] bg-[#ecfdf3] px-[9px] py-[3px] lsg-mono font-semibold text-[#067647]">{dd}</span>}
        </span>
      </div>
      <div className={`my-[8px] mb-[18px] text-[26px] font-extrabold tracking-[-0.02em] ${dirColor}`}>{dir.glyph} {dir.label}{f.expected_range_pct ? ` ${f.expected_range_pct}` : ""}</div>
      <div className="grid grid-cols-1 items-start gap-6 min-[1080px]:grid-cols-[1fr_280px]">
        <div>
          <div className="mb-1.5 text-[12px] text-[#828d9d]">指数の推移 · 見通し区間</div>
          <ForecastDetailChart series={series} f={f} />
        </div>
        <div>
          <div className="mb-1.5 text-[12px] text-[#828d9d]">総合シグナル</div>
          <div className="flex items-center gap-4">
            <Donut pct={confPct(f.confidence)} />
            <div>
              <div className="mb-0.5 text-[11px] text-[#828d9d]">信頼度 {confPct(f.confidence)}% · {dir.label} 優勢</div>
              <b className={`text-[18px] font-extrabold ${dirColor}`}>{dir.label} 優勢</b>
              {f.composite_score != null && <div className="mt-[3px] lsg-mono text-[11.5px] text-[#828d9d]">総合 {f.composite_score > 0 ? "+" : ""}{f.composite_score} · 점수 환산</div>}
            </div>
          </div>
          <div className="mt-3.5 pt-3.5">
            <div className="mb-2.5 text-[12px] font-bold text-[#1a2433]">要点</div>
            {insights.length === 0 ? (
              <p className="text-[12.5px] text-[#828d9d]">見通しの本文は準備中です。</p>
            ) : (
              <ul className="p-0">
                {insights.map((t, i) => (
                  <li key={i} className={`relative mb-2.5 list-none pl-4 text-[13px] leading-[1.6] ${i === 0 ? "font-semibold text-[#1a2433]" : "text-[#54606f]"} before:absolute before:left-0 before:top-2 before:h-[6px] before:w-[6px] before:rounded-full before:bg-[#16a34a] before:content-['']`}>{t}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-4 text-[12px] text-[#828d9d]">
        <span>見通しは情報提供が目的であり、投資や契約の勧誘ではありません。すべて確率として示します。</span>
        <span className="font-semibold text-[#0d9488]">AI 草案 · 編集校閲</span>
      </div>
    </div>
  );
}

/* ============================ METHODOLOGY (static) ============================ */
const METHOD: { b: string; s: string }[] = [
  { b: "データ収集", s: "Drewry · 上海航運交易所(SSE) · SCFI/WCI ほか" },
  { b: "5ファクター採点", s: "モメンタム・供給・需要・コスト・価格行動を −2〜+2 で採点" },
  { b: "加重合算", s: "海上: 供給30 · モメンタム25 · 需要25 · コスト10 · 価格10" },
  { b: "AI 執筆 + 自動検証", s: "判定単位と欠測の有無を自動で検査" },
  { b: "編集の確認後に発行", s: "発行後は本文を変えず、判定日の実測で的中を集計" },
];
function Methodology() {
  return (
    <div className={`mt-3.5 px-6 py-[22px] ${CARD}`}>
      <h3 className="mb-4 text-[15px] font-extrabold text-[#1a2433]">モデルの方法論</h3>
      <div className="grid grid-cols-1 gap-[18px] min-[640px]:grid-cols-2 min-[1080px]:grid-cols-5">
        {METHOD.map((m, i) => (
          <div key={m.b}>
            <div className="mb-2 grid h-[22px] w-[22px] place-items-center rounded-full bg-[#0e1626] lsg-mono text-[11px] font-bold text-white">{i + 1}</div>
            <b className="mb-1 block text-[13px] font-bold text-[#1a2433]">{m.b}</b>
            <span className="block text-[11.5px] leading-[1.5] text-[#828d9d]">{m.s}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11.5px] leading-[1.6] text-[#828d9d]">この見通しは情報提供が目的であり、投資や契約の勧誘ではありません。欠測した要素は重みを再配分します。因果ではなく相関として記述します。的中率は発行された 見通し 전수를 분모로 합니다.</p>
    </div>
  );
}

/* ===================== GEO: Article 스키마용 latestDate (실데이터 바인딩) ===================== */
// 공개 화면은 published/resolved만. 최신 발행일만 Article 스키마에 사용.
function buildForecastsGeo(forecasts: Forecast[]) {
  const published = forecasts.filter((f) => f.status === "published" || f.status === "resolved");
  const latestDate = published.reduce<string | null>(
    (m, f) => (f.published_at && (!m || f.published_at > m) ? f.published_at : m),
    null,
  );
  return { latestDate };
}

/* ============================ PAGE ============================ */
type ForecastSearch = { cadence?: "weekly" | "monthly"; dir: string[]; series: string[]; sel?: string; mod?: string };

export function LogisightForecast() {
  const { data: forecasts } = useSuspenseQuery(publishedForecastsQueryOptions());
  const { data: series } = useSuspenseQuery(forecastSeriesQueryOptions());
  const { data: railBrief } = useSuspenseQuery(eurasiaRailBriefQueryOptions());
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  const kpis = computeKpis(forecasts);
  const trend = hitRateTrend(forecasts);
  const allOpen = latestPerMetric(forecasts.filter((f) => f.status === "published"));
  const lastUpdated = forecasts.reduce<string | null>((m, f) => (f.published_at && (!m || f.published_at > m) ? f.published_at : m), null);
  const modules = [...new Set(allOpen.map((f) => f.module))].map((k) => ({ key: k, label: MODULE_LABEL[k] }));
  const geo = buildForecastsGeo(forecasts);

  const open = search.mod ? allOpen.filter((f) => f.module === search.mod) : allOpen;
  const filter: ForecastFilter = { cadence: search.cadence, dir: search.dir, series: search.series };
  const filtered = applyFilter(open, filter).sort((a, b) => displayOrderOf(a) - displayOrderOf(b));
  const selectedId = search.sel ?? filtered[0]?.id ?? null;
  const selected = open.find((f) => f.id === selectedId) ?? filtered[0] ?? null;

  const dirSeg = search.dir.length === 1 ? (search.dir[0] === "up" ? "上昇" : search.dir[0] === "flat" ? "横ばい" : search.dir[0] === "down" ? "下落" : "すべての方向") : "전체 방향";
  const cadSeg = search.cadence === "weekly" ? "週次" : search.cadence === "monthly" ? "月次" : "すべて";

  const setDir = (v: string) => navigate({ search: (p: ForecastSearch) => ({ ...p, dir: v === "上昇" ? ["up"] : v === "横ばい" ? ["flat"] : v === "下落" ? ["down"] : [] }), replace: true });
  const setCad = (v: string) => navigate({ search: (p: ForecastSearch) => ({ ...p, cadence: v === "週次" ? "weekly" : v === "月次" ? "monthly" : undefined }), replace: true });
  const setSel = (id: string) => navigate({ search: (p: ForecastSearch) => ({ ...p, sel: id }), replace: true, resetScroll: false });
  const setMod = (k: string | null) => navigate({ search: (p: ForecastSearch) => ({ ...p, mod: k ?? undefined, sel: undefined }), replace: true });

  return (
    <div className="lsgf-root min-h-screen bg-[#070b16] text-[#1a2433]">
      <style>{STYLE}</style>
      <HomeNav active="insight" />
      <InsightSubNav />
      <Hero kpis={kpis} lastUpdated={lastUpdated} modules={modules} activeModule={search.mod ?? null} onModule={setMod} />

      <div className="relative z-[2] -mt-7 rounded-t-[28px] bg-[#e6eaf1] pb-2.5" style={{ boxShadow: "0 -24px 60px -34px rgba(0,0,0,.7)" }}>
        <div className={WRAP}>
          <div className="pt-[26px] text-[12.5px] text-[#828d9d]">ホーム <b className="font-medium text-[#54606f]">›</b> インサイト <b className="font-medium text-[#54606f]">›</b> 見通し</div>

          {/* GEO: 보이지 않는 Article JSON-LD만 유지 (시각 요소 없음) */}
          <GeoArticleSchema
            article={{
              headline: "物流市場の見通し — AI 草案 · 編集校閲",
              description:
                "Logisight AI が現在と過去のデータを分析し、運賃・貿易・政策の方向を確率で見通します。発行前に編集が校閲します。",
              path: "/forecasts",
              datePublished: geo.latestDate,
              dateModified: geo.latestDate,
            }}
          />

          <Kpis kpis={kpis} />
          <TrendBlock trend={trend} />

          {railBrief.outlook && (
            <section className="mt-[26px]">
              <div className="mb-3.5 flex items-center gap-2.5">
                <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-[#1a2433]">鉄道の見通し</h2>
                <span className="rounded-full border border-[#d8dfe9] bg-[#eef1f6] px-[9px] py-[3px] text-[11px] text-[#828d9d]">ユーラシア · AI</span>
              </div>
              <div className={`p-[22px] ${CARD}`}>
                <p className="text-[14px] leading-[1.65] text-[#1a2433]">{railBrief.outlook.summary}</p>
                {railBrief.outlook.points.length > 0 && (
                  <ul className="mt-3.5 space-y-2">
                    {railBrief.outlook.points.map((p, i) => (
                      <li key={i} className="flex gap-2 text-[13px] leading-[1.5] text-[#54606f]"><span className="flex-none text-[#0d9488]">▸</span>{p}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-3.5 border-t border-[#d8dfe9] pt-2.5 text-[11px] text-[#828d9d]">AI 分析 · ユーラシア隔週マーケットレポートにもとづく{railBrief.generatedAt ? ` · ${railBrief.generatedAt.slice(0, 10)}` : ""}</div>
              </div>
            </section>
          )}

          {open.length === 0 ? (
            <div className={`mt-[26px] px-6 py-16 text-center ${CARD}`}>
              <p className="text-[14px] font-semibold text-[#1a2433]">データ収集中</p>
              <p className="mt-1 text-[12px] text-[#828d9d]">校閲を通過した見通しが掲載されると、ここに表示します。</p>
            </div>
          ) : (
            <>
              <div className="mt-[18px] flex flex-wrap items-center gap-[18px]">
                <Seg items={CAD_SEG} value={cadSeg} onChange={setCad} />
                <Seg items={DIR_SEG} value={dirSeg} onChange={setDir} />
                <span className="ml-auto text-[12px] text-[#828d9d]">カードを押すと 見通しの詳細・要素スコア・判定結果</span>
              </div>
              <div className="mb-3.5 mt-[26px] flex items-center justify-between"><h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-[#1a2433]">見通しカード</h2></div>
              <ForecastCards cards={filtered} series={series} selectedId={selectedId} onSelect={setSel} />
              {selected && <DetailPanel f={selected} series={series[selected.id]} />}
            </>
          )}

          <Methodology />
        </div>
      </div>

      <HomeFooter />
    </div>
  );
}
