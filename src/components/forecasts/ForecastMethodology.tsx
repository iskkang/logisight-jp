// G — 방법론 스트립(실제 파이프라인만 기술). Z-Score·50+ 지표 등 시안 문구 사용 금지.
// 가중치 단일 소스 — 스펙 freight-rate-forecast-prompt-v1.x(config/forecast-model.js WEIGHTS.ocean)와
// 동기화. 분기 보정 시 이 상수 1곳만 갱신(v1.5 연동).
const OCEAN_WEIGHTS: Record<string, number> = { 供給: 30, モメンタム: 25, 需要: 25, コスト: 10, 価格動向: 10 };
const WEIGHTS_LABEL = Object.entries(OCEAN_WEIGHTS).map(([k, v]) => `${k} ${v}`).join("·");

const STEPS = [
  { t: "データ収集", d: "Drewry·上海航運交易所·SCFI/WCI ほか" },
  { t: "5ファクター採点", d: "モメンタム·供給·需要·コスト·価格 −2〜+2" },
  { t: "加重合算", d: `海上 ${WEIGHTS_LABEL}` },
  { t: "AI 執筆 + 自動検証", d: "断定·単位·欠測の断定を検査" },
  { t: "編集の確認後に発行", d: "発行後は本文を変更しない · 判定日の実測で的中" },
];

export function ForecastMethodology() {
  return (
    <section className="mt-10 rounded-xl border border-border bg-card p-5">
      <div className="mb-3 text-sm font-semibold text-foreground">モデルの方法論</div>
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {STEPS.map((s, i) => (
          <li key={s.t} className="flex flex-1 items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-status-observe/15 text-[11px] font-bold text-status-observe">
              {i + 1}
            </span>
            <div>
              <div className="text-xs font-semibold text-foreground">{s.t}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{s.d}</div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
        本見通しは情報提供が目的であり、投資や契約の勧誘ではない。欠測したファクターは加重を再配分し、
        因果を断定せず相関·整合·推定にとどめて記述する。的中率は発行した見通しの全件を分母とする。
      </p>
    </section>
  );
}
