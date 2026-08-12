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
 * 完全一致のみ。前方一致・部分一致は採らない —— 「自動車」で「自動車部品」
 * (HS 8708.29、部品の税率)に化けると、違う品目の正しい税率を見せることになる。
 * それは何も出ないより悪い(§9.5)。入力はチップ経由が主(§3)で、タイピングの
 * 途中経過を拾う必要は無いので、前方一致を残す理由も無い。当たらなければ
 * unknown に落として、呼び出し側(classifyInput)がチップ一覧を出す。
 */
export function lookupHs(input: string): HsTerm | null {
  const q = input.trim();
  if (!q) return null;
  return HS_TERMS.find((t) => t.ja === q) ?? null;
}
