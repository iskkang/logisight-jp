import { describe, expect, it } from "vitest";

import { driverJa } from "../climate-ja";

describe("driverJa", () => {
  it("危険要因だけの場合", () => {
    expect(driverJa("정상")).toBe("平常");
    expect(driverJa("결빙")).toBe("結氷");
  });

  it("括弧つきの説明を数値を保ったまま訳す", () => {
    expect(driverJa("강풍 (지속풍 21m/s)")).toBe("強風(持続風 21m/s)");
    expect(driverJa("극한고온 (일최고 39℃)")).toBe("極端な高温(日最高 39℃)");
    expect(driverJa("침수 (강수 84mm)")).toBe("浸水(降水 84mm)");
  });

  // 「높은 파고 (3.7m)」は説明に語がなく数値だけである。
  it("説明が数値だけなら数値をそのまま残す", () => {
    expect(driverJa("높은 파고 (3.7m)")).toBe("高波(3.7m)");
    expect(driverJa("한파 (-18℃)")).toBe("寒波(-18℃)");
  });

  // 訳せないものを消すと、何が起きているのか分からなくなる。
  it("未知の語はそのまま返す", () => {
    expect(driverJa("황사 (농도 300)")).toBe("황사(농도 300)");
    expect(driverJa("")).toBe("");
    expect(driverJa(null)).toBe(null);
  });
});
