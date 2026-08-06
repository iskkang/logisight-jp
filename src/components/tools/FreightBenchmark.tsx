import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
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

import { Chip, JpPage, SecTitle } from "@/components/jp/JpPage";
import { LoginGate } from "@/components/jp/LoginGate";
import { benchmark, benchmarkQueryOptions, pct, type BenchmarkPoint } from "@/lib/api/benchmark";
import type { ValuePair } from "@/lib/api/benchmark.functions";

const SOURCE = "日本銀行 企業向けサービス価格指数(SPPI)";

const CATEGORY_LABEL: Record<string, string> = {
  ocean: "海上",
  air: "航空",
  land: "陸上",
  port: "港湾運送",
  warehouse: "倉庫",
  total: "運輸・郵便(総合)",
};

/** "2026-06" → "2026年6月" */
function jaPeriod(p: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(p);
  return m ? `${m[1]}年${Number(m[2])}月` : p;
}

/** "2026-06" → "26/06" */
function shortLabel(p: string): string {
  return p.slice(2).replace("-", "/");
}

/**
 * 下の「対象の系列」で選んだ一系列の推移。二つの基準を重ねるのがこの図の目的で、
 * 開きがそのまま為替要因にあたる — 単月の数値だけでは開きの推移が読めない。
 */
function TrendChart({
  seriesName,
  periods,
  byPeriod,
  baseYear,
}: {
  seriesName: string;
  periods: string[];
  byPeriod: Record<string, ValuePair> | undefined;
  baseYear: string;
}) {
  const data = periods.map((p) => ({
    label: shortLabel(p),
    yen: byPeriod?.[p]?.[0] ?? null,
    contract: byPeriod?.[p]?.[1] ?? null,
  }));
  const hasContract = data.some((d) => d.contract !== null);

  return (
    <figure className="border border-[#e2e6ea] bg-white p-3.5">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#eef0f2" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#8a929c" }}
              tickLine={false}
              axisLine={{ stroke: "#d5d9de" }}
              interval={11}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#8a929c" }}
              tickLine={false}
              axisLine={false}
              width={38}
              domain={["dataMin - 10", "dataMax + 10"]}
            />
            {/* 基準年の水準。この線を割る系列は基準年より安い。 */}
            <ReferenceLine y={100} stroke="#b6bcc4" strokeDasharray="3 3" strokeWidth={1} />
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
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              iconType="plainline"
              iconSize={14}
            />
            <Line
              isAnimationActive={false}
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
                isAnimationActive={false}
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
      <figcaption className="mt-2 text-[11px] text-[#8a929c]">
        {seriesName} · {baseYear}年=100 · 出典: 日本銀行
      </figcaption>
    </figure>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-bold text-[#6b7683]">{label}</span>
      {children}
    </label>
  );
}

const INPUT_CLASS =
  "w-full border border-[#ccd2d9] bg-white px-2.5 py-2 text-[13px] tabular-nums outline-none focus:border-[#0b2d52]";

/** 変動率の色。上がった=赤(コスト増)、下がった=緑。日本の株価表記とは逆で、荷主から見た向き。 */
function toneOf(v: number | null): string {
  if (v == null) return "text-[#8a929c]";
  return v > 0 ? "text-[#c0392b]" : "text-[#177245]";
}

function Metric({ label, value, note }: { label: string; value: number | null; note: string }) {
  return (
    <div className="border border-[#e4e8ec] px-4 py-3.5">
      <div className="text-[11.5px] font-bold text-[#6b7683]">{label}</div>
      <div className={`mt-1 text-[26px] font-bold leading-none tabular-nums ${toneOf(value)}`}>
        {pct(value)}
      </div>
      <div className="mt-1.5 text-[11.5px] leading-[1.7] text-[#8a929c]">{note}</div>
    </div>
  );
}

export function FreightBenchmark() {
  const { data } = useSuspenseQuery(benchmarkQueryOptions());
  const { periods, series, values, baseYear } = data;

  const latest = periods[periods.length - 1] ?? "";
  // 既定は外航貨物輸送。円ベースと契約通貨ベースの開きが最も大きく、この道具の主旨が一目で伝わる。
  const defaultSeries =
    series.find((s) => s.name === "外航貨物輸送")?.name ?? series[0]?.name ?? "";
  // 既定の契約時点は24か月前。年1回改定の契約が2周した頃で、比較の実感に近い。
  const defaultFrom = periods[Math.max(0, periods.length - 25)] ?? periods[0] ?? "";

  const [seriesName, setSeriesName] = useState(defaultSeries);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(latest);

  const current = series.find((s) => s.name === seriesName);

  const result = useMemo(() => {
    const byPeriod = values[seriesName];
    if (!byPeriod) return null;
    const at = (p: string): BenchmarkPoint => {
      const v = byPeriod[p] ?? [null, null];
      return { period: p, yen: v[0], contract: v[1] };
    };
    return benchmark(at(from), at(to));
  }, [values, seriesName, from, to]);

  return (
    <JpPage
      crumbs={[{ label: "ホーム", to: "/" }, { label: "物流費ベンチマーク" }]}
      title="物流費ベンチマーク — 値上げの何%が為替か"
      lead="契約した時点から今までに市場が何%動いたかを出し、その内訳を運賃要因と為替要因に分けます。為替ぶんは相手の原価が上がったわけではないため、交渉での扱いが変わります。"
      meta={
        <>
          <Chip label="最新月" value={jaPeriod(latest)} />
          <Chip label="基準" value={`${baseYear}年=100`} />
          <Chip label="出典" value="日本銀行" />
        </>
      }
    >
      {series.length === 0 ? (
        <p className="py-10 text-[13px] text-[#6b7683]">公表済みのデータがありません。</p>
      ) : (
        <>
          <SecTitle>運賃トレンド</SecTitle>
          <p className="mb-3 text-[12.5px] leading-[1.8] text-[#6b7683]">
            下の「対象の系列」で選んだ系列の推移です。{baseYear}年を100とした水準で、
            二本の線の開きがそのまま為替要因にあたります。
          </p>
          <LoginGate
            title="全期間の推移はログインするとご覧いただけます"
            note={`登録は無料です。${baseYear}年からの全期間について、円ベースと契約通貨ベースの開きの推移を追えます。`}
          >
            <TrendChart
              seriesName={seriesName}
              periods={periods}
              byPeriod={values[seriesName]}
              baseYear={baseYear}
            />
          </LoginGate>

          <SecTitle>条件</SecTitle>
          <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-3">
            <Field label="対象の系列">
              <select
                className={INPUT_CLASS}
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
              >
                {series.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}({CATEGORY_LABEL[s.category] ?? s.category})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="契約した時点">
              <select
                className={INPUT_CLASS}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              >
                {periods.map((p) => (
                  <option key={p} value={p}>
                    {jaPeriod(p)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="比べる時点">
              <select className={INPUT_CLASS} value={to} onChange={(e) => setTo(e.target.value)}>
                {periods.map((p) => (
                  <option key={p} value={p}>
                    {jaPeriod(p)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {!current?.hasContract && (
            <div className="mt-3 border-l-[3px] border-[#c9922f] bg-[#fdf9f0] px-4 py-3">
              <p className="text-[12.5px] leading-[1.8] text-[#6b4d16]">
                {seriesName}は契約通貨ベースを公表していません。円で契約する国内の系列のため、
                為替要因はそもそも発生しません。市場の変動だけを示します。
              </p>
            </div>
          )}

          <SecTitle>市場はどれだけ動いたか</SecTitle>
          {!result ? (
            <p className="py-6 text-[13px] text-[#6b7683]">
              選んだ月に公表値がありません。指数の公表は約1か月遅れます。
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-3">
              <Metric
                label="市場の変動(円ベース)"
                value={result.marketPct}
                note="運賃の動きと為替の動きが両方入った数値"
              />
              <Metric
                label="うち運賃要因"
                value={result.freightPct}
                note="契約通貨ベースの変動。運賃そのものの動き"
              />
              <Metric
                label="うち為替要因"
                value={result.fxPct}
                note="円ベース ÷ 契約通貨ベース。相手の原価ではない"
              />
            </div>
          )}

          <p className="mb-2 mt-6 text-[11.5px] leading-[1.8] text-[#8a929c]">
            ※ 指数は{baseYear}
            年=100。円ベースは契約通貨ベースに為替変動を加えたもので、両者の差は定義上すべて為替要因。
            為替要因は円ベース÷契約通貨ベースで求める(積の関係のため引き算では合わない)。
            契約通貨ベースを公表しない系列では分解できない。マイナスは「▲」で表す。出典: {SOURCE}。
            <br />
            本指数は日本の産業全体の平均であり、個別の航路・荷主の運賃を示すものではありません。
            交渉の出発点としてお使いください。
          </p>
        </>
      )}
    </JpPage>
  );
}
