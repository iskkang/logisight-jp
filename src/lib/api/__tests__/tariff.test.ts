import { describe, expect, it } from "vitest";

import {
  classifyInput,
  normalizeQuery,
  toOriginRow,
  totalMatchesPrograms,
  type LandedIqLine,
} from "../tariff";

/** 実測値そのまま。8703.23 / origin=JP の応答。 */
const JP_CAR: LandedIqLine = {
  code: "8703230110",
  description: "Motor cars ... > Motor homes",
  leaf: "Motor homes",
  base_mfn: 0.025,
  programs: [
    {
      code: "301-forced-labor-topup",
      name: "Section 301 — forced labor (combined-rate targets)",
      authority: "Section 301",
      rate: 0.1,
      rate_type: "top_up_to_total",
      exclusion: "none",
    },
    {
      code: "mfn",
      name: "Base MFN (Column 1 General)",
      authority: "MFN",
      rate: 0.025,
      rate_type: "additive",
      exclusion: "none",
    },
  ],
  duty_rate_total: 0.125,
  unresolved: [],
  exclusion_status: "none",
  warnings: [],
};

describe("classifyInput", () => {
  it("数字4桁以上はコードとして扱う", () => {
    expect(classifyInput("8703.23").kind).toBe("code");
    expect(classifyInput("8703230110").kind).toBe("code");
  });

  // 3桁では章すら決まらない。コード扱いすると 0 件になって行き止まりになる。
  it("数字が3桁以下ならコードではない", () => {
    expect(classifyInput("870").kind).not.toBe("code");
  });

  it("辞書にある日本語は term になり、HS が付く", () => {
    const r = classifyInput("乗用車");
    expect(r.kind).toBe("term");
    expect(r.term?.hs).toBe("8703.23");
  });

  // 英語は原簿にそのまま通る。実測で "motor car" は 20 件。
  it("英語はそのまま通す", () => {
    expect(classifyInput("motor car").kind).toBe("english");
  });

  // ここで機械翻訳に逃げない。何も出ないほうが、違う品目を見せるよりましである。
  it("辞書にない日本語は unknown", () => {
    expect(classifyInput("宇宙船").kind).toBe("unknown");
    expect(classifyInput("   ").kind).toBe("unknown");
  });
});

describe("normalizeQuery", () => {
  // キャッシュキーになる。表記ゆれで別物として貯めると、無駄に外を呼ぶ。
  it("コードは数字だけにする", () => {
    expect(normalizeQuery("8703.23")).toBe("870323");
    expect(normalizeQuery(" 8703 . 23 ")).toBe("870323");
  });

  it("英語は小文字にして空白を詰める", () => {
    expect(normalizeQuery("  Motor   Car ")).toBe("motor car");
  });
});

describe("toOriginRow", () => {
  it("合計と内訳を百分率にして返す", () => {
    const r = toOriginRow("JP", "日本", JP_CAR);
    expect(r.status).toBe("ok");
    expect(r.totalPct).toBe(12.5);
    expect(r.breakdown).toEqual([
      { label: "上限補正", pct: 10 },
      { label: "MFN", pct: 2.5 },
    ]);
  });

  // 取れなかったことと、関税が無いことは別である。ここを 0 にすると嘘になる。
  it("行が無ければ unavailable。0% にしない", () => {
    const r = toOriginRow("VN", "ベトナム", null);
    expect(r.status).toBe("unavailable");
    expect(r.totalPct).toBeNull();
  });

  // 原簿の 19,831 行のうち 2,198 行が従量税。この道は必ず踏まれる。
  it("従量税(合計 null)は non_ad_valorem", () => {
    const r = toOriginRow("JP", "日本", { ...JP_CAR, duty_rate_total: null });
    expect(r.status).toBe("non_ad_valorem");
    expect(r.totalPct).toBeNull();
  });

  // LandedIQ は「根拠未確認の除外」を全額課税+警告として返す。
  // 数字だけ取り出して警告を捨てると、相手が 3 値で作ったものを 1 値の嘘に変えてしまう。
  it("未確認の除外は警告として持ち上げる", () => {
    const r = toOriginRow("CN", "中国", { ...JP_CAR, exclusion_status: "unverified" });
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("原簿側の warnings と unresolved も落とさない", () => {
    const r = toOriginRow("CN", "中国", {
      ...JP_CAR,
      warnings: ["リスト判定が未解決"],
      unresolved: ["301-china-list4a"],
    });
    expect(r.warnings).toContain("リスト判定が未解決");
    expect(r.warnings.some((w) => w.includes("301-china-list4a"))).toBe(true);
  });
});

describe("totalMatchesPrograms", () => {
  // 上限補正(top_up_to_total)の rate には「差額」がすでに入っている。
  // だから合計は単純な足し算で合う。実測: MFN 2.5 + 上限補正 10.0 = 12.5。
  // ここが崩れたら、原簿側で意味が変わったということ。
  it("合計は各プログラムの単純合計に一致する", () => {
    expect(totalMatchesPrograms(JP_CAR)).toBe(true);
  });

  it("合わなければ false", () => {
    expect(totalMatchesPrograms({ ...JP_CAR, duty_rate_total: 0.2 })).toBe(false);
  });
});
