import { describe, expect, it } from "vitest";

import { totalMatchesPrograms, type LandedIqResponse } from "../tariff";

const URL = process.env.LANDEDIQ_SUPABASE_URL;
const KEY = process.env.LANDEDIQ_ANON_KEY;

async function look(q: string, origin: string): Promise<LandedIqResponse> {
  const r = await fetch(`${URL}/functions/v1/hts-lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ q, origin }),
  });
  expect(r.ok).toBe(true);
  return (await r.json()) as LandedIqResponse;
}

// 資格情報が無い環境(通常の npm test)では黙って飛ばす。
describe.skipIf(!URL || !KEY)("LandedIQ との契約", () => {
  // ① 応答の形。相手の API が静かに変わるのを捕まえる。
  it("応答の形が変わっていない", async () => {
    const j = await look("8703230110", "JP");
    expect(typeof j.as_of).toBe("string");
    expect(Array.isArray(j.results)).toBe(true);
    const l = j.results[0];
    expect(typeof l.code).toBe("string");
    expect(typeof l.description).toBe("string");
    expect(typeof l.duty_rate_total).toBe("number");
    expect(Array.isArray(l.programs)).toBe(true);
    expect(typeof l.programs[0].code).toBe("string");
    expect(typeof l.programs[0].rate).toBe("number");
    expect(["none", "confirmed", "unverified"]).toContain(l.exclusion_status);
  });

  // ② 不変式。上限補正の rate に差額が入っている、という前提が生きているか。
  // 逐次で 3 回呼ぶので、既定の 5 秒では回線状況によって間に合わないことがある。
  it("合計が各プログラムの合計に一致する", async () => {
    for (const origin of ["JP", "CN", "MX"]) {
      const j = await look("8703230110", origin);
      expect(totalMatchesPrograms(j.results[0])).toBe(true);
      expect(j.results[0].duty_rate_total!).toBeGreaterThanOrEqual(0);
      expect(j.results[0].duty_rate_total!).toBeLessThanOrEqual(1);
    }
  }, 20_000);

  // ③ 値のスナップショット。
  //
  // ここが落ちたら壊れたのではない。**米国の関税が動いた**ということである。
  // 人が確かめに来るように、わざと失敗にしてある。静かな通知は誰も見ない。
  // 確認したら下の表を書き換えて、その変化を月次レポートに書く。
  //
  // 逐次で 5 回呼ぶので、既定の 5 秒では回線状況によって間に合わないことがある。
  it("税率が動いていない(動いていたら記事になる)", async () => {
    const SNAPSHOT: Record<string, number> = {
      JP: 0.125,
      KR: 0.125,
      DE: 0.1,
      CN: 0.4,
      MX: 0.025,
    };
    for (const [origin, expected] of Object.entries(SNAPSHOT)) {
      const j = await look("8703230110", origin);
      const got = j.results[0].duty_rate_total;
      expect(
        got,
        `税率が変わった。事実ならスナップショットを更新し、月次レポートに書くこと。\n` +
          `  8703230110 / ${origin}   ${(expected * 100).toFixed(1)}% → ${((got ?? 0) * 100).toFixed(1)}%`,
      ).toBeCloseTo(expected, 6);
    }
  }, 30_000);
});
