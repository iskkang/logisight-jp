# 原産地別 対米関税比較 (`/tariff`) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `jpn.logisight.net/tariff` 에서 품목 하나를 고르면 원산지 6개의 미국 수입 관세를 나란히 비교하는 페이지를 만든다.

**Architecture:** TanStack Start 라우트 하나 + 서버 함수 하나. 세율은 별도 Supabase 프로젝트(LandedIQ)에 배포된 엣지 함수 `hts-lookup` 을 서버에서 호출해 얻고, `jp_tariff_cache` 테이블에 24시간 보관한다. 캐시는 성능 최적화가 아니라 **동작 조건**이다 — LandedIQ 는 IP당 분당 30회 제한이고 서버 호출은 전부 같은 IP로 보인다.

**Tech Stack:** TanStack Start / React 19 / zod / vitest 4 / Supabase (PostgREST + Edge Functions) / Tailwind

설계서: [`docs/superpowers/specs/2026-08-12-jp-tariff-origin-comparison-design.md`](../specs/2026-08-12-jp-tariff-origin-comparison-design.md)

## Global Constraints

- **화면 문구와 코드 주석은 전부 일본어.** 한국어가 이 저장소의 산출물에 들어가면 안 된다. 이 계획서와 설계서만 예외(작업자용).
- **금액을 내지 않는다.** 단가·수량·운임 입력 칸을 만들지 않는다. 세율(%)과 그 차이(pt)만 보여준다.
- **빈칸을 0%로 메우지 않는다.** 「관세가 없다」와 「못 받아왔다」는 다른 말이다.
- **LandedIQ 의 경고를 삼키지 않는다.** `warnings`, `unresolved`, `exclusion_status: "unverified"` 는 화면에 그대로 올린다.
- LandedIQ 응답 형태를 아는 코드는 `src/lib/api/tariff.ts` **한 파일 안에만** 둔다.
- 순수 로직은 `*.ts`, 서버 호출은 `*.functions.ts` — 이 저장소의 기존 분리를 따른다.
- 테스트는 `src/lib/api/__tests__/` 에 두고 `import { describe, expect, it } from "vitest"` 로 시작한다.
- 네트워크가 필요한 테스트는 `describe.skipIf(!process.env.LANDEDIQ_ANON_KEY)` 로 감싼다. `npm test` 가 자격증명 없이도 초록이어야 한다.

## File Structure

| 파일 | 책임 |
|---|---|
| `src/lib/api/hs-dictionary.ts` | 일본어 품목명 → HS 접두 22개. 순수 데이터 + 조회 함수 |
| `src/lib/api/tariff.ts` | LandedIQ 응답 타입·입력 판별·행 정규화·불변식. **외부 계약을 아는 유일한 파일** |
| `src/lib/api/tariff.functions.ts` | `getTariffCandidates` / `getOriginComparison` 서버 함수 + 캐시 |
| `src/components/tariff/TariffSearch.tsx` | 입력칸·사전 칩·후보 목록 |
| `src/components/tariff/OriginTable.tsx` | 원산지 비교 표 |
| `src/components/tariff/JpTariff.tsx` | 페이지 껍데기 — 상태 보유, 운임 한 줄, 면책 |
| `src/routes/tariff.tsx` | 라우트·`validateSearch`·SEO |
| `.github/workflows/tariff-snapshot.yml` | 세율 스냅샷 감시 (주 1회) |
| `<logisight>/supabase/migrations/20260812000004_jp_tariff_cache.sql` | 캐시 테이블. **마이그레이션은 `logisight` 저장소에 둔다** (최근 것들이 거기 있다) |

---

## Task 1: 품목 사전

일본어 품목명으로 HS 접두를 찾는다. 원장 설명문이 영어라 「乗用車」로는 0건이 나오기 때문이다(실측). 네트워크가 필요 없는 순수 모듈이라 먼저 만든다.

**Files:**
- Create: `src/lib/api/hs-dictionary.ts`
- Test: `src/lib/api/__tests__/hs-dictionary.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `export type HsTerm = { ja: string; hs: string; en: string }`, `export const HS_TERMS: HsTerm[]`, `export function lookupHs(input: string): HsTerm | null`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/api/__tests__/hs-dictionary.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { HS_TERMS, lookupHs } from "../hs-dictionary";

describe("hs-dictionary", () => {
  it("完全一致で引ける", () => {
    expect(lookupHs("乗用車")?.hs).toBe("8703.23");
    expect(lookupHs("半導体製造装置")?.hs).toBe("8486.20");
  });

  // 入力途中でも当てたい。「自動車」まで打った時点で候補が出るのが自然。
  it("前方一致で引ける", () => {
    expect(lookupHs("自動車")?.ja).toBe("自動車部品");
  });

  // 前後の空白は利用者の責任ではない。
  it("空白を落として引く", () => {
    expect(lookupHs("  タイヤ  ")?.hs).toBe("4011.10");
  });

  it("知らない語は null", () => {
    expect(lookupHs("宇宙船")).toBeNull();
    expect(lookupHs("")).toBeNull();
  });

  // 辞書が壊れると、違う品目の正しい税率を見せることになる。一番たちが悪い。
  it("辞書の形が壊れていない", () => {
    expect(HS_TERMS.length).toBeGreaterThanOrEqual(22);
    for (const t of HS_TERMS) {
      expect(t.hs).toMatch(/^\d{4}\.\d{2}$/);
      expect(t.ja.length).toBeGreaterThan(0);
      expect(t.en.length).toBeGreaterThan(0);
    }
    const ja = HS_TERMS.map((t) => t.ja);
    expect(new Set(ja).size).toBe(ja.length); // 重複なし
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

```
npm test -- hs-dictionary
```
기대: `Cannot find module '../hs-dictionary'` 로 FAIL.

- [ ] **Step 3: 최소 구현**

`src/lib/api/hs-dictionary.ts`:

```ts
/**
 * 日本語の品目名から HS の頭を引く。
 *
 * 原簿(LandedIQ)の説明文は英語なので、「乗用車」で照会すると 0 件になる。
 * 実測: "motor car" は 20 件、"乗用車" は 0 件。利用者に米国 HTS の番号を
 * 覚えていろとは言えないので、こちらで橋を架ける。
 *
 * 載せた 22 件はすべて実際に照会して結果が出ることを確かめてある。
 * 対米輸出の 72% が「機械類及び輸送用機器」1グループに寄っているので、
 * この数でも実務の大半には届く。
 *
 * 増やすのは 1 行の追加なので、問い合わせが来たら足す。
 * 日本語を機械翻訳して検索する道は採らない —— 違う品目の正しい税率を
 * 見せるほうが、何も出ないより悪い。
 */
export type HsTerm = {
  /** 画面に出す日本語名。チップの文言でもある。 */
  ja: string;
  /** HS の頭 4+2 桁。これで照会すると数行が返る。 */
  hs: string;
  /** 原簿側の英語名。利用者が確認するための手がかり。 */
  en: string;
};

/** 並び順がそのまま優先順位。前方一致は先に置いたものが勝つ。 */
export const HS_TERMS: HsTerm[] = [
  { ja: "乗用車", hs: "8703.23", en: "Motor cars, 1,500–3,000 cc" },
  { ja: "自動車部品", hs: "8708.29", en: "Parts of bodies" },
  { ja: "自動車エンジン", hs: "8407.34", en: "Spark-ignition engines" },
  { ja: "タイヤ", hs: "4011.10", en: "Tyres, motor cars" },
  { ja: "油圧ショベル", hs: "8429.52", en: "Machinery with 360° superstructure" },
  { ja: "ブルドーザ", hs: "8429.11", en: "Bulldozers, track laying" },
  { ja: "マシニングセンタ", hs: "8457.10", en: "Machining centres" },
  { ja: "旋盤", hs: "8458.11", en: "Horizontal lathes, numerically controlled" },
  { ja: "半導体製造装置", hs: "8486.20", en: "Machines for manufacturing semiconductors" },
  { ja: "集積回路", hs: "8542.31", en: "Processors and controllers" },
  { ja: "プリント基板", hs: "8534.00", en: "Printed circuits" },
  { ja: "蓄電池", hs: "8507.60", en: "Lithium-ion accumulators" },
  { ja: "電動機", hs: "8501.31", en: "DC motors, not exceeding 750 W" },
  { ja: "ベアリング", hs: "8482.10", en: "Ball bearings" },
  { ja: "光学レンズ", hs: "9002.11", en: "Objective lenses" },
  { ja: "計測機器", hs: "9031.80", en: "Measuring instruments, other" },
  { ja: "医療機器", hs: "9018.90", en: "Medical instruments, other" },
  { ja: "熱延鋼板", hs: "7208.10", en: "Flat-rolled iron, hot-rolled" },
  { ja: "アルミ地金", hs: "7601.10", en: "Aluminium, not alloyed" },
  { ja: "プラスチック", hs: "3901.10", en: "Polyethylene" },
  { ja: "有機化学品", hs: "2902.30", en: "Toluene" },
  { ja: "ゴム製品", hs: "4016.99", en: "Articles of vulcanised rubber" },
];

/**
 * 完全一致 → 前方一致 → 部分一致 の順に引く。
 * 順に落としていくので、結果は入力に対して一意に決まる。
 */
export function lookupHs(input: string): HsTerm | null {
  const q = input.trim();
  if (!q) return null;
  return (
    HS_TERMS.find((t) => t.ja === q) ??
    HS_TERMS.find((t) => t.ja.startsWith(q)) ??
    HS_TERMS.find((t) => t.ja.includes(q)) ??
    null
  );
}
```

- [ ] **Step 4: 통과를 확인한다**

```
npm test -- hs-dictionary
```
기대: 5 tests PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/api/hs-dictionary.ts src/lib/api/__tests__/hs-dictionary.test.ts
git commit -m "feat(tariff): 일본어 품목명으로 HS 를 찾는 사전

원장 설명문이 영어라 「乗用車」로는 0건이 나온다. 22개는 전부 실제
조회로 결과가 나오는 것만 넣었다."
```

---

## Task 2: 입력 판별과 응답 정규화

LandedIQ 응답을 우리 표의 한 행으로 바꾼다. **외부 계약을 아는 코드는 이 파일 하나뿐이어야 한다** — 남의 API가 바뀔 때 고칠 곳이 한 군데여야 하기 때문이다. 여전히 네트워크가 필요 없다.

**Files:**
- Create: `src/lib/api/tariff.ts`
- Test: `src/lib/api/__tests__/tariff.test.ts`

**Interfaces:**
- Consumes: `HsTerm`, `lookupHs` (Task 1)
- Produces:
  - `export type LandedIqProgram`, `LandedIqLine`, `LandedIqResponse`
  - `export type OriginRow = { origin: string; labelJa: string; status: "ok" | "unavailable" | "non_ad_valorem"; totalPct: number | null; breakdown: { label: string; pct: number }[]; warnings: string[] }`
  - `export type InputKind = { kind: "code" | "term" | "english" | "unknown"; q: string; term?: HsTerm }`
  - `export const DEFAULT_ORIGINS: { code: string; ja: string }[]`, `export const MAX_ORIGINS: number`
  - `export function classifyInput(raw: string): InputKind`
  - `export function normalizeQuery(raw: string): string`
  - `export function toOriginRow(origin: string, labelJa: string, line: LandedIqLine | null): OriginRow`
  - `export function totalMatchesPrograms(line: LandedIqLine): boolean`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/lib/api/__tests__/tariff.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  classifyInput,
  normalizeQuery,
  toOriginRow,
  totalMatchesPrograms,
  type LandedIqLine,
} from "../tariff";

/** 実測値そのまま。8703.23 / origin=JP の応答。 */
const JP_CAR: LandedIqLine = {
  code: "8703230110",
  description: "Motor cars ... > Motor homes",
  leaf: "Motor homes",
  base_mfn: 0.025,
  programs: [
    {
      code: "301-forced-labor-topup",
      name: "Section 301 — forced labor (combined-rate targets)",
      authority: "Section 301",
      rate: 0.1,
      rate_type: "top_up_to_total",
      exclusion: "none",
    },
    {
      code: "mfn",
      name: "Base MFN (Column 1 General)",
      authority: "MFN",
      rate: 0.025,
      rate_type: "additive",
      exclusion: "none",
    },
  ],
  duty_rate_total: 0.125,
  unresolved: [],
  exclusion_status: "none",
  warnings: [],
};

describe("classifyInput", () => {
  it("数字4桁以上はコードとして扱う", () => {
    expect(classifyInput("8703.23").kind).toBe("code");
    expect(classifyInput("8703230110").kind).toBe("code");
  });

  // 3桁では章すら決まらない。コード扱いすると 0 件になって行き止まりになる。
  it("数字が3桁以下ならコードではない", () => {
    expect(classifyInput("870").kind).not.toBe("code");
  });

  it("辞書にある日本語は term になり、HS が付く", () => {
    const r = classifyInput("乗用車");
    expect(r.kind).toBe("term");
    expect(r.term?.hs).toBe("8703.23");
  });

  // 英語は原簿にそのまま通る。実測で "motor car" は 20 件。
  it("英語はそのまま通す", () => {
    expect(classifyInput("motor car").kind).toBe("english");
  });

  // ここで機械翻訳に逃げない。何も出ないほうが、違う品目を見せるよりましである。
  it("辞書にない日本語は unknown", () => {
    expect(classifyInput("宇宙船").kind).toBe("unknown");
    expect(classifyInput("   ").kind).toBe("unknown");
  });
});

describe("normalizeQuery", () => {
  // キャッシュキーになる。表記ゆれで別物として貯めると、無駄に外を呼ぶ。
  it("コードは数字だけにする", () => {
    expect(normalizeQuery("8703.23")).toBe("870323");
    expect(normalizeQuery(" 8703 . 23 ")).toBe("870323");
  });

  it("英語は小文字にして空白を詰める", () => {
    expect(normalizeQuery("  Motor   Car ")).toBe("motor car");
  });
});

describe("toOriginRow", () => {
  it("合計と内訳を百分率にして返す", () => {
    const r = toOriginRow("JP", "日本", JP_CAR);
    expect(r.status).toBe("ok");
    expect(r.totalPct).toBe(12.5);
    expect(r.breakdown).toEqual([
      { label: "上限補正", pct: 10 },
      { label: "MFN", pct: 2.5 },
    ]);
  });

  // 取れなかったことと、関税が無いことは別である。ここを 0 にすると嘘になる。
  it("行が無ければ unavailable。0% にしない", () => {
    const r = toOriginRow("VN", "ベトナム", null);
    expect(r.status).toBe("unavailable");
    expect(r.totalPct).toBeNull();
  });

  // 原簿の 19,831 行のうち 2,198 行が従量税。この道は必ず踏まれる。
  it("従量税(合計 null)は non_ad_valorem", () => {
    const r = toOriginRow("JP", "日本", { ...JP_CAR, duty_rate_total: null });
    expect(r.status).toBe("non_ad_valorem");
    expect(r.totalPct).toBeNull();
  });

  // LandedIQ は「根拠未確認の除外」を全額課税+警告として返す。
  // 数字だけ取り出して警告を捨てると、相手が 3 値で作ったものを 1 値の嘘に変えてしまう。
  it("未確認の除外は警告として持ち上げる", () => {
    const r = toOriginRow("CN", "中国", { ...JP_CAR, exclusion_status: "unverified" });
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("原簿側の warnings と unresolved も落とさない", () => {
    const r = toOriginRow("CN", "中国", {
      ...JP_CAR,
      warnings: ["リスト判定が未解決"],
      unresolved: ["301-china-list4a"],
    });
    expect(r.warnings).toContain("リスト判定が未解決");
    expect(r.warnings.some((w) => w.includes("301-china-list4a"))).toBe(true);
  });
});

describe("totalMatchesPrograms", () => {
  // 上限補正(top_up_to_total)の rate には「差額」がすでに入っている。
  // だから合計は単純な足し算で合う。実測: MFN 2.5 + 上限補正 10.0 = 12.5。
  // ここが崩れたら、原簿側で意味が変わったということ。
  it("合計は各プログラムの単純合計に一致する", () => {
    expect(totalMatchesPrograms(JP_CAR)).toBe(true);
  });

  it("合わなければ false", () => {
    expect(totalMatchesPrograms({ ...JP_CAR, duty_rate_total: 0.2 })).toBe(false);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

```
npm test -- tariff.test
```
기대: `Cannot find module '../tariff'` 로 FAIL.

- [ ] **Step 3: 최소 구현**

`src/lib/api/tariff.ts`:

```ts
/**
 * 原産地別 対米関税比較 —— 型と純粋な変換。
 *
 * LandedIQ のエッジ関数 hts-lookup の応答の形を知っているのは、この
 * ファイルだけである。相手の API が変わったときに直す場所を 1 か所に
 * 保つため、ここから外へ生の形を漏らさない。
 */
import { lookupHs, type HsTerm } from "./hs-dictionary";

// ── LandedIQ の応答 ────────────────────────────────────────────

export type LandedIqProgram = {
  code: string;
  name: string;
  authority: string;
  /** 加算分。上限補正の場合は「差額」がすでに入っている。 */
  rate: number;
  rate_type: "additive" | "top_up_to_total";
  exclusion: "none" | "confirmed" | "unverified";
};

export type LandedIqLine = {
  code: string;
  description: string;
  leaf: string | null;
  base_mfn: number | null;
  programs: LandedIqProgram[];
  /** 従量税・複合税の行は null で返る(原簿 19,831 行のうち 2,198 行)。 */
  duty_rate_total: number | null;
  unresolved: string[];
  exclusion_status: "none" | "confirmed" | "unverified";
  warnings: string[];
};

export type LandedIqResponse = {
  as_of: string;
  query: string;
  results: LandedIqLine[];
  truncated?: boolean;
};

// ── 画面に出す形 ───────────────────────────────────────────────

export type OriginRow = {
  origin: string;
  labelJa: string;
  /**
   * ok             税率が出た
   * unavailable    取れなかった(相手が落ちている・制限に掛かった)
   * non_ad_valorem 従量税なので比べられない
   *
   * unavailable を 0% として描いてはいけない。「関税が無い」と
   * 「取れなかった」は別のことである。
   */
  status: "ok" | "unavailable" | "non_ad_valorem";
  totalPct: number | null;
  breakdown: { label: string; pct: number }[];
  warnings: string[];
};

/** 日本の製造業が実際に検討する移転先。 */
export const DEFAULT_ORIGINS = [
  { code: "JP", ja: "日本" },
  { code: "CN", ja: "中国" },
  { code: "VN", ja: "ベトナム" },
  { code: "TH", ja: "タイ" },
  { code: "MX", ja: "メキシコ" },
  { code: "KR", ja: "韓国" },
];

/**
 * 原産地 1 つが LandedIQ 呼び出し 1 回になる。相手は IP 当たり毎分 30 回
 * なので、上限が無いと一人で使い切ってしまう。
 */
export const MAX_ORIGINS = 8;

// ── 入力の判別 ─────────────────────────────────────────────────

export type InputKind = {
  kind: "code" | "term" | "english" | "unknown";
  q: string;
  term?: HsTerm;
};

const CODE_SHAPE = /^[\d.\s-]+$/;
const ASCII_ONLY = /^[ -~]+$/;

/**
 * 数字4桁以上 → コード。辞書に当たれば → その HS。ASCII なら → 英語。
 * それ以外(未登録の日本語)は unknown にして、辞書のチップを出す。
 * 機械翻訳して当てにいかない。
 */
export function classifyInput(raw: string): InputKind {
  const q = raw.trim();
  if (!q) return { kind: "unknown", q: "" };
  if (CODE_SHAPE.test(q) && q.replace(/\D/g, "").length >= 4) return { kind: "code", q };
  const term = lookupHs(q);
  if (term) return { kind: "term", q, term };
  if (ASCII_ONLY.test(q)) return { kind: "english", q };
  return { kind: "unknown", q };
}

/** キャッシュキー用。表記ゆれで別物として貯めない。 */
export function normalizeQuery(raw: string): string {
  const q = raw.trim();
  if (CODE_SHAPE.test(q)) return q.replace(/\D/g, "");
  return q.toLowerCase().replace(/\s+/g, " ");
}

// ── 応答 → 行 ─────────────────────────────────────────────────

/** 原簿のコードを日本語にする。知らないものは相手の名前をそのまま出す。 */
const PROGRAM_JA: Record<string, string> = {
  mfn: "MFN",
  "301-forced-labor-topup": "上限補正",
  "301-forced-labor": "強制労働301",
  "301-china-list1": "301リスト1",
  "301-china-list2": "301リスト2",
  "301-china-list3": "301リスト3",
  "301-china-list4a": "301リスト4A",
};

const pct1 = (r: number) => Math.round(r * 1000) / 10;

export function toOriginRow(
  origin: string,
  labelJa: string,
  line: LandedIqLine | null,
): OriginRow {
  if (!line) {
    return { origin, labelJa, status: "unavailable", totalPct: null, breakdown: [], warnings: [] };
  }

  const warnings = [
    ...(line.warnings ?? []),
    ...(line.unresolved ?? []).map((u) => `未確定: ${u}`),
    ...(line.exclusion_status === "unverified"
      ? ["除外の根拠が未確認のため、全額を課税として表示している"]
      : []),
  ];

  if (line.duty_rate_total == null) {
    return { origin, labelJa, status: "non_ad_valorem", totalPct: null, breakdown: [], warnings };
  }

  return {
    origin,
    labelJa,
    status: "ok",
    totalPct: pct1(line.duty_rate_total),
    breakdown: [...line.programs]
      .sort((a, b) => b.rate - a.rate)
      .map((p) => ({ label: PROGRAM_JA[p.code] ?? p.name, pct: pct1(p.rate) })),
    warnings,
  };
}

/**
 * 合計は各プログラムの単純合計に一致する。上限補正の rate には差額が
 * 入っているので、特別扱いは要らない(実測: MFN 2.5 + 上限補正 10.0 = 12.5)。
 * ここが崩れたら原簿側で意味が変わったということなので、契約テストで見張る。
 */
export function totalMatchesPrograms(line: LandedIqLine): boolean {
  if (line.duty_rate_total == null) return true;
  const sum = line.programs.reduce((s, p) => s + p.rate, 0);
  return Math.abs(sum - line.duty_rate_total) < 1e-6;
}
```

- [ ] **Step 4: 통과를 확인한다**

```
npm test -- tariff.test
```
기대: 13 tests PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/api/tariff.ts src/lib/api/__tests__/tariff.test.ts
git commit -m "feat(tariff): LandedIQ 응답을 표의 한 행으로 바꾸는 순수 로직

외부 계약을 아는 코드는 이 파일 하나로 가둔다.
못 받아온 것을 0% 로 메우지 않고, 상대의 경고를 삼키지 않는다."
```

---

## Task 3: 캐시 테이블과 서버 함수

LandedIQ 를 실제로 부른다. 캐시가 먼저 필요하다 — 원산지 6개 × 조회 5건이면 1분 만에 상대의 제한에 걸린다.

**Files:**
- Create: `c:/Users/DELL/Documents/logisight/supabase/migrations/20260812000004_jp_tariff_cache.sql`
- Create: `src/lib/api/tariff.functions.ts`
- Modify: `src/lib/api/tariff.ts` (queryOptions 래퍼 추가)

**Interfaces:**
- Consumes: `classifyInput`, `normalizeQuery`, `toOriginRow`, `DEFAULT_ORIGINS`, `MAX_ORIGINS`, `LandedIqResponse` (Task 2)
- Produces:
  - `export const getTariffCandidates` — `{ data: { q: string } }` → `Promise<{ asOf: string; lines: { code: string; leaf: string; description: string }[] }>`
  - `export const getOriginComparison` — `{ data: { code: string; origins?: string[] } }` → `Promise<{ asOf: string; code: string; description: string; rows: OriginRow[] }>`

- [ ] **Step 1: 마이그레이션을 쓴다**

`c:/Users/DELL/Documents/logisight/supabase/migrations/20260812000004_jp_tariff_cache.sql`:

```sql
-- 対米関税の照会結果を貯める。
--
-- LandedIQ のエッジ関数は IP 当たり毎分 30 回までで、サーバから呼ぶと
-- サイト全体が 1 つの IP に見える。原産地 6 か国 × 照会 5 件で 1 分の枠を
-- 使い切るため、ここは性能のための工夫ではなく**動く条件**である。
--
-- 期限切れの行も消さない。相手が止まっても、最後に取れた値を時点付きで
-- 見せ続けられるようにするためである。「一緒に止まる」を「代わりに古くなる」
-- に変える。
create table if not exists public.jp_tariff_cache (
  q_norm     text        not null,
  origin     text        not null,
  as_of      date        not null,
  payload    jsonb       not null,
  fetched_at timestamptz not null default now(),
  primary key (q_norm, origin, as_of)
);

comment on table public.jp_tariff_cache is
  '対米関税照会のキャッシュ。期限切れも消さない(相手停止時の代替表示に使う)。';

-- 読み書きはサーバの service role からのみ。匿名クライアントには触らせない。
-- ポリシーを 1 つも置かないことで、それを表現する。
alter table public.jp_tariff_cache enable row level security;
```

- [ ] **Step 2: 마이그레이션을 적용한다**

Supabase SQL Editor 에 위 내용을 붙여 실행한다. 그다음 확인:

```sql
select count(*) from public.jp_tariff_cache;
```
기대: `0` (테이블이 생겼고 비어 있음).

- [ ] **Step 3: 환경변수를 넣는다**

`.env` (로컬) 와 Vercel 프로젝트 설정에 추가한다. `VITE_` 접두를 **붙이지 않는다** — 브라우저에 나가면 안 된다.

```
LANDEDIQ_SUPABASE_URL=https://<landediq-project>.supabase.co
LANDEDIQ_ANON_KEY=<landediq anon key>
```

값은 `c:/Users/DELL/Documents/LandedIQ/.env` 의 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 와 같다.

- [ ] **Step 4: 서버 함수를 쓴다**

`src/lib/api/tariff.functions.ts`:

```ts
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PUBLIC_SWR_CACHE } from "@/lib/cache-control";
import {
  DEFAULT_ORIGINS,
  MAX_ORIGINS,
  classifyInput,
  normalizeQuery,
  toOriginRow,
  type LandedIqLine,
  type LandedIqResponse,
  type OriginRow,
} from "./tariff";

// jp_tariff_cache は生成済み Database 型にまだ無い → レポ慣例どおりキャストする。
const sb = supabaseAdmin as unknown as SupabaseClient;

const TTL_MS = 24 * 60 * 60 * 1000;

const today = () => new Date().toISOString().slice(0, 10);

/**
 * 相手を 1 回だけ呼ぶ。落ちても投げない —— 1 か国が取れなくても、
 * 残りの国は見せたい。呼び出し側が null を「取れなかった」として扱う。
 */
async function callLandedIq(q: string, origin: string, asOf: string): Promise<LandedIqResponse | null> {
  const url = process.env.LANDEDIQ_SUPABASE_URL;
  const key = process.env.LANDEDIQ_ANON_KEY;
  if (!url || !key) return null;
  try {
    const r = await fetch(`${url}/functions/v1/hts-lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ q, origin, asOf }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null; // 429 もここに落ちる。古いキャッシュで凌ぐ。
    return (await r.json()) as LandedIqResponse;
  } catch {
    return null;
  }
}

/**
 * キャッシュ → 無ければ相手。期限切れでも、相手が取れなければそれを使う。
 * 戻り値の stale は画面の時点表示に使う。
 */
async function lookup(
  qNorm: string,
  q: string,
  origin: string,
  asOf: string,
): Promise<{ res: LandedIqResponse | null; fetchedAt: string | null }> {
  const { data: hit } = await sb
    .from("jp_tariff_cache")
    .select("payload,fetched_at")
    .eq("q_norm", qNorm)
    .eq("origin", origin)
    .eq("as_of", asOf)
    .maybeSingle();

  const fresh = hit && Date.now() - new Date(hit.fetched_at as string).getTime() < TTL_MS;
  if (fresh) return { res: hit!.payload as LandedIqResponse, fetchedAt: hit!.fetched_at as string };

  const res = await callLandedIq(q, origin, asOf);
  if (!res) {
    // 相手が駄目でも、古い値があるなら見せる。時点は正直に出す。
    if (hit) return { res: hit.payload as LandedIqResponse, fetchedAt: hit.fetched_at as string };
    return { res: null, fetchedAt: null };
  }

  const now = new Date().toISOString();
  await sb
    .from("jp_tariff_cache")
    .upsert(
      { q_norm: qNorm, origin, as_of: asOf, payload: res, fetched_at: now },
      { onConflict: "q_norm,origin,as_of" },
    );
  return { res, fetchedAt: now };
}

/**
 * 候補行を返す。10 桁のコードなら 1 行に決まるが、それ以外(頭・英語)は
 * 数行返るので、利用者に選んでもらう。勝手に先頭を使わない ——
 * 8703.23 の先頭は「Motor homes」(キャンピングカー)である。
 */
export const getTariffCandidates = createServerFn({ method: "GET" })
  .inputValidator(z.object({ q: z.string().min(1).max(120) }))
  .handler(async ({ data }): Promise<{ asOf: string; lines: { code: string; leaf: string; description: string }[] }> => {
    setResponseHeader("cache-control", PUBLIC_SWR_CACHE);

    const kind = classifyInput(data.q);
    if (kind.kind === "unknown") return { asOf: today(), lines: [] };

    // 辞書に当たったら、その HS の頭で照会する。
    const q = kind.kind === "term" ? kind.term!.hs : kind.q;
    const asOf = today();
    // 候補を出すだけなので、代表として 1 か国(日本)だけ引く。
    const { res } = await lookup(normalizeQuery(q), q, "JP", asOf);
    if (!res) return { asOf, lines: [] };

    return {
      asOf: res.as_of ?? asOf,
      lines: res.results.map((l) => ({
        code: l.code,
        leaf: l.leaf ?? "",
        description: l.description,
      })),
    };
  });

/** 10 桁のコード 1 つを、原産地ごとに引き比べる。 */
export const getOriginComparison = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      code: z.string().regex(/^\d{10}$/),
      origins: z.array(z.string().length(2)).max(MAX_ORIGINS).optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ asOf: string; code: string; description: string; rows: OriginRow[] }> => {
    setResponseHeader("cache-control", PUBLIC_SWR_CACHE);

    const asOf = today();
    const qNorm = normalizeQuery(data.code);
    const wanted = data.origins?.length
      ? DEFAULT_ORIGINS.filter((o) => data.origins!.includes(o.code))
      : DEFAULT_ORIGINS;

    const settled = await Promise.all(
      wanted.map(async (o) => {
        const { res } = await lookup(qNorm, data.code, o.code, asOf);
        const line: LandedIqLine | null = res?.results?.[0] ?? null;
        return { o, line };
      }),
    );

    const first = settled.find((s) => s.line)?.line ?? null;
    const rows = settled
      .map(({ o, line }) => toOriginRow(o.code, o.ja, line))
      // 低い順。「どこから出せば安いか」が読む順序である。
      .sort((a, b) => (a.totalPct ?? Number.POSITIVE_INFINITY) - (b.totalPct ?? Number.POSITIVE_INFINITY));

    return { asOf, code: data.code, description: first?.description ?? "", rows };
  });
```

- [ ] **Step 5: `tariff.ts` 에 queryOptions 를 더한다**

`src/lib/api/tariff.ts` 맨 아래에 붙인다:

```ts
// ── React Query の入口 ────────────────────────────────────────
import { queryOptions } from "@tanstack/react-query";

import { getOriginComparison, getTariffCandidates } from "./tariff.functions";

export const tariffCandidatesQueryOptions = (q: string) =>
  queryOptions({
    queryKey: ["tariff", "candidates", q],
    queryFn: () => getTariffCandidates({ data: { q } }),
    staleTime: 60 * 60 * 1000,
    enabled: q.trim().length > 0,
  });

export const originComparisonQueryOptions = (code: string, origins?: string[]) =>
  queryOptions({
    queryKey: ["tariff", "compare", code, origins ?? []],
    queryFn: () => getOriginComparison({ data: { code, origins } }),
    staleTime: 60 * 60 * 1000,
    enabled: /^\d{10}$/.test(code),
  });
```

- [ ] **Step 6: 손으로 한 번 돌려 확인한다**

```
npm run dev
```
다른 터미널에서:

```bash
curl -s 'http://localhost:3000/_serverFn/getOriginComparison?payload=%7B%22data%22%3A%7B%22code%22%3A%228703230110%22%7D%7D' | head -c 400
```

기대: `rows` 6개, `メキシコ 2.5` 가 첫 행, `中国 40` 이 마지막 행.

경로가 다르면 브라우저 개발자도구 Network 탭에서 서버 함수 URL 을 확인해 맞춘다.

- [ ] **Step 7: 캐시가 먹는지 확인한다**

같은 요청을 두 번 보낸 뒤:

```sql
select q_norm, origin, as_of, fetched_at from public.jp_tariff_cache order by fetched_at desc limit 10;
```

기대: 6행(원산지별 1행). 두 번째 요청은 `fetched_at` 이 갱신되지 않는다.

- [ ] **Step 8: 커밋**

```bash
git add src/lib/api/tariff.functions.ts src/lib/api/tariff.ts
git commit -m "feat(tariff): 원산지별 조회 서버 함수와 24시간 캐시

상대는 IP당 분당 30회다. 서버에서 부르면 사이트 전체가 IP 하나로
보이므로 캐시는 최적화가 아니라 동작 조건이다.
기한이 지난 행도 지우지 않는다 — 상대가 멈춰도 시점을 달고 보여준다."
```

---

## Task 4: 화면

**Files:**
- Create: `src/components/tariff/OriginTable.tsx`
- Create: `src/components/tariff/TariffSearch.tsx`
- Create: `src/components/tariff/JpTariff.tsx`
- Create: `src/routes/tariff.tsx`

**Interfaces:**
- Consumes: `OriginRow`, `HS_TERMS`, `tariffCandidatesQueryOptions`, `originComparisonQueryOptions`
- Produces: `/tariff` 라우트. `?code=<10자리>` 로 링크 공유 가능.

- [ ] **Step 1: 표 컴포넌트**

`src/components/tariff/OriginTable.tsx`:

```tsx
import type { OriginRow } from "@/lib/api/tariff";

/** 取れなかった行を 0% と区別して描く。ここを崩すと数字が嘘になる。 */
function Cell({ row }: { row: OriginRow }) {
  if (row.status === "ok") return <span className="font-bold tabular-nums">{row.totalPct}%</span>;
  if (row.status === "non_ad_valorem")
    return <span className="text-xs text-slate-500">従量税のため比較できない</span>;
  return <span className="text-xs text-slate-500">取得できず</span>;
}

export function OriginTable({ rows, asOf }: { rows: OriginRow[]; asOf: string }) {
  const ok = rows.filter((r) => r.status === "ok" && r.totalPct !== null);
  const lo = ok[0];
  const hi = ok[ok.length - 1];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-4 font-semibold">原産地</th>
            <th className="py-2 pr-4 text-right font-semibold">関税</th>
            <th className="py-2 font-semibold">内訳</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.origin} className="border-b border-slate-100 align-top">
              <td className="py-2.5 pr-4 whitespace-nowrap">{r.labelJa}</td>
              <td className="py-2.5 pr-4 text-right">
                <Cell row={r} />
              </td>
              <td className="py-2.5 text-xs text-slate-600">
                {r.breakdown.map((b) => `${b.label} ${b.pct}`).join(" + ")}
                {r.warnings.map((w) => (
                  <div key={w} className="mt-1 text-amber-700">
                    ⚠ {w}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {lo && hi && lo.origin !== hi.origin && (
        <p className="mt-3 text-sm text-slate-700">
          {hi.labelJa} → {lo.labelJa} との差{" "}
          <b className="tabular-nums">
            −{Math.round((hi.totalPct! - lo.totalPct!) * 10) / 10}pt
          </b>
        </p>
      )}

      <p className="mt-2 text-xs text-slate-500">※ 原資料 {asOf} 時点。見積ではない。</p>
    </div>
  );
}
```

- [ ] **Step 2: 검색 컴포넌트**

`src/components/tariff/TariffSearch.tsx`:

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { HS_TERMS } from "@/lib/api/hs-dictionary";
import { tariffCandidatesQueryOptions } from "@/lib/api/tariff";

/**
 * チップは予備ではなく主な入り口である。原簿の説明文は英語なので
 * 「乗用車」と打っても当たらない。多くの利用者は打たずに押す。
 */
export function TariffSearch({ onPick }: { onPick: (code: string) => void }) {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { data, isFetching } = useQuery(tariffCandidatesQueryOptions(submitted));

  const lines = data?.lines ?? [];
  const searched = submitted.length > 0 && !isFetching;

  return (
    <div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="8703.23 または 乗用車"
          className="min-w-[220px] flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
        >
          調べる
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {HS_TERMS.map((t) => (
          <button
            key={t.ja}
            type="button"
            onClick={() => {
              setInput(t.ja);
              setSubmitted(t.ja);
            }}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
          >
            {t.ja}
          </button>
        ))}
      </div>

      {searched && lines.length === 0 && (
        <p className="mt-4 text-sm text-slate-600">
          該当する品目が見つかりません。上の品目名から選ぶか、HTS コードを入力してください。
        </p>
      )}

      {lines.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 border-y border-slate-200">
          {lines.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                onClick={() => onPick(l.code)}
                className="w-full py-2.5 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-mono text-xs text-slate-500">{l.code}</span>{" "}
                <span className="font-semibold">{l.leaf}</span>
                <span className="ml-1 text-xs text-slate-500">
                  {l.description.slice(-90)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 페이지 껍데기**

`src/components/tariff/JpTariff.tsx`:

```tsx
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { OriginTable } from "./OriginTable";
import { TariffSearch } from "./TariffSearch";
import { originComparisonQueryOptions } from "@/lib/api/tariff";

export function JpTariff({ code }: { code: string }) {
  const navigate = useNavigate();
  const { data } = useQuery(originComparisonQueryOptions(code));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold text-slate-900">原産地別 対米関税比較</h1>
      <p className="mt-1 text-sm text-slate-600">同じ品目を、どこから出すか。</p>

      <div className="mt-6">
        <TariffSearch
          onPick={(picked) => navigate({ to: "/tariff", search: { code: picked } })}
        />
      </div>

      {data && data.rows.length > 0 && (
        <section className="mt-8">
          <h2 className="font-mono text-sm text-slate-500">{data.code}</h2>
          <p className="mb-3 text-sm text-slate-700">{data.description.slice(-140)}</p>
          <OriginTable rows={data.rows} asOf={data.asOf} />
        </section>
      )}

      {/*
        運賃は原産地別に持っていない。SPPI は「日本が支払う」運賃なので、
        ベトナム発の運賃は分からない。埋められない列を作ると、そこを
        推測で埋めることになる。だから表には入れず、文脈として 1 行だけ置く。
      */}
      <p className="mt-8 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-600">
        参考 — 日本発の海上運賃は円ベースで前年比 +52.8%(契約通貨ベース +37.4%)。
        原産地を変えれば運賃も変わるが、本表は関税のみを比べている。
      </p>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        本表は推計であり、通関・法務・税務の助言ではない。
        従量税・複合税、アンチダンピング税、数量割当、および未確認の除外は含まない。
        最終的な品目分類と納税義務は輸入者(Importer of Record)に帰属する。
        関税率は LandedIQ が維持する原簿にもとづく。
      </p>
    </div>
  );
}
```

- [ ] **Step 4: 라우트**

`src/routes/tariff.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { JpTariff } from "@/components/tariff/JpTariff";
import { seoHead } from "@/lib/seo";

const tariffSearchSchema = z.object({
  /** 10 桁の HTS コード。リンクで共有できるように search に置く。 */
  code: z.string().regex(/^\d{10}$/).optional().catch(undefined),
});

export const Route = createFileRoute("/tariff")({
  validateSearch: tariffSearchSchema,
  head: () =>
    seoHead({
      title: "原産地別 対米関税比較 — Logisight",
      description:
        "同じ品目を日本・中国・ベトナム・タイ・メキシコ・韓国から米国に出したとき、関税がどれだけ違うかを並べて比べます。MFN・Section 301・上限補正の内訳つき。",
      path: "/tariff",
      koPath: "/tariff",
    }),
  component: TariffPage,
});

function TariffPage() {
  const { code } = Route.useSearch();
  return <JpTariff code={code ?? ""} />;
}
```

- [ ] **Step 5: 빌드와 눈으로 확인**

```
npm run build
npm run dev
```

브라우저에서 `http://localhost:3000/tariff` 를 연다. 확인할 것:

1. 칩 「乗用車」를 누르면 후보 7줄이 뜬다
2. 한 줄을 고르면 표가 그려지고, 주소창이 `?code=8703230110` 로 바뀐다
3. 표가 낮은 순 — メキシコ 2.5% 가 위, 中国 40% 가 아래
4. 「宇宙船」을 넣으면 「該当する品目が見つかりません」 이 뜬다
5. 화면에 한국어가 한 글자도 없다

- [ ] **Step 6: 커밋**

```bash
git add src/components/tariff src/routes/tariff.tsx
git commit -m "feat(tariff): 원산지별 대미 관세 비교 화면

칩이 주 입력 수단이다 — 원장 설명문이 영어라 일본어 타이핑은 안 통한다.
운임은 원산지별로 모르므로 칸을 만들지 않고 문맥 한 줄로만 둔다."
```

---

## Task 5: 계약·스냅샷 감시

세율은 **바뀌는 게 정상**이다. 그래서 「12.5% 인지」를 보는 테스트는 정책이 바뀔 때마다 헛되이 빨개진다. 형태·불변식·값을 나눠서 본다. 값이 바뀌면 **버그가 아니라 그달 리포트 소재**다.

**Files:**
- Create: `src/lib/api/__tests__/tariff.contract.test.ts`
- Create: `.github/workflows/tariff-snapshot.yml`

**Interfaces:**
- Consumes: `totalMatchesPrograms`, `LandedIqResponse` (Task 2)
- Produces: 없음 (감시 전용)

- [ ] **Step 1: 계약 테스트를 쓴다**

`src/lib/api/__tests__/tariff.contract.test.ts`:

```ts
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
  it("合計が各プログラムの合計に一致する", async () => {
    for (const origin of ["JP", "CN", "MX"]) {
      const j = await look("8703230110", origin);
      expect(totalMatchesPrograms(j.results[0])).toBe(true);
      expect(j.results[0].duty_rate_total!).toBeGreaterThanOrEqual(0);
      expect(j.results[0].duty_rate_total!).toBeLessThanOrEqual(1);
    }
  });

  // ③ 値のスナップショット。
  //
  // ここが落ちたら壊れたのではない。**米国の関税が動いた**ということである。
  // 人が確かめに来るように、わざと失敗にしてある。静かな通知は誰も見ない。
  // 確認したら下の表を書き換えて、その変化を月次レポートに書く。
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
  });
});
```

- [ ] **Step 2: 자격증명 없이 돌려 건너뛰는지 확인한다**

```
npm test
```
기대: 기존 테스트 전부 PASS, 계약 테스트는 skipped. **자격증명 없이도 초록이어야 한다.**

- [ ] **Step 3: 자격증명을 넣고 돌린다**

```bash
LANDEDIQ_SUPABASE_URL=... LANDEDIQ_ANON_KEY=... npm test -- tariff.contract
```
기대: 3 tests PASS.

- [ ] **Step 4: 감시 워크플로를 쓴다**

`.github/workflows/tariff-snapshot.yml`:

```yaml
name: 対米関税スナップショット

# 米国の関税が動いたかを週 1 回だけ見る。
#
# 落ちたら壊れたのではなく、税率が動いたということである。人が確かめに
# 来るように、わざと失敗にしてある。確かめたらスナップショットを書き換え、
# その変化を月次レポートに書く。CI の赤は「記事の種が出た」の合図である。

on:
  schedule:
    - cron: '0 0 * * 1' # 毎週月曜 09:00 JST
  workflow_dispatch:

concurrency:
  group: tariff-snapshot
  cancel-in-progress: false

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - name: 契約とスナップショット
        env:
          LANDEDIQ_SUPABASE_URL: ${{ secrets.LANDEDIQ_SUPABASE_URL }}
          LANDEDIQ_ANON_KEY: ${{ secrets.LANDEDIQ_ANON_KEY }}
        run: npm test -- tariff.contract
```

- [ ] **Step 5: GitHub Secrets 를 넣는다**

`logisight-jp` 저장소 → Settings → Secrets and variables → Actions 에서 추가한다:

- `LANDEDIQ_SUPABASE_URL`
- `LANDEDIQ_ANON_KEY`

넣은 뒤 Actions 탭에서 `対米関税スナップショット` 을 `Run workflow` 로 한 번 돌려 초록인지 본다.

- [ ] **Step 6: 커밋**

```bash
git add src/lib/api/__tests__/tariff.contract.test.ts .github/workflows/tariff-snapshot.yml
git commit -m "test(tariff): 형태·불변식·값을 나눠 감시한다

세율은 바뀌는 게 정상이라 값 검사만 하면 헛되이 빨개진다.
값이 바뀌면 일부러 실패시킨다 — 그건 버그가 아니라 그달 리포트 소재고,
조용한 알림은 아무도 안 본다."
```

---

## Self-Review

**1. 스펙 대응**

| 설계서 | 담당 |
|---|---|
| §3 이름·부제·표 모양 | Task 4 |
| §3 품목 사전 22개·칩·입력 순서 | Task 1, Task 4 |
| §3 후보 목록에서 고르기 | Task 3 (`getTariffCandidates`), Task 4 |
| §3 원산지 6개 고정 / 최대 8 | Task 2 (`DEFAULT_ORIGINS`, `MAX_ORIGINS`), Task 3 |
| §3 기준일 오늘만, 키엔 미리 넣기 | Task 3 (`as_of` 가 키에 있고 UI 없음) |
| §3 운임 문맥 한 줄 | Task 4 |
| §4 서버 호출·파일 분리 | Task 2, Task 3 |
| §5 두 겹 캐시·24시간·안 지움 | Task 3 |
| §6 실패 4종 | Task 2 (`toOriginRow`), Task 4 (`Cell`) |
| §6 경고 안 삼킴 | Task 2, Task 4 |
| §7 테스트 3층 | Task 5 |
| §8 법정 표시 | Task 4 |
| §10 완료 기준 | Task 3 Step 6–7, Task 4 Step 5, Task 5 Step 2–3 |

빠진 것 없음.

**2. 자리표시자** — 없음. 모든 단계에 실제 코드가 들어 있다.

**3. 타입 일관성** — `OriginRow`, `LandedIqLine`, `LandedIqResponse`, `HsTerm` 는 Task 2·1 에서 정의한 이름 그대로 Task 3·4·5 에서 쓴다. `lookup()` 은 `tariff.functions.ts` 안의 사설 함수이고, 사전 조회 함수 `lookupHs()` 와 이름이 겹치지 않는다.

**한 가지 미리 짚어둘 것** — Task 3 Step 6 의 `curl` 경로(`/_serverFn/...`)는 TanStack Start 버전에 따라 다르다. 맞지 않으면 브라우저 Network 탭에서 실제 URL 을 보고 맞춘다. 이 단계는 확인용이라 경로가 달라도 진행에 지장이 없다.
