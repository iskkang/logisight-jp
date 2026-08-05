import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Chip, JpPage, SecTitle } from "@/components/jp/JpPage";
import {
  benchmark,
  benchmarkQueryOptions,
  gapVsMarket,
  pct,
  yen,
  type BenchmarkPoint,
} from "@/lib/api/benchmark";

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

function parseNumber(s: string): number | null {
  const n = Number(s.replace(/[,\s]/g, ""));
  return s.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
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
  const defaultSeries = series.find((s) => s.name === "外航貨物輸送")?.name ?? series[0]?.name ?? "";
  // 既定の契約時点は24か月前。年1回改定の契約が2周した頃で、比較の実感に近い。
  const defaultFrom = periods[Math.max(0, periods.length - 25)] ?? periods[0] ?? "";

  const [seriesName, setSeriesName] = useState(defaultSeries);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(latest);
  const [basePrice, setBasePrice] = useState("");
  const [offeredPrice, setOfferedPrice] = useState("");

  const current = series.find((s) => s.name === seriesName);

  const result = useMemo(() => {
    const byPeriod = values[seriesName];
    if (!byPeriod) return null;
    const at = (p: string): BenchmarkPoint => {
      const v = byPeriod[p] ?? [null, null];
      return { period: p, yen: v[0], contract: v[1] };
    };
    return benchmark(at(from), at(to), parseNumber(basePrice));
  }, [values, seriesName, from, to, basePrice]);

  const offered = parseNumber(offeredPrice);
  const gap =
    result?.marketAlignedPrice != null && offered != null
      ? gapVsMarket(offered, result.marketAlignedPrice)
      : null;

  // 交渉の場にそのまま持って行ける一文。数値と出典を必ず添える。
  const sentence = useMemo(() => {
    if (!result) return "";
    const head = `日本銀行の企業向けサービス価格指数によると、${seriesName}は${jaPeriod(from)}から${jaPeriod(to)}にかけて円ベースで${pct(result.marketPct)}変動した。`;
    const split =
      result.freightPct != null && result.fxPct != null
        ? `ただし契約通貨ベースでは${pct(result.freightPct)}であり、差の${pct(result.fxPct)}は為替要因にあたる。`
        : `この系列は契約通貨ベースを公表しないため、運賃要因と為替要因は分けられない。`;
    return head + split;
  }, [result, seriesName, from, to]);

  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sentence);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // クリップボードが使えない環境。文面は画面に出ているので手で写せる。
    }
  };

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
              <select className={INPUT_CLASS} value={from} onChange={(e) => setFrom(e.target.value)}>
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
            <>
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

              <SecTitle>自社の単価と比べる</SecTitle>
              <p className="mb-3 text-[12.5px] leading-[1.8] text-[#6b7683]">
                単価を入れると、市場と同じだけ動いた場合の金額を出します。
                <b>入力した金額はブラウザの外に出ません</b> — 送信も保存もしません。
              </p>
              <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2">
                <Field label={`${jaPeriod(from)}の単価(円)`}>
                  <input
                    className={INPUT_CLASS}
                    inputMode="numeric"
                    placeholder="例: 180000"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                  />
                </Field>
                <Field label="提示された単価(円)">
                  <input
                    className={INPUT_CLASS}
                    inputMode="numeric"
                    placeholder="例: 230000"
                    value={offeredPrice}
                    onChange={(e) => setOfferedPrice(e.target.value)}
                  />
                </Field>
              </div>

              {result.marketAlignedPrice != null && (
                <div className="mt-3 border border-[#e4e8ec]">
                  <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-[#eef0f2] px-4 py-3">
                    <span className="text-[12px] font-bold text-[#6b7683]">市場と同じだけ動いた場合</span>
                    <span className="text-[22px] font-bold tabular-nums text-[#0b2d52]">
                      {yen(result.marketAlignedPrice)}
                      <span className="ml-1 text-[13px] font-normal">円</span>
                    </span>
                  </div>
                  {gap != null && (
                    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 px-4 py-3">
                      <span className="text-[12px] font-bold text-[#6b7683]">提示額との差</span>
                      <span className={`text-[22px] font-bold tabular-nums ${toneOf(gap)}`}>
                        {pct(gap)}
                      </span>
                      <span className="text-[12px] leading-[1.7] text-[#6b7683]">
                        {gap > 0
                          ? "提示額は市場の動きより大きい。上回るぶんの根拠を確かめる余地があります。"
                          : "提示額は市場の動きに収まっています。"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <SecTitle>交渉に使う一文</SecTitle>
              <div className="border border-[#e4e8ec] bg-[#f7f8f9] px-4 py-3.5">
                <p className="text-[13px] leading-[1.9] text-[#2c3540]">{sentence}</p>
                <button
                  type="button"
                  onClick={copy}
                  className="mt-3 border border-[#0b2d52] px-3 py-1.5 text-[12px] font-bold text-[#0b2d52] transition-colors hover:bg-[#0b2d52] hover:text-white"
                >
                  {copied ? "コピーしました" : "文面をコピー"}
                </button>
              </div>
            </>
          )}

          <p className="mb-2 mt-6 text-[11.5px] leading-[1.8] text-[#8a929c]">
            ※ 指数は{baseYear}年=100。円ベースは契約通貨ベースに為替変動を加えたもので、両者の差は定義上すべて為替要因。
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
