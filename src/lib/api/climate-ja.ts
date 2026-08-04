// asset_risk.driver は risk-refresh(Edge Function)が組み立てる韓国語の文字列である。
// 「강풍 (지속풍 21m/s)」のような形で、語彙は閉じている(危険要因8種 + 数値)。
//
// Edge Function 側を日本語にすると韓国サイトが壊れる。DB の値はそのままにし、
// 日本版が読む境界でだけ置き換える — assets.name_ja と同じ考え方である。
// 数値部分は触らない。単位も原文のまま(m/s・m・cm・℃・mm)使われている。

const HAZARD: Record<string, string> = {
  정상: "平常",
  강풍: "強風",
  "높은 파고": "高波",
  폭설: "大雪",
  한파: "寒波",
  결빙: "結氷",
  침수: "浸水",
  극한고온: "極端な高温",
};

// 括弧内の説明に付く語。「지속풍 21m/s」「일최고 39℃」「강수 12mm」。
const QUALIFIER: Record<string, string> = {
  지속풍: "持続風",
  일최고: "日最高",
  강수: "降水",
};

/**
 * 「강풍 (지속풍 21m/s)」→「強風(持続風 21m/s)」
 * 未知の語はそのまま返す。訳せないものを消すと、何が起きているのか分からなくなる。
 */
export function driverJa(driver: string | null): string | null {
  if (!driver) return driver;
  const m = /^(.+?)\s*\((.+)\)$/.exec(driver.trim());
  const hazard = m ? m[1].trim() : driver.trim();
  const ja = HAZARD[hazard] ?? hazard;
  if (!m) return ja;

  const inner = m[2].replace(/^(\S+)\s/, (whole, word: string) =>
    QUALIFIER[word] ? `${QUALIFIER[word]} ` : whole,
  );
  return `${ja}(${inner})`;
}
