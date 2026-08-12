import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import { JpPage, SecTitle } from "@/components/jp/JpPage";
import { submitInquiry } from "@/lib/api/inquiry.functions";
import { seoHead } from "@/lib/seo";

/**
 * 輸送の相談窓口。
 *
 * バナー広告の遷移先でもある。?from= で流入元を受け取り、そのまま保存する —
 * 広告が実際に問い合わせを生むのかは、これが無いと測れない。
 * 会社サイトへ送っていた間はそこが切れていた。
 */
export const Route = createFileRoute("/contact")({
  validateSearch: z.object({ from: z.string().max(60).optional() }),
  head: () =>
    seoHead({
      title: "輸送のご相談 — Logisight",
      description:
        "中央アジア・ロシア向けを中心とした国際輸送のご相談を承ります。航路・品目・数量をお知らせください。担当者より折り返しご連絡します。",
      path: "/contact",
    }),
  component: Contact,
});

const INPUT =
  "w-full border border-[#ccd2d9] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#0b2d52]";

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-bold text-[#3c4652]">
        {label}
        {required && <span className="ml-1.5 text-[11px] font-normal text-[#c0392b]">必須</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-[#8a929c]">{hint}</span>}
    </label>
  );
}

function Contact() {
  const { from } = useSearch({ from: "/contact" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await submitInquiry({
        data: {
          name: String(f.get("name") ?? ""),
          company: String(f.get("company") ?? ""),
          email: String(f.get("email") ?? ""),
          phone: String(f.get("phone") ?? ""),
          message: String(f.get("message") ?? ""),
          website: String(f.get("website") ?? ""),
          source: from || "direct",
          // どのページから来たか。source が同じでも導線の違いが分かる。
          referrer: typeof document !== "undefined" ? document.referrer.slice(0, 500) : "",
        },
      });
      setDone(true);
    } catch (err) {
      // 何が起きたか分からないまま終わらせない。連絡先を必ず添える。
      setError(
        err instanceof Error && /メールアドレス|お名前|お問い合わせ内容/.test(err.message)
          ? err.message
          : "送信できませんでした。お手数ですが newsletter@logisight.net までご連絡ください。",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <JpPage
      crumbs={[{ label: "ホーム", to: "/" }, { label: "輸送のご相談" }]}
      title="輸送のご相談"
      lead="中央アジア・ロシア向けを中心とした国際輸送のご相談を承ります。航路・品目・数量をお知らせいただくと、折り返しのご案内が早くなります。"
    >
      {done ? (
        <div className="max-w-[640px] border border-[#0b2d52] bg-[#f7f9fb] px-6 py-8">
          <p className="text-[17px] font-bold text-[#0b2d52]">お問い合わせを受け付けました。</p>
          <p className="mt-3 text-[13.5px] leading-[1.9] text-[#3c4652]">
            担当者より、通常2営業日以内にご連絡いたします。お急ぎの場合は{" "}
            <a href="mailto:newsletter@logisight.net" className="underline">
              newsletter@logisight.net
            </a>{" "}
            までご連絡ください。
          </p>
          <Link
            to="/"
            className="mt-6 inline-block border border-[#0b2d52] px-4 py-2 text-[13px] font-bold text-[#0b2d52] transition-colors hover:bg-[#0b2d52] hover:text-white"
          >
            ホームへ戻る
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="max-w-[640px]">
          <SecTitle>お問い合わせ内容</SecTitle>

          <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2">
            <Field label="お名前" required>
              <input name="name" required maxLength={100} className={INPUT} autoComplete="name" />
            </Field>
            <Field label="会社名">
              <input name="company" maxLength={200} className={INPUT} autoComplete="organization" />
            </Field>
            <Field label="メールアドレス" required>
              <input
                name="email"
                type="email"
                required
                maxLength={200}
                className={INPUT}
                autoComplete="email"
              />
            </Field>
            <Field label="電話番号">
              <input name="phone" maxLength={50} className={INPUT} autoComplete="tel" />
            </Field>
          </div>

          <div className="mt-4">
            <Field
              label="ご相談内容"
              required
              hint="航路(例: 日本発ウズベキスタン)・品目・数量・希望時期をご記入いただくと、ご案内が早くなります。"
            >
              <textarea name="message" required rows={7} maxLength={4000} className={INPUT} />
            </Field>
          </div>

          {/* ボット除け。人には見えない。埋まっていればサーバー側で捨てる。 */}
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />

          <p className="mt-5 text-[12px] leading-[1.9] text-[#6b7683]">
            ご入力いただいた個人情報は、お問い合わせへの回答のためにのみ利用します。取り扱いは{" "}
            <Link to="/privacy" className="text-[#0b2d52] underline hover:no-underline">
              プライバシーポリシー
            </Link>
            をご確認ください。送信をもって同意いただいたものとします。
          </p>

          {error && (
            <p className="mt-4 border-l-[3px] border-[#c0392b] bg-[#fdecea] px-4 py-3 text-[13px] leading-[1.8] text-[#c0392b]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 bg-[#0b2d52] px-7 py-3 text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "送信中…" : "送信する"}
          </button>
        </form>
      )}
    </JpPage>
  );
}
