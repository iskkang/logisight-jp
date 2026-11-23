/**
 * content/jp-posts/*.json を maritime_news(lang=ja)に反映する。
 * 同じ slug の行があれば更新、無ければ追加。ファイルを消しても行は消さない。
 *
 * 環境変数:
 *   SUPABASE_URL               - Supabase プロジェクト URL
 *   SUPABASE_SERVICE_ROLE_KEY  - service_role キー
 *
 *   --check を付けると検証だけ行い、DB には書かない。
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

import { localImagePaths, toNewsRow, validatePost } from "./lib/jp-post.mjs";

const DIR = "content/jp-posts";
const checkOnly = process.argv.includes("--check");

const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();
const posts = [];
let bad = 0;
for (const f of files) {
  let post;
  try {
    post = JSON.parse(readFileSync(join(DIR, f), "utf8"));
  } catch (e) {
    console.error(`✗ ${f}: JSON として読めません (${e.message})`);
    bad++;
    continue;
  }
  const errs = validatePost(post, f);
  if (errs.length) {
    console.error(`✗ ${f}:\n  - ${errs.join("\n  - ")}`);
    bad++;
  } else {
    posts.push(post);
  }
}
if (bad) process.exit(1);
console.log(`${posts.length} 件の記事ファイルを検証しました。`);
if (checkOnly) process.exit(0);

// 掲載する前に、本文と代表画像が指すリポジトリ内の画像が揃っているかを確かめる。
// 取り寄せ(fetch-images.yml)が終わる前にマージされると、画像の欠けた記事が出てしまう。
const missing = posts.flatMap((p) =>
  localImagePaths(p)
    .filter((path) => !existsSync(join("public", path)))
    .map((path) => `${p.slug}: ${path}`),
);
if (missing.length) {
  console.error(
    `画像がまだありません(取り寄せが終わっていない可能性):\n  - ${missing.join("\n  - ")}`,
  );
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Required env vars missing: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws },
});

for (const post of posts) {
  const row = toNewsRow(post);
  const { data: existing, error: findErr } = await supabase
    .from("maritime_news")
    .select("id")
    .eq("slug", row.slug)
    .eq("lang", "ja")
    .limit(1);
  if (findErr) throw new Error(findErr.message);

  if (existing && existing.length > 0) {
    const { error } = await supabase.from("maritime_news").update(row).eq("id", existing[0].id);
    if (error) throw new Error(`${row.slug}: ${error.message}`);
    console.log(`更新: ${row.slug}`);
  } else {
    const { error } = await supabase.from("maritime_news").insert(row);
    if (error) throw new Error(`${row.slug}: ${error.message}`);
    console.log(`追加: ${row.slug}`);
  }
}
