import { describe, expect, it } from "vitest";

import { HS_TERMS, lookupHs } from "../hs-dictionary";

describe("hs-dictionary", () => {
  it("完全一致で引ける", () => {
    expect(lookupHs("乗用車")?.hs).toBe("8703.23");
    expect(lookupHs("半導体製造装置")?.hs).toBe("8486.20");
  });

  // 入力途中でも当てたい。「自動車」まで打った時点で候補が出るのが自然。
  it("前方一致で引ける", () => {
    expect(lookupHs("自動車")?.ja).toBe("自動車部品");
  });

  // 前後の空白は利用者の責任ではない。
  it("空白を落として引く", () => {
    expect(lookupHs("  タイヤ  ")?.hs).toBe("4011.10");
  });

  it("知らない語は null", () => {
    expect(lookupHs("宇宙船")).toBeNull();
    expect(lookupHs("")).toBeNull();
  });

  // 辞書が壊れると、違う品目の正しい税率を見せることになる。一番たちが悪い。
  it("辞書の形が壊れていない", () => {
    expect(HS_TERMS.length).toBeGreaterThanOrEqual(22);
    for (const t of HS_TERMS) {
      expect(t.hs).toMatch(/^\d{4}\.\d{2}$/);
      expect(t.ja.length).toBeGreaterThan(0);
      expect(t.en.length).toBeGreaterThan(0);
    }
    const ja = HS_TERMS.map((t) => t.ja);
    expect(new Set(ja).size).toBe(ja.length); // 重複なし
  });
});
