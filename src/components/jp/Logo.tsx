/**
 * ロゴマーク。
 *
 * Logisight = logistics + sight。「見る」を絞り(アパーチャ)で表し、
 * 中の短い横棒3本で指標(データ)を示す。文字だけだと媒体の顔にならない。
 * 色は韓国版のティールとも参考 LP のオレンジとも変え、紺 → 藍のグラデーションにする。
 * 16px まで潰れないよう、線は 2px 以上・要素は3つまでに抑えている。
 */
export function LogoMark({ size = 26 }: { size?: number }) {
  const id = "lsg-mark";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Logisight"
      className="flex-none"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#123963" />
          <stop offset="1" stopColor="#1857b8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7.5" fill={`url(#${id})`} />
      {/* 絞り(sight) */}
      <circle cx="16" cy="16" r="8.4" stroke="#fff" strokeOpacity="0.42" strokeWidth="2" />
      {/* 指標 — 右肩上がりの3本 */}
      <rect x="11.6" y="17.4" width="2.6" height="4.4" rx="1.3" fill="#fff" />
      <rect x="14.9" y="14.4" width="2.6" height="7.4" rx="1.3" fill="#fff" />
      <rect x="18.2" y="10.9" width="2.6" height="10.9" rx="1.3" fill="#7cc0ff" />
    </svg>
  );
}

/**
 * ワードマーク。ヘッダー・フッターで共有する。
 *
 * カタカナを上、英字を下に積む — 日本の業界ブランドで見慣れた形にする。
 * 英字は字間を広げてカタカナの幅に合わせる。幅が揃わないと積んだ意味がなく、
 * 上下がばらけて見える。
 *
 * 英字側だけ二色を残す。ロゴを縦組みにしても Logi / sight の切れ目が
 * 分かるようにしておきたい。
 */
export function Logo({ size = 26, sub }: { size?: number; sub?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="inline-flex flex-col justify-center leading-none">
        <span
          className="font-bold tracking-[-0.03em] text-[#0d2137]"
          style={{ fontSize: size * 0.62 }}
        >
          ロジサイト
        </span>
        {/* letter-spacing は最後の一文字の後ろにも入る。そのぶんを負のマージンで
            戻さないと、英字の塊が右にずれてカタカナと頭が揃わない。 */}
        <span
          className="mt-[0.18em] font-bold text-[#0d2137]"
          style={{ fontSize: size * 0.33, letterSpacing: "0.30em", marginRight: "-0.30em" }}
        >
          LOGI<span className="text-[#1857b8]">SIGHT</span>
        </span>
      </span>
      {sub && <span className="self-end text-[11px] text-[#8b94a0]">{sub}</span>}
    </span>
  );
}
