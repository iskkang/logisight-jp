/**
 * content/jp-posts/*.json — 編集部(MTL Japan)が書いた記事ファイルの検証と、maritime_news 行への変換。
 *
 * 記事は PR で入り、main に入った時点で GitHub Actions が maritime_news に書き込む。
 * main へのマージがそのまま「編集者の検収」になる。
 */

export const CATEGORIES = ["海上", "航空", "港湾", "鉄道", "貿易", "物流"];
export const SITE_URL = "https://jpn.logisight.net";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// 本文の画像はリポジトリ内(/news-images/…)か https の URL だけを許す。
const LOCAL_IMAGE = /^\/news-images\/[A-Za-z0-9._-]+\.(?:png|jpe?g|webp|svg)$/;
const BODY_IMAGE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;

function isAllowedImage(src) {
  if (LOCAL_IMAGE.test(src)) return true;
  try {
    return new URL(src).protocol === "https:";
  } catch {
    return false;
  }
}

/** 1件の記事を検証する。問題の一覧を返す(空なら合格)。 */
export function validatePost(post, fileName = "") {
  const errs = [];
  const need = (k) => typeof post?.[k] === "string" && post[k].trim().length > 0;

  for (const k of ["slug", "title", "summary", "category", "published_at", "content"]) {
    if (!need(k)) errs.push(`${k} がありません`);
  }
  if (need("slug")) {
    if (!SLUG.test(post.slug) || post.slug.length > 80)
      errs.push("slug は英小文字・数字・ハイフンのみ(80字以内)");
    if (fileName && fileName !== `${post.slug}.json`)
      errs.push(`ファイル名は ${post.slug}.json にしてください`);
  }
  if (need("category") && !CATEGORIES.includes(post.category)) {
    errs.push(`category は ${CATEGORIES.join("・")} のどれか`);
  }
  if (need("published_at") && Number.isNaN(Date.parse(post.published_at))) {
    errs.push("published_at は ISO 8601 日時");
  }
  if (
    post?.tags != null &&
    !(Array.isArray(post.tags) && post.tags.every((t) => typeof t === "string"))
  ) {
    errs.push("tags は文字列の配列");
  }
  if (post?.image_url != null && !isAllowedImage(post.image_url)) {
    errs.push("image_url は /news-images/… か https の URL");
  }
  if (need("content")) {
    for (const block of post.content.split(/\n{2,}/)) {
      const first = block.trim().split("\n")[0];
      if (first.startsWith("![")) {
        const m = BODY_IMAGE.exec(first);
        if (!m) errs.push(`画像の書式が不正: ${first}`);
        else if (!isAllowedImage(m[2])) errs.push(`使えない画像 URL: ${m[2]}`);
        else if (!m[1].trim()) errs.push(`画像に代替テキストがありません: ${m[2]}`);
      }
    }
  }
  return errs;
}

/** 記事が使うリポジトリ内の画像(/news-images/…)の一覧。代表画像と本文の図版。 */
export function localImagePaths(post) {
  const paths = [];
  if (post.image_url && LOCAL_IMAGE.test(post.image_url)) paths.push(post.image_url);
  for (const block of String(post.content ?? "").split(/\n{2,}/)) {
    const m = BODY_IMAGE.exec(block.trim().split("\n")[0]);
    if (m && LOCAL_IMAGE.test(m[2])) paths.push(m[2]);
  }
  return [...new Set(paths)];
}

/** 記事ファイル → maritime_news の行。 */
export function toNewsRow(post) {
  return {
    slug: post.slug,
    lang: "ja",
    title: post.title.trim(),
    summary: post.summary.trim(),
    content: post.content.trim(),
    category: post.category,
    tags: post.tags ?? null,
    published_at: post.published_at,
    // 一覧・OGP 側の画像処理は絶対 URL しか通さない(sanitizeNewsImageUrl)ので、ここで絶対化する。
    image_url: post.image_url ? new URL(post.image_url, SITE_URL).href : null,
    image_source: post.image_source ?? null,
    image_credit: post.image_credit ?? null,
    source: "Logisight",
    url: `${SITE_URL}/article/${post.slug}`,
  };
}
