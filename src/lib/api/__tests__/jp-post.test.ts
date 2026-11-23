import { describe, expect, it } from "vitest";

// @ts-expect-error — scripts/ は素の ESM(.mjs)で型定義を持たない
import { toNewsRow, validatePost } from "../../../../scripts/lib/jp-post.mjs";
import { parseBodyImage } from "../article-image";

const base = {
  slug: "nagoya-record-rain-2026-09",
  title: "名古屋で観測史上最大の1時間雨量",
  summary: "9月8日、名古屋で1時間104.5ミリを観測した。",
  category: "物流",
  published_at: "2026-09-10T09:00:00+09:00",
  content:
    "## 何が起きたか\n\n本文。\n\n![1時間雨量 104.5mm](/news-images/nagoya-rain.png)\n出典: 気象庁",
};

describe("validatePost", () => {
  it("正しい記事は合格", () => {
    expect(validatePost(base, "nagoya-record-rain-2026-09.json")).toEqual([]);
  });

  it("必須項目・カテゴリ・ファイル名を検査する", () => {
    const errs = validatePost({ ...base, title: "", category: "その他" }, "other.json");
    expect(errs.some((e: string) => e.includes("title"))).toBe(true);
    expect(errs.some((e: string) => e.includes("category"))).toBe(true);
    expect(errs.some((e: string) => e.includes("ファイル名"))).toBe(true);
  });

  it("http の画像と代替テキストの無い画像を拒否する", () => {
    const http = validatePost({ ...base, content: "![図](http://example.com/a.png)" });
    expect(http.some((e: string) => e.includes("使えない画像"))).toBe(true);
    const noAlt = validatePost({ ...base, content: "![](/news-images/a.png)" });
    expect(noAlt.some((e: string) => e.includes("代替テキスト"))).toBe(true);
  });
});

describe("toNewsRow", () => {
  it("内部記事として URL・出典・言語を付け、画像を絶対 URL にする", () => {
    const row = toNewsRow({ ...base, image_url: "/news-images/hero.png" });
    expect(row).toMatchObject({
      lang: "ja",
      source: "Logisight",
      url: "https://jpn.logisight.net/article/nagoya-record-rain-2026-09",
      image_url: "https://jpn.logisight.net/news-images/hero.png",
    });
  });
});

describe("parseBodyImage", () => {
  it("画像と出典キャプションを読む", () => {
    expect(parseBodyImage("![1時間雨量](/news-images/a.png)\n出典: 気象庁")).toEqual({
      alt: "1時間雨量",
      src: "/news-images/a.png",
      credit: "気象庁",
    });
  });

  it("画像でない段落・許可されない URL は null", () => {
    expect(parseBodyImage("ただの段落")).toBeNull();
    expect(parseBodyImage("![x](javascript:alert(1))")).toBeNull();
    expect(parseBodyImage("![x](/etc/passwd.png)")).toBeNull();
  });
});
