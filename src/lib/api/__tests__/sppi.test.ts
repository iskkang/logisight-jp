import { describe, expect, it } from "vitest";

import { splitYoy } from "../sppi";

describe("splitYoy", () => {
  // 外航貨物輸送の実測(2026年6月)。円ベース +52.8% / 契約通貨ベース +37.4%。
  // 差の 15.4pt が為替。この 2 系列を分けて出しているのがこの媒体の芯なので、
  // 数字が動いても関係が崩れないことをここで押さえる。
  it("公表された2つの前年同月比の差を為替分として返す", () => {
    const r = splitYoy(52.8, 37.4);
    expect(r).not.toBeNull();
    expect(r!.yenPct).toBeCloseTo(52.8, 1);
    expect(r!.contractPct).toBeCloseTo(37.4, 1);
    expect(r!.gapPt).toBeCloseTo(15.4, 1);
  });

  // 円高の局面では逆に振れる。符号を潰さない。
  it("円ベースのほうが低ければ差はマイナスになる", () => {
    expect(splitYoy(10, 18)!.gapPt).toBeCloseTo(-8, 6);
  });

  // 国内系列(道路・鉄道・内航・港湾運送・倉庫)は契約通貨ベースを公表しない。
  // 円で契約するので為替要因が無く、分けようがない。埋めずに null を返す。
  it("契約通貨ベースが無ければ null", () => {
    expect(splitYoy(52.8, null)).toBeNull();
    expect(splitYoy(null, 37.4)).toBeNull();
    expect(splitYoy(undefined, undefined)).toBeNull();
  });

  // 欠測が NaN で入ってくることがある。0 として扱うと「動いていない」に化ける。
  it("NaN は null", () => {
    expect(splitYoy(Number.NaN, 37.4)).toBeNull();
  });

  it("両方 0 でも分解自体は成り立つ", () => {
    const r = splitYoy(0, 0);
    expect(r).not.toBeNull();
    expect(r!.gapPt).toBe(0);
  });
});
