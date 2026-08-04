import { useState } from "react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const emailSchema = z
  .string()
  .trim()
  .min(5)
  .max(254)
  .regex(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, {
    message: "メールアドレスの形式が正しくありません。",
  });

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

// 表示は日本語、保存値は DB と共通(韓国語)にする — 値を変えると既存の購読者と揃わない。
const INTERESTS = [
  { label: "海上", value: "해상" },
  { label: "航空", value: "항공" },
  { label: "貿易", value: "무역" },
  { label: "物流", value: "물류" },
] as const;

export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [modalEmail, setModalEmail] = useState("");
  const [interests, setInterests] = useState<string[]>(INTERESTS.map((i) => i.value));
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  function toggleInterest(v: string) {
    setInterests((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  // 인라인 이메일 입력 → "登録する"는 곧바로 저장하지 않고, 입력값을 들고 팝업을 연다.
  function openModal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setModalEmail(email);
    setName("");
    setCompany("");
    setInterests(INTERESTS.map((i) => i.value));
    setConsent(false);
    setStatus({ kind: "idle" });
    setOpen(true);
    // 퍼널 1단계. 이게 없으면 낮은 전환율이 "폼을 안 열어서"인지
    // "열었다 이탈해서"인지 구분되지 않는다.
    trackEvent("newsletter_modal_open");
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(modalEmail);
    if (!parsed.success) {
      setStatus({ kind: "error", message: parsed.error.issues[0]?.message ?? "メールアドレスをご確認ください。" });
      return;
    }
    if (!name.trim()) {
      setStatus({ kind: "error", message: "お名前をご入力ください。" });
      return;
    }
    if (!consent) {
      setStatus({ kind: "error", message: "個人情報の取り扱いと配信への同意が必要です。" });
      return;
    }
    setStatus({ kind: "loading" });
    const { error } = await supabase.from("newsletter_subscribers").insert({
      email: parsed.data,
      name: name.trim(),
      company: company.trim() || null,
      interests,
      marketing_consent: true,
      consent_at: new Date().toISOString(),
      status: "active",
      source: "popup",
    });
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("duplicate") || msg.includes("unique") || error.code === "23505") {
        setStatus({ kind: "error", message: "このメールアドレスは登録済みです。" });
      } else {
        setStatus({ kind: "error", message: "登録できませんでした。しばらくしてから再度お試しください。" });
      }
      return;
    }
    setEmail("");
    // 퍼널 2단계 = 전환. GA4에서 주요 이벤트로 등록하면 세션→구독 전환율과
    // 유입 경로별 전환이 함께 나온다.
    trackEvent("sign_up", { method: "newsletter" });
    setStatus({ kind: "success", message: "ご登録ありがとうございます。" });
  }

  const field =
    "mt-1 w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-cyan)] focus:outline-none";

  return (
    <>
      <form onSubmit={openModal} className={compact ? "" : "max-w-md"}>
        <div className="flex gap-2">
          <input
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="min-w-0 flex-1 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--color-cyan)] focus:outline-none"
            aria-label="メールアドレス"
          />
          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm font-semibold text-[var(--color-navy-900)] transition-opacity hover:opacity-90"
            style={{ background: "var(--color-cyan)" }}
          >
            登録する
          </button>
        </div>
        <p className="mt-2 text-xs text-white/50">
          月1回配信、いつでも配信停止できます。
        </p>
      </form>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-[var(--color-ink)]">ニュースレター登録</DialogTitle>
            <DialogDescription className="text-[var(--color-ink-muted)]">
              月1回、運賃・港湾・貿易をまとめたマーケットレポートをお届けします。お名前・会社名をご記入いただくと内容を調整します。
            </DialogDescription>
          </DialogHeader>

          {status.kind === "success" ? (
            <div className="py-4 text-center">
              <p className="text-sm font-semibold text-[var(--color-ink)]">{status.message}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-4 rounded-md px-5 py-2 text-sm font-semibold text-white"
                style={{ background: "var(--color-navy-900)" }}
              >
                閉じる
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink)]">お名前 *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={80}
                  placeholder="山田 太郎"
                  className={field}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink)]">会社名</label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  maxLength={120}
                  placeholder="(任意) 所属先"
                  className={field}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink)]">メールアドレス *</label>
                <input
                  type="email"
                  value={modalEmail}
                  onChange={(e) => setModalEmail(e.target.value)}
                  required
                  maxLength={254}
                  placeholder="your@email.com"
                  className={field}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink)]">関心分野</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {INTERESTS.map((it) => {
                    const on = interests.includes(it.value);
                    return (
                      <button
                        type="button"
                        key={it.value}
                        onClick={() => toggleInterest(it.value)}
                        aria-pressed={on}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          on
                            ? "border-[var(--color-cyan)] bg-[var(--color-cyan)]/10 text-[var(--color-navy-900)]"
                            : "border-[var(--color-line)] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]"
                        }`}
                      >
                        {it.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-start gap-2 text-xs leading-relaxed text-[var(--color-ink)]">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 flex-none"
                />
                <span>
                  (必須) 個人情報の取り扱いおよび配信に同意します。{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-[var(--color-navy-900)]"
                  >
                    プライバシーポリシー
                  </a>
                </span>
              </label>

              {status.kind === "error" && <p className="text-xs text-rose-600">{status.message}</p>}
              <button
                type="submit"
                disabled={status.kind === "loading" || !consent}
                className="w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--color-navy-900)" }}
              >
                {status.kind === "loading" ? "登録中…" : "登録する"}
              </button>
              <p className="text-center text-[11px] text-[var(--color-ink-muted)]">
                いつでも配信停止できます。
              </p>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
