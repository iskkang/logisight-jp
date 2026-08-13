import { describe, expect, it } from "vitest";

import {
  HS_CACHE_TTL_MS,
  classifyInput,
  decideCacheFreshness,
  dotted,
  parentOf,
  toHsLine,
} from "../hs-lines";

describe("classifyInput", () => {
  // 日本の輸出統計品目番号。点とハイフンの入った表記がそのまま貼られる。
  it("日本の品目番号を HS6 に落とす", () => {
    expect(classifyInput("8708.29-090").hs6).toBe("870829");
    expect(classifyInput("870829090").hs6).toBe("870829");
  });

  // 米国 HTS も頭6桁は同じものを指す。だから同じ扱いでよい。
  it("米国 HTS も同じ HS6 になる", () => {
    expect(classifyInput("8708291500").hs6).toBe("870829");
    expect(classifyInput("8708.29").hs6).toBe("870829");
  });

  // 章・項だけの入力も前方一致で引ける。6桁に満たなくても落とさない。
  it("4桁でも受ける", () => {
    const r = classifyInput("8703");
    expect(r.kind).toBe("code");
    expect(r.hs6).toBe("8703");
  });

  it("辞書の日本語は HS6 に変わる", () => {
    const r = classifyInput("自動車部品");
    expect(r.kind).toBe("term");
    expect(r.hs6).toBe("870829");
  });

  // ここで機械翻訳に逃げない。違う品目を出すほうが、何も出ないより悪い。
  it("辞書にない日本語と短すぎる数字は unknown", () => {
    expect(classifyInput("宇宙船").kind).toBe("unknown");
    expect(classifyInput("87").kind).toBe("unknown");
    expect(classifyInput("   ").kind).toBe("unknown");
  });
});

describe("parentOf", () => {
  // 8703.23 は「Other」が3行あり、末端だけでは見分けが付かない。
  it("末端の一つ上を返す", () => {
    expect(parentOf("A > B > Station wagons and passenger vans > Other", "Other")).toBe(
      "Station wagons and passenger vans",
    );
  });

  // leaf が無い(または末尾と一致しない)ときは、末尾そのものを返す。
  // 持っている中で一番具体的なのがそれだからで、空欄にすると手がかりが消える。
  it("leaf が無ければ末尾を返す", () => {
    expect(parentOf("A > B", null)).toBe("B");
  });

  it("階層が1つしかなければ空", () => {
    expect(parentOf("A", "A")).toBe("");
  });
});

describe("dotted", () => {
  it("項・号・8桁・10桁を区切る", () => {
    expect(dotted("8703")).toBe("8703");
    expect(dotted("870829")).toBe("8708.29");
    expect(dotted("87082915")).toBe("8708.29.15");
    expect(dotted("8708291500")).toBe("8708.29.15.00");
  });

  // 想定外の桁数を無理に区切らない。読み合わせのための表示なので、嘘の形にしない。
  it("想定外の桁数はそのまま", () => {
    expect(dotted("87082")).toBe("87082");
    expect(dotted("")).toBe("");
  });
});

describe("toHsLine", () => {
  it("leaf が無くても空文字で埋めて落ちない", () => {
    const r = toHsLine({ code: "8708291500", description: "A > B", leaf: null });
    expect(r.leaf).toBe("");
    expect(r.parent).toBe("B");
  });
});

describe("decideCacheFreshness", () => {
  it("行が無ければ miss", () => {
    expect(decideCacheFreshness(null, Date.now())).toBe("miss");
  });

  it("TTL 内は fresh、超えたら stale", () => {
    const now = Date.parse("2026-08-13T00:00:00Z");
    expect(decideCacheFreshness(new Date(now - 60_000).toISOString(), now)).toBe("fresh");
    expect(decideCacheFreshness(new Date(now - HS_CACHE_TTL_MS - 1).toISOString(), now)).toBe(
      "stale",
    );
  });

  // 境界そのもの。TTL ちょうどは期限切れとして扱う。
  it("TTL ちょうどは stale", () => {
    const now = Date.parse("2026-08-13T00:00:00Z");
    expect(decideCacheFreshness(new Date(now - HS_CACHE_TTL_MS).toISOString(), now)).toBe("stale");
  });
});
