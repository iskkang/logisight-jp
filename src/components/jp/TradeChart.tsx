import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { JpTradeCommodity, JpTradeCountry } from "@/lib/api/jp-trade";

/** 千円 → 億円。表と同じ単位に揃える。 */
const toOku = (v: number | null) => (v == null ? 0 : Math.round(v / 1e5));
const fmtOku = (v: number) => `${v.toLocaleString("ja-JP")}億`;

/** 相手国別の輸出入。輸出上位と輸入上位が別の顔ぶれであることを見せる。 */
export function TradeCountryChart({ countries }: { countries: JpTradeCountry[] }) {
  const data = countries.slice(0, 8).map((c) => ({
    name: c.name,
    export: toOku(c.exportJpy),
    import: toOku(c.importJpy),
  }));
  return (
    <figure className="border border-[#e2e6ea] bg-white p-3.5">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold text-[#1a1f26]">相手国別 輸出入</span>
        <span className="text-[11px] text-[#8a929c]">輸出上位8か国 · 億円</span>
      </figcaption>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: 4 }}>
            <CartesianGrid stroke="#eef0f2" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7683" }} tickLine={false} axisLine={{ stroke: "#d5d9de" }} interval={0} />
            <YAxis tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}兆`} tick={{ fontSize: 10, fill: "#8a929c" }} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              contentStyle={{ fontSize: 12, border: "1px solid #d5d9de", borderRadius: 0, padding: "6px 9px" }}
              formatter={(v: number | string) => (typeof v === "number" ? fmtOku(v) : "—")}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 2 }} iconSize={10} />
            <Bar isAnimationActive={false} dataKey="export" name="輸出" fill="#0b2d52" barSize={11} />
            <Bar isAnimationActive={false} dataKey="import" name="輸入" fill="#93b0c9" barSize={11} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

const PIE_COLORS = ["#0b2d52", "#1e5b8c", "#2e7fb5", "#5aa0c9", "#8bbcd9", "#b3d2e6", "#d0e2ee", "#e4eef5"];

/** 品目構成。上位品目への偏りは表の数字より図のほうが早い。 */
export function TradeItemChart({
  title,
  items,
}: {
  title: string;
  items: JpTradeCommodity[];
}) {
  const top = items.slice(0, 6);
  const restShare = items.slice(6).reduce((a, x) => a + x.sharePct, 0);
  const data = [
    ...top.map((x) => ({ name: x.name, value: Number(x.sharePct.toFixed(1)) })),
    ...(restShare > 0.05 ? [{ name: "その他", value: Number(restShare.toFixed(1)) }] : []),
  ];

  return (
    <figure className="border border-[#e2e6ea] bg-white p-3.5">
      <figcaption className="mb-2 text-[13px] font-bold text-[#1a1f26]">{title}</figcaption>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie isAnimationActive={false}
              data={data}
              dataKey="value"
              nameKey="name"
              cx="38%"
              cy="50%"
              innerRadius={38}
              outerRadius={72}
              stroke="#fff"
              strokeWidth={1}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 12, border: "1px solid #d5d9de", borderRadius: 0, padding: "6px 9px" }}
              formatter={(v: number | string) => (typeof v === "number" ? `${v.toFixed(1)}%` : "—")}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{ fontSize: 10.5, lineHeight: "17px" }}
              iconSize={9}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
