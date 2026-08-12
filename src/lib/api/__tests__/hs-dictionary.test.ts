import { describe, expect, it } from "vitest";

import { HS_TERMS, lookupHs } from "../hs-dictionary";

describe("hs-dictionary", () => {
  it("完全一致で引ける", () => {
    expect(lookupHs("乗用車")?.hs).toBe("8703.23");
    expect(lookupHs("半導体製造装置")?.hs).toBe("8486.20");
  });

  // 完全一致のみ。入力は submit 駆動でタイピング途中を拾う場面が無いので、
  // 前方一致を残す理由が無い。「自動車」で「自動車部品」(部品の税率)に
  // 化けると、違う品目の正しい税率を見せることになり、何も出ないより悪い。
  it("前方一致・部分一致では引けない", () => {
    expect(lookupHs("自動車")).toBeNull();
    expect(lookupHs("乗用")).toBeNull();
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
