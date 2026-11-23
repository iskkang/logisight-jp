/**
 * 記事本文の図版ブロック。編集記事(content/jp-posts)だけが使う。
 *
 *   ![代替テキスト](/news-images/xxx.png)
 *   出典: 気象庁、2026年9月8日
 *
 * 1行目が画像、2行目(任意)が「出典:」で始まるキャプション。
 * 画像はリポジトリ内(/news-images/…)か https の URL だけを通す。
 */
const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;
const LOCAL_IMAGE = /^\/news-images\/[A-Za-z0-9._-]+\.(?:png|jpe?g|webp|svg)$/;

export type BodyImage = { alt: string; src: string; credit: string | null };

export function parseBodyImage(block: string): BodyImage | null {
  const [first, ...rest] = block.trim().split("\n");
  const m = IMAGE_LINE.exec(first?.trim() ?? "");
  if (!m) return null;
  const src = m[2];
  let ok = LOCAL_IMAGE.test(src);
  if (!ok) {
    try {
      ok = new URL(src).protocol === "https:";
    } catch {
      ok = false;
    }
  }
  if (!ok) return null;
  const cap = rest.join(" ").trim();
  return {
    alt: m[1].trim(),
    src,
    credit: /^出典[:：]/.test(cap) ? cap.replace(/^出典[:：]\s*/, "") : null,
  };
}
