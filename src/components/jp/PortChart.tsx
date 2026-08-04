import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { PortLatest, PortSeriesPoint } from "@/lib/api/ports";

const fmtM = (v: number) => `${(v / 10000).toFixed(0)}万`;

/** "2026-05" → "26/05" */
const short = (p: string) => `${p.slice(2, 4)}/${p.slice(5, 7)}`;

/** 主要6港合計の推移。単月の表では増減の流れが読めない。 */
export function PortTotalChart({ points }: { points: PortSeriesPoint[] }) {
  const data = points.map((p) => ({ ...p, label: short(p.period) }));
  return (
    <figure className="border border-[#e2e6ea] bg-white p-3.5">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold text-[#1a1f26]">主要6港 合計の推移</span>
        <span className="text-[11px] text-[#8a929c]">棒=TEU · 線=前年同月比</span>
      </figcaption>
      <div className="h-[210px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#eef0f2" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8a929c" }} tickLine={false} axisLine={{ stroke: "#d5d9de" }} interval={1} />
            <YAxis yAxisId="l" tickFormatter={fmtM} tick={{ fontSize: 10, fill: "#8a929c" }} tickLine={false} axisLine={false} width={48} />
            <YAxis yAxisId="r" orientation="right" tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`} tick={{ fontSize: 10, fill: "#8a929c" }} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              contentStyle={{ fontSize: 12, border: "1px solid #d5d9de", borderRadius: 0, padding: "6px 9px" }}
              labelStyle={{ color: "#6b7683", fontSize: 11 }}
              formatter={(v: number | string, n: string) =>
                typeof v !== "number" ? "—" : n === "前年同月比" ? `${v > 0 ? "+" : ""}${v.toFixed(1)}%` : v.toLocaleString("ja-JP")
              }
            />
            <Bar isAnimationActive={false} yAxisId="l" dataKey="teu" name="TEU" fill="#c3d3e2" barSize={13} />
            <Line isAnimationActive={false} yAxisId="r" type="monotone" dataKey="yoyPct" name="前年同月比" stroke="#0b2d52" strokeWidth={1.8} dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

/** 港別の前年同月比。増減が分かれた月に、どの港が動いたかを一目で見せる。 */
export function PortYoyChart({ ports }: { ports: PortLatest[] }) {
  const data = ports.map((p) => ({ name: p.name.replace("港", ""), yoy: p.yoyPct ?? 0 }));
  return (
    <figure className="border border-[#e2e6ea] bg-white p-3.5">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold text-[#1a1f26]">港別 前年同月比</span>
        <span className="text-[11px] text-[#8a929c]">赤=減少</span>
      </figcaption>
      <div className="h-[210px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#eef0f2" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: "#6b7683" }} tickLine={false} axisLine={{ stroke: "#d5d9de" }} />
            <YAxis tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`} tick={{ fontSize: 10, fill: "#8a929c" }} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              contentStyle={{ fontSize: 12, border: "1px solid #d5d9de", borderRadius: 0, padding: "6px 9px" }}
              formatter={(v: number | string) => (typeof v === "number" ? `${v > 0 ? "+" : ""}${v.toFixed(1)}%` : "—")}
            />
            <Bar isAnimationActive={false} dataKey="yoy" name="前年同月比" barSize={26}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.yoy < 0 ? "#c0392b" : "#2e6ea6"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
