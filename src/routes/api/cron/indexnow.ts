import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { SITE_URL, SITE_HOST as HOST } from "@/lib/seo";

/**
 * IndexNow への通知 —— 日次 cron。
 *
 * ■ 変わったものだけ送る
 * sitemap の <lastmod> を見て、直近 26 時間に動いた URL だけを送る。
 * 毎日同じ URL を送り直さない —— IndexNow は繰り返しの通知を歓迎しないし、
 * 「全部が毎日変わっている」と伝えるのは事実に反する。
 * 変わったものが無ければ 1 件も送らずに終わる。それが正しい状態である。
 *
 * ■ ニュースは別枠で拾う
 * 通常の sitemap は 500 件までで、古い記事が新着を押し出しうる。ニュースは
 * news-sitemap.xml(直近48時間)からも取り、重複は URL で除く。
 *
 * ■ 参加していないエンジン
 * Google は IndexNow に参加していない。ここで送っても Google には届かない。
 * 届くのは Bing・Yandex・Naver・Seznam など。日本での比重を考えると、
 * これは sitemap の代わりではなく上乗せである。
 *
 * 認証: Vercel cron は CRON_SECRET があれば Authorization: Bearer を自動で付ける。
 * 初回: ?seed=1 で lastmod を無視し、sitemap 全件を送る(登録直後の一度だけ)。
 */

const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;
const NEWS_SITEMAP_URL = `${SITE_URL}/news-sitemap.xml`;
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const WINDOW_MS = 26 * 60 * 60 * 1000; // 日次 cron に対する余裕
const MAX_URLS = 10000;

/** IndexNow が返す番号の意味。ログに数字だけ残すと、後から読めない。 */
const STATUS_MEANING: Record<number, string> = {
  200: "受理",
  202: "受理(検証待ち)",
  400: "書式が不正",
  403: "鍵が無効(キーファイルが読めない・中身が違う)",
  422: "URL がホストと一致しない、または鍵が規約に合わない",
  429: "送りすぎ",
};

function parseLocs(xml: string): { loc: string; lastmod?: string }[] {
  const out: { loc: string; lastmod?: string }[] = [];
  const urlRe = /<url>([\s\S]*?)<\/url>/g;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(xml))) {
    const block = m[1];
    const loc = /<loc>(.*?)<\/loc>/.exec(block)?.[1]?.trim();
    if (!loc) continue;
    const lastmod =
      /<lastmod>(.*?)<\/lastmod>/.exec(block)?.[1]?.trim() ??
      /<news:publication_date>(.*?)<\/news:publication_date>/.exec(block)?.[1]?.trim();
    out.push({ loc, lastmod });
  }
  return out;
}

async function fetchXml(
  url: string,
): Promise<{ ok: true; xml: string } | { ok: false; why: string }> {
  try {
    const r = await fetch(url, { headers: { "user-agent": "logisight-jp-indexnow-cron" } });
    if (!r.ok) return { ok: false, why: `HTTP ${r.status}` };
    return { ok: true, xml: await r.text() };
  } catch (e) {
    return { ok: false, why: (e as Error).message };
  }
}

export const Route = createFileRoute("/api/cron/indexnow")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
          console.error("[indexnow] 認証に失敗した。CRON_SECRET を確認する。");
          return new Response("Unauthorized", { status: 401 });
        }

        const key = process.env.INDEXNOW_KEY;
        if (!key) {
          console.error(
            "[indexnow] INDEXNOW_KEY が実行環境に無い。Production に入れて再デプロイする。",
          );
          return Response.json({ error: "INDEXNOW_KEY not set" }, { status: 500 });
        }

        const seed = new URL(request.url).searchParams.get("seed") === "1";
        const cutoff = Date.now() - WINDOW_MS;

        // sitemap は必須。取れなければ何も送らない —— 空リストを送るより黙るほうがよい。
        const main = await fetchXml(SITEMAP_URL);
        if (!main.ok) {
          console.error(`[indexnow] sitemap を取得できない: ${main.why}`);
          return Response.json({ error: `sitemap fetch: ${main.why}` }, { status: 502 });
        }

        // ニュースは補助。落ちても本体の通知は続ける。
        const news = await fetchXml(NEWS_SITEMAP_URL);
        if (!news.ok) console.error(`[indexnow] news-sitemap を取得できない(続行): ${news.why}`);

        const all = [...parseLocs(main.xml), ...(news.ok ? parseLocs(news.xml) : [])];

        const changed = seed
          ? all.map((e) => e.loc)
          : all
              .filter((e) => {
                if (!e.lastmod) return false; // 日付が無いものは「変わった」と言えない
                const t = Date.parse(e.lastmod);
                return !Number.isNaN(t) && t >= cutoff;
              })
              .map((e) => e.loc);

        // 二つの sitemap に同じ記事が載る。同じ URL を二度送らない。
        const urlList = [...new Set(changed)].slice(0, MAX_URLS);

        if (urlList.length === 0) {
          console.log(`[indexnow] seed=${seed} 送信 0 件(変更なし)`);
          return Response.json({ seed, submitted: 0, message: "no changed URLs" });
        }

        let status = 0;
        let body = "";
        try {
          const ping = await fetch(INDEXNOW_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({
              host: HOST,
              key,
              keyLocation: `${SITE_URL}/${key}.txt`,
              urlList,
            }),
          });
          status = ping.status;
          if (!ping.ok) body = (await ping.text().catch(() => "")).slice(0, 300);
        } catch (e) {
          console.error(`[indexnow] 送信に失敗した: ${(e as Error).message}`);
          return Response.json(
            { error: `submit failed: ${(e as Error).message}` },
            { status: 502 },
          );
        }

        const meaning = STATUS_MEANING[status] ?? "不明な応答";
        const line = `[indexnow] seed=${seed} 送信 ${urlList.length} 件 → ${status} ${meaning}`;
        if (status >= 200 && status < 300) console.log(line);
        else console.error(`${line}${body ? ` / ${body}` : ""}`);

        return Response.json({
          seed,
          submitted: urlList.length,
          truncated: changed.length > MAX_URLS,
          indexnowStatus: status,
          indexnowMeaning: meaning,
          ...(body ? { indexnowBody: body } : {}),
        });
      },
    },
  },
});
