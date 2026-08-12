import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 問い合わせの受付。
 *
 * ■ 順番
 * 先に DB へ残し、そのあとに通知メールを送る。逆にすると、メールが飛んだのに
 * 記録が無い、という取りこぼしが起きる。メール送信が失敗しても受付は成功として
 * 返す — 送信者から見れば送れているのに「失敗」と出るのが一番困る。
 * 失敗はサーバーログに残し、DB の行から拾い直せるようにする。
 *
 * ■ anon で書かない
 * service_role でだけ書く。anon に insert を許すと、フォームを通さない直接投稿で
 * いくらでも埋められる。
 */

const InquirySchema = z.object({
  name: z.string().trim().min(1, "お名前を入力してください").max(100),
  company: z.string().trim().max(200).optional(),
  email: z.string().trim().email("メールアドレスの形式が正しくありません").max(200),
  phone: z.string().trim().max(50).optional(),
  message: z.string().trim().min(10, "お問い合わせ内容をご記入ください").max(4000),
  source: z.string().trim().max(60).optional(),
  referrer: z.string().trim().max(500).optional(),
  // 単純なボット除け。人には見えない欄で、埋まっていれば機械である。
  website: z.string().max(200).optional(),
});

async function serviceClient(): Promise<SupabaseClient> {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, {
    auth: { persistSession: false },
  }) as unknown as SupabaseClient;
}

/**
 * 通知の宛先。
 *
 * 環境変数が無いときに黙って送らないと、問い合わせが来ていることに誰も気づかない。
 * 相談窓口は決まっているので、既定値をコードに持つ。INQUIRY_EMAIL で上書きできる。
 * (INTERNAL_EMAIL は他の用途で個人宛になっているので、ここでは使わない。)
 */
const INQUIRY_TO = "info@mtlb.co.kr";

/** 通知メール。失敗しても受付そのものは止めない。 */
async function notify(row: z.infer<typeof InquirySchema>, id: number): Promise<void> {
  const key = process.env["RESEND_API_KEY"];
  const to = process.env["INQUIRY_EMAIL"] || INQUIRY_TO;
  if (!key) {
    console.warn("[inquiry] RESEND_API_KEY 未設定 — 通知を送らない");
    return;
  }
  const lines = [
    `受付番号: ${id}`,
    `お名前: ${row.name}`,
    `会社名: ${row.company || "(未記入)"}`,
    `メール: ${row.email}`,
    `電話: ${row.phone || "(未記入)"}`,
    `流入元: ${row.source || "direct"}`,
    `送信元ページ: ${row.referrer || "(不明)"}`,
    "",
    "── お問い合わせ内容 ──",
    row.message,
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      // 送信ドメインは Resend で検証済みのものしか使えない。検証されているのは
      // mtlb.co.kr で、logisight.net は入っていない — ここを logisight.net に
      // すると Resend が送信を拒否し、通知だけが静かに落ちる。
      from: "Logisight <noreply@mtlb.co.kr>",
      to: [to],
      // 返信でそのまま相手に返せるようにする。
      reply_to: row.email,
      subject: `【問い合わせ】${row.company || row.name} 様`,
      text: lines,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export const submitInquiry = createServerFn({ method: "POST" })
  .inputValidator(InquirySchema)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    // ボットは見えない欄を埋める。受け付けたように見せて、何も残さない。
    if (data.website) return { ok: true };

    const sb = await serviceClient();
    const { data: inserted, error } = await sb
      .from("jp_inquiries")
      .insert({
        name: data.name,
        company: data.company || null,
        email: data.email,
        phone: data.phone || null,
        message: data.message,
        source: data.source || "direct",
        referrer: data.referrer || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    try {
      await notify(data, (inserted as { id: number }).id);
    } catch (e) {
      // 記録は残っている。通知の失敗で送信者に失敗を返さない。
      console.error("[inquiry] 通知メール失敗:", (e as Error).message);
    }
    return { ok: true };
  });
