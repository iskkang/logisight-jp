// 日本版の入口を測る。node scripts/funnel.mjs [日数=8]
//
// 2026-08-13 時点の基準値: 8日で 324人 / 1人あたり 1.82ページ / 登録 0人。
//
// ■ 人と巡回を混ぜて読まないこと
// 8/08〜8/10 は「1人あたり 1.0ページ」に落ちる。中を見ると 140 件が 89 の別経路に
// 散り、要求の間隔は中央値 270 秒で 24 時間に均されていた。人はこう見ない ——
// 時間が固まり、同じ経路を往復する。Bing に sitemap を出した直後なので巡回である。
// この窓を人の数として読むと「大勢が来て一目で帰った」という誤った像になる。実際に
// そう読み違えた。
//
// 巡回を除いた日は 1人あたり 2〜6ページ出ている。つまり **入った人は見て回っている**。
// 止まっているのは登録のほうで、そこは 0 のまま動いていない。
//
// ■ だから見る順番
//   1. 登録   —— これは曖昧さがない。0 なら 0 である。
//   2. ページ/人 —— ただし巡回の窓を除いて読む。
//
// 測り方を変えないこと。基準が動くと比べられなくなる。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL_ = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が .env に無い。");
  process.exit(1);
}

const days = Number(process.argv[2] ?? 8);
const since = new Date(Date.now() - days * 86400_000).toISOString();

const get = async (q) => {
  const r = await fetch(`${URL_}/rest/v1/${q}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: "count=exact" },
  });
  if (!r.ok) throw new Error(`${q}: HTTP ${r.status}`);
  return { rows: await r.json(), range: r.headers.get("content-range") };
};

// site_views は 1000 行で頭打ちになる。期間が延びると静かに切れるので、必ず送る。
const views = [];
for (let offset = 0; ; offset += 1000) {
  const { rows } = await get(
    `site_views?select=anon_id,path,created_at,referrer&created_at=gte.${since}` +
      `&order=created_at.desc&limit=1000&offset=${offset}`,
  );
  views.push(...rows);
  if (rows.length < 1000) break;
}

const { range: profileRange } = await get("jp_profiles?select=user_id&limit=1");
const { rows: consent } = await get("jp_profiles?select=user_id&newsletter_opt_in=is.true");
const { range: inquiryRange } = await get("jp_inquiries?select=id&limit=1");

const byDay = new Map();
for (const v of views) {
  const d = String(v.created_at).slice(0, 10);
  if (!byDay.has(d)) byDay.set(d, { views: 0, people: new Set() });
  const e = byDay.get(d);
  e.views += 1;
  e.people.add(v.anon_id ?? "?");
}

const people = new Set(views.map((v) => v.anon_id)).size;
const perPerson = people ? (views.length / people).toFixed(2) : "—";

console.log(`直近 ${days} 日`);
console.log(`  ページ表示   ${views.length}`);
console.log(`  訪問者       ${people} 人`);
console.log(`  1人あたり    ${perPerson} ページ   ← ここが動いたかを見る`);
console.log(`  登録         ${(profileRange ?? "?/0").split("/")[1]} 人`);
console.log(`  配信同意     ${consent.length} 人`);
console.log(`  問い合わせ   ${(inquiryRange ?? "?/0").split("/")[1]} 件`);

console.log("\n日別  表示 / 人 / 1人あたり");
for (const d of [...byDay.keys()].sort().reverse()) {
  const e = byDay.get(d);
  const per = (e.views / e.people.size).toFixed(2);
  console.log(
    `  ${d}  ${String(e.views).padStart(4)} / ${String(e.people.size).padStart(3)}人 / ${per}`,
  );
}

const paths = new Map();
for (const v of views) paths.set(v.path, (paths.get(v.path) ?? 0) + 1);
console.log("\nよく見られた経路");
for (const [p, n] of [...paths.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.log(`  ${String(p).padEnd(30)}${n}`);
}

console.log("\n基準(2026-08-13): 313人 / 1.0〜1.4ページ / 登録 0人");
