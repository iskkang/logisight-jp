import { describe, expect, it } from "vitest";

import { benchmark, pct } from "../benchmark";

describe("benchmark", () => {
  // 外航貨物輸送の実データ。2020年基準(=100)からの現在値。
  // 円 233.8 / 契約通貨 160.8 の比は 1.454 で、ドル円 108→157 の 1.454 と一致する。
  // この一致が「円÷契約通貨=為替」という分解の根拠なので、テストで固定しておく。
  it("為替要因を円ベースと契約通貨ベースの比から出す", () => {
    const r = benchmark(
      { period: "2020-01", yen: 100, contract: 100 },
      { period: "2026-06", yen: 233.8, contract: 160.8 },
    );
    expect(r!.marketPct).toBeCloseTo(133.8, 1);
    expect(r!.freightPct).toBeCloseTo(60.8, 1);
    expect(r!.fxPct).toBeCloseTo(45.4, 1); // 233.8/160.8 - 1
  });

  // 積の関係なので、単純な引き算とは合わない。ここがずれると交渉の数字が狂う。
  it("為替要因は差ではなく比で出す", () => {
    const r = benchmark(
      { period: "2020-01", yen: 100, contract: 100 },
      { period: "2026-06", yen: 232, contract: 160 }, // 運賃+60%, 為替+45% → 円 +132%
    );
    expect(r!.marketPct).toBeCloseTo(132, 1);
    expect(r!.fxPct).toBeCloseTo(45, 1);
    // 差で出すと 132-60=72% になってしまう
    expect(r!.fxPct).not.toBeCloseTo(72, 0);
  });

  // 国内系列(道路・鉄道・内航・港湾運送・倉庫)は契約通貨ベースを公表しない。
  // 円で契約するので為替要因がない。分解せず市場変動だけ返す。
  it("契約通貨ベースがない系列は分解しない", () => {
    const r = benchmark(
      { period: "2024-04", yen: 105.0, contract: null },
      { period: "2026-06", yen: 111.6, contract: null },
    );
    expect(r!.marketPct).toBeCloseTo(6.29, 1);
    expect(r!.freightPct).toBeNull();
    expect(r!.fxPct).toBeNull();
  });

  // 公表が1か月遅れるので、利用者が最新月を選んでも値がまだ無いことがある。
  it("片方の月に値がなければ計算しない", () => {
    expect(
      benchmark(
        { period: "2026-07", yen: null, contract: null },
        { period: "2026-06", yen: 233.8, contract: 160.8 },
      ),
    ).toBeNull();
    expect(
      benchmark(
        { period: "2024-04", yen: 200, contract: 150 },
        { period: "2026-07", yen: null, contract: null },
      ),
    ).toBeNull();
  });

  it("下がった場合も出す", () => {
    const r = benchmark(
      { period: "2022-09", yen: 300, contract: 250 },
      { period: "2026-06", yen: 233.8, contract: 160.8 },
    );
    expect(r!.marketPct).toBeLessThan(0);
    expect(r!.freightPct).toBeLessThan(0);
  });
});

describe("pct", () => {
  // 日本の財務表記。マイナスに ▲ を使う。
  it("マイナスは ▲", () => {
    expect(pct(-4.9)).toBe("▲4.9%");
    expect(pct(12.3)).toBe("+12.3%");
    expect(pct(null)).toBe("—");
  });
});
