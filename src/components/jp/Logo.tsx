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

/** ワードマーク。ヘッダー・フッターで共有する。 */
export function Logo({ size = 26, sub }: { size?: number; sub?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="inline-flex items-baseline gap-2">
        <span
          className="font-bold leading-none tracking-[-0.025em] text-[#0d2137]"
          style={{ fontSize: size * 0.85 }}
        >
          Logi<span className="text-[#1857b8]">sight</span>
        </span>
        {sub && <span className="text-[11px] text-[#8b94a0]">{sub}</span>}
      </span>
    </span>
  );
}
