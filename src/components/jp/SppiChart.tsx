import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SppiPoint } from "@/lib/api/sppi";

/**
 * 円ベースと契約通貨ベースの推移。両者を重ねるのがこの図の目的である —
 * 開きがそのまま為替要因であり、表の単月だけでは開きの推移が読めない。
 */
export function SppiChart({
  name,
  points,
  baseYear,
}: {
  name: string;
  points: SppiPoint[];
  baseYear: string;
}) {
  const hasContract = points.some((p) => p.contract !== null);

  return (
    <figure className="border border-[#e2e6ea] bg-white p-3.5">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold text-[#1a1f26]">{name}</span>
        <span className="text-[11px] text-[#8a929c]">直近24か月 · {baseYear}年=100</span>
      </figcaption>
      <div className="h-[190px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 4, right: 6, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="#eef0f2" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#8a929c" }}
              tickLine={false}
              axisLine={{ stroke: "#d5d9de" }}
              interval={3}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#8a929c" }}
              tickLine={false}
              axisLine={false}
              width={44}
              domain={["dataMin - 10", "dataMax + 10"]}
            />
            {/* 基準年の水準。契約通貨ベースがこの線を割ると実質は基準年以下。 */}
            <ReferenceLine y={100} stroke="#c0392b" strokeDasharray="3 3" strokeWidth={1} />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                border: "1px solid #d5d9de",
                borderRadius: 0,
                padding: "6px 9px",
              }}
              labelStyle={{ color: "#6b7683", fontSize: 11 }}
              formatter={(v: number | string) => (typeof v === "number" ? v.toFixed(1) : "—")}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 2 }}
              iconType="plainline"
              iconSize={14}
            />
            <Line
              type="monotone"
              dataKey="yen"
              name="円ベース"
              stroke="#0b2d52"
              strokeWidth={1.8}
              dot={false}
              connectNulls
            />
            {hasContract && (
              <Line
                type="monotone"
                dataKey="contract"
                name="契約通貨ベース"
                stroke="#1e88a8"
                strokeWidth={1.8}
                strokeDasharray="4 3"
                dot={false}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
