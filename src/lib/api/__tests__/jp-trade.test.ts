import { describe, expect, it } from "vitest";

import { aggregateCommodities, countryJa, formatJpy, formatYoy } from "../jp-trade";

// jp_trade_by_commodity は品目 × 相手国の粒度。集計せずに行を並べたため、
// /trade の品目表に同じ品目が何十行も出て、しかも1国あたりの金額が小さく
// 「0億円 / 0.0%」で埋まっていた。実際に本番でそうなった。
const ROWS = [
  { direction: "export", commodity_name: "機械類及び輸送用機器", value_jpy: 1_392_440_675 },
  { direction: "export", commodity_name: "機械類及び輸送用機器", value_jpy: 927_810_802 },
  { direction: "export", commodity_name: "化学製品", value_jpy: 319_514_896 },
  { direction: "import", commodity_name: "鉱物性燃料", value_jpy: 500_000_000 },
];

describe("aggregateCommodities", () => {
  it("품목별로 합산한다 — 국가별 행이 그대로 나오면 안 된다", () => {
    const out = aggregateCommodities(ROWS, "export");
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe("機械類及び輸送用機器");
    expect(out[0].valueJpy).toBe(1_392_440_675 + 927_810_802);
  });

  it("방향으로 거른다", () => {
    expect(aggregateCommodities(ROWS, "import").map((x) => x.name)).toEqual(["鉱物性燃料"]);
  });

  it("금액 내림차순", () => {
    const out = aggregateCommodities(ROWS, "export");
    expect(out[0].valueJpy).toBeGreaterThan(out[1].valueJpy);
  });

  it("구성비 합이 100%", () => {
    const sum = aggregateCommodities(ROWS, "export").reduce((a, x) => a + x.sharePct, 0);
    expect(sum).toBeCloseTo(100, 6);
  });

  it("0·음수·비유한 값은 버린다 — 합계 분모를 오염시킨다", () => {
    const out = aggregateCommodities(
      [
        ...ROWS,
        { direction: "export", commodity_name: "原材料", value_jpy: 0 },
        { direction: "export", commodity_name: "雑製品", value_jpy: null },
      ],
      "export",
    );
    expect(out.map((x) => x.name)).not.toContain("原材料");
    expect(out.map((x) => x.name)).not.toContain("雑製品");
  });

  it("데이터가 없으면 빈 배열 — 0으로 나누지 않는다", () => {
    expect(aggregateCommodities([], "export")).toEqual([]);
    expect(aggregateCommodities([{ direction: "export", commodity_name: "x", value_jpy: 0 }], "export")).toEqual([]);
  });
});

// 単位は千円。表と本文で兆・億円に揃える。マイナスは日本の財務表記で ▲。
describe("formatJpy", () => {
  it("千円을 兆·億円으로", () => {
    expect(formatJpy(109_265_000_000)).toBe("109兆2,650億円");
    expect(formatJpy(1_000_000)).toBe("10億円"); // 1,000,000千円 = 10億円
  });

  it("마이너스는 ▲", () => {
    expect(formatJpy(-409_926_609)).toContain("▲");
  });

  it("값이 없으면 —", () => {
    expect(formatJpy(null)).toBe("—");
  });
});

describe("formatYoy", () => {
  it("마이너스는 ▲, 플러스는 +", () => {
    expect(formatYoy(19.34)).toBe("+19.3%");
    expect(formatYoy(-2.56)).toBe("▲2.6%"); // 2.55 は二進で 2.5499… になり境界が揺れる
    expect(formatYoy(null)).toBe("—");
  });
});

describe("countryJa", () => {
  it("영문 약어를 일본어명으로", () => {
    expect(countryJa("HG KONG")).toBe("香港");
    expect(countryJa("USA")).toBe("米国");
  });

  it("매핑에 없으면 원문", () => {
    expect(countryJa("NEWLAND")).toBe("NEWLAND");
  });
});
