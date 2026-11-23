/**
 * content/fetch-images/*.json の画像を取りに行き、public/news-images/ に保存する。
 *
 * 編集部の作業環境は画像サービス(Canva など)のダウンロード URL に直接つながらない。
 * GitHub Actions は外へ出られるので、URL を「取り寄せ票」として置いてもらい、ここで取る。
 * 取れた票は消す。ダウンロード URL は数時間で失効するので、票は置いたらすぐ push する。
 *
 * 票の形: { "url": "https://…", "path": "/news-images/<名前>.jpg" }
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const DIR = "content/fetch-images";
const LOCAL_IMAGE = /^\/news-images\/[A-Za-z0-9._-]+\.(?:png|jpe?g|webp)$/;
const MAX_BYTES = 5 * 1024 * 1024;

/** 先頭バイトで画像の種類を確かめる。拡張子やヘッダーは信用しない。 */
export function sniff(buf) {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return "png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";
  return null;
}

async function main() {
  if (!existsSync(DIR)) return;
  const tickets = readdirSync(DIR).filter((f) => f.endsWith(".json"));
  let failed = 0;
  for (const f of tickets) {
    const file = join(DIR, f);
    try {
      const t = JSON.parse(readFileSync(file, "utf8"));
      if (!LOCAL_IMAGE.test(t.path ?? ""))
        throw new Error(`path は /news-images/<名前>.png|jpg|webp: ${t.path}`);
      if (new URL(t.url).protocol !== "https:") throw new Error("url は https のみ");
      const out = join("public", t.path);
      if (existsSync(out)) throw new Error(`${t.path} は既にあります(上書きしません)`);

      const res = await fetch(t.url, { signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_BYTES) throw new Error(`大きすぎます(${buf.length} bytes)`);
      const kind = sniff(buf);
      if (!kind) throw new Error("画像ではありません");
      const ext = t.path.split(".").pop().replace("jpeg", "jpg");
      if (ext !== kind) throw new Error(`拡張子 .${ext} と中身(${kind})が違います`);

      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, buf);
      rmSync(file);
      console.log(`取得: ${t.path} (${Math.round(buf.length / 1024)} KB)`);
    } catch (e) {
      failed++;
      console.error(`✗ ${f}: ${e.message}`);
    }
  }
  if (failed) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
