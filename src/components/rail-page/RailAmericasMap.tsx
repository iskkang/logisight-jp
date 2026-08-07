// 미주 철도 코리도 지도 — 기존 /rail-map 페이지에서 이동(데이터/지도 로직 그대로 재사용).
// /rail/americas 라우트에서 사용. 허브 레이아웃(nav+탭바+footer) 안에 들어가도록 외곽 높이만 조정.
import { useSuspenseQuery } from "@tanstack/react-query";
import { LoginGate } from "@/components/jp/LoginGate";
import { useEffect, useMemo, useRef } from "react";
import type { Map as MapLibreMap, MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { railMapQueryOptions } from "@/lib/api/rail-map";
import type { RailCorridorsGeoJSON } from "@/lib/api/rail-map.functions";
import { STATUS_COLORS } from "@/lib/railMap";
import { GeoArticleSchema } from "@/components/geo/GeoArticleSchema";

function formatScore(score: number | null): string {
  return score == null ? "-" : String(score);
}

// 状態 enum 값(데이터)은 그대로 두고, 사용자 표시만 한국어로 매핑한다.
const STATUS_LABEL_KO: Record<string, string> = {
  normal: "正常",
  watch: "注意",
  delayed: "遅延",
  severe: "深刻",
  unknown: "不明",
};
const statusKo = (s: string): string => STATUS_LABEL_KO[s] ?? s;

/* ===================== GEO: Article 스키마용 기준일 계산 ===================== */
function buildAmericasGeo(geojson: RailCorridorsGeoJSON) {
  let latest: string | null = null;
  for (const f of geojson.features) {
    const updated = f.properties.updated_at;
    if (updated && (!latest || updated > latest)) latest = updated;
  }
  const refDate = latest ? latest.slice(0, 10) : null;
  return { refDate };
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  // ko-KR は時刻を「오전 10:30」と組む — 日本版の画面に韓国語が出る唯一の経路だった。
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function popupHtml(properties: MapGeoJSONFeature["properties"]): string {
  const score =
    properties.score === null || properties.score === undefined || properties.score === ""
      ? "-"
      : properties.score;
  const reason = properties.reason || "-";
  const updated = properties.updated_at || "-";
  return [
    `<strong>${properties.name}</strong>`,
    `鉄道会社: ${properties.railroad}`,
    `状態: ${statusKo(String(properties.status))}`,
    `スコア: ${score}`,
    `理由: ${reason}`,
    `更新: ${updated}`,
  ].join("<br/>");
}

export function RailAmericasMap() {
  const { data: geojson } = useSuspenseQuery(railMapQueryOptions());
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const summary = useMemo(() => {
    const counts = { normal: 0, watch: 0, delayed: 0, severe: 0, unknown: 0 };
    let latest: string | null = null;
    for (const feature of geojson.features) {
      counts[feature.properties.status] += 1;
      const updated = feature.properties.updated_at;
      if (updated && (!latest || updated > latest)) latest = updated;
    }
    return { counts, latest };
  }, [geojson]);

  const geo = useMemo(() => buildAmericasGeo(geojson), [geojson]);

  useEffect(() => {
    let disposed = false;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;
      const maplibregl = await import("maplibre-gl");
      if (disposed || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        center: [-101, 43.5],
        zoom: 3.1,
        attributionControl: false,
        // 페이지 세로 스크롤이 지도에 흡수되지 않도록 협조적 제스처 사용.
        // 데스크톱은 ⌘/Ctrl+스크롤, 모바일은 두 손가락일 때만 지도를 조작한다.
        cooperativeGestures: true,
        locale: {
          "CooperativeGesturesHandler.WindowsHelpText": "Ctrl + スクロールで地図を拡大・縮小します",
          "CooperativeGesturesHandler.MacHelpText": "⌘ + スクロールで地図を拡大・縮小します",
          "CooperativeGesturesHandler.MobileHelpText": "2本指で地図を動かします",
        },
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

      map.on("load", () => {
        map.addSource("rail", { type: "geojson", data: geojson });
        map.addLayer({
          id: "rail-lines",
          type: "line",
          source: "rail",
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-width": ["interpolate", ["linear"], ["zoom"], 3, 3, 7, 7],
            "line-color": [
              "match",
              ["get", "status"],
              "normal",
              STATUS_COLORS.normal,
              "watch",
              STATUS_COLORS.watch,
              "delayed",
              STATUS_COLORS.delayed,
              "severe",
              STATUS_COLORS.severe,
              "unknown",
              STATUS_COLORS.unknown,
              STATUS_COLORS.unknown,
            ],
            "line-opacity": 0.9,
          },
        });

        map.on(
          "click",
          "rail-lines",
          (event: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
            const feature = event.features?.[0];
            if (!feature) return;
            new maplibregl.Popup({ closeButton: true, maxWidth: "320px" })
              .setLngLat(event.lngLat)
              .setHTML(popupHtml(feature.properties))
              .addTo(map);
          },
        );

        map.on("mouseenter", "rail-lines", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "rail-lines", () => {
          map.getCanvas().style.cursor = "";
        });
      });
    }

    initMap();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [geojson]);

  return (
    <main className="bg-[#f3f6fa] text-[#1a2433]">
      {/* GEO: 보이지 않는 Article JSON-LD만 유지 (시각 요소 없음) */}
      <GeoArticleSchema
        article={{
          headline: "北米インターモーダル鉄道回廊の状態",
          description:
            "北米インターモーダル鉄道回廊の状態地図(正常・注意・遅延)と、回廊ごとの状態・スコア・更新時刻。",
          path: "/rail/americas",
          datePublished: geo.refDate,
          dateModified: geo.refDate,
        }}
      />

      <div className="grid min-h-[78vh] grid-cols-[320px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] max-[900px]:grid-cols-1 max-[900px]:grid-rows-[auto_70vh_auto]">
        <aside className="border-r border-[#d8dfe9] bg-white px-5 py-5 max-[900px]:border-b max-[900px]:border-r-0">
          <div className="mb-5">
            <div className="text-[12px] font-semibold uppercase text-[#667085]">
              鉄道リスクマップ
            </div>
            <h1 className="mt-1 text-[22px] font-bold leading-tight text-[#101828]">
              北米インターモーダル鉄道回廊
            </h1>
            <p className="mt-2 text-[13px] leading-[1.55] text-[#54606f]">
              船社アドバイザリーとニュースの監視にもとづく。緑=出典を確認し、報告された支障なし。灰=公開情報が限られる。
            </p>
          </div>

          <div className="rounded-lg border border-[#d8dfe9] bg-[#f8fafc] p-4">
            <div className="text-[13px] font-bold text-[#1a2433]">状態の要約</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
              {Object.entries(summary.counts).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-md border border-[#e4e9f1] bg-white px-3 py-2"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
                      }}
                    />
                    {statusKo(status)}
                  </span>
                  <span className="font-semibold tabular-nums">{count}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-[#e4e9f1] pt-3 text-[12px] text-[#667085]">
              最終更新:{" "}
              <span className="font-medium text-[#344054]">{formatDate(summary.latest)}</span>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-[#d8dfe9] bg-white p-4">
            <div className="text-[13px] font-bold text-[#1a2433]">深刻・遅延の回廊</div>
            <div className="mt-2 text-[13px] text-[#667085]">
              監視中の区間に深刻・遅延の回廊はない。
            </div>
          </div>
        </aside>

        <section className="relative min-h-0">
          <div
            ref={containerRef}
            className="h-full min-h-[520px] w-full"
            data-testid="rail-map-canvas"
          />
          <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-[#d8dfe9] bg-white/92 px-3 py-2 text-[12px] font-semibold text-[#344054] shadow-sm">
            回廊 {geojson.features.length} 本 / 正常=緑、情報が限られる=灰
          </div>
        </section>

        <section className="col-span-2 border-t border-[#d8dfe9] bg-white px-5 py-4 max-[900px]:col-span-1">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-bold text-[#1a2433]">回廊の状況</h2>
            <div className="text-[12px] text-[#667085]" data-testid="rail-map-line-count">
              {geojson.features.length} 本
            </div>
          </div>
          <LoginGate
            title="回廊ごとの状態はログインするとご覧いただけます"
            note="登録は無料です。鉄道会社別のスコアと判定理由まで確認できます。"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#d8dfe9] text-[12px] uppercase text-[#667085]">
                    <th className="py-2 pr-4 font-semibold">回廊</th>
                    <th className="py-2 pr-4 font-semibold">鉄道会社</th>
                    <th className="py-2 pr-4 font-semibold">状態</th>
                    <th className="py-2 pr-4 font-semibold">スコア</th>
                    <th className="py-2 pr-4 font-semibold">理由</th>
                    <th className="py-2 font-semibold">更新</th>
                  </tr>
                </thead>
                <tbody>
                  {geojson.features.map((feature) => (
                    <tr
                      key={feature.properties.corridor_code}
                      className="border-b border-[#eef2f7] last:border-0"
                    >
                      <td className="py-2.5 pr-4 font-medium text-[#1a2433]">
                        {feature.properties.name}
                      </td>
                      <td className="py-2.5 pr-4 text-[#344054]">{feature.properties.railroad}</td>
                      <td className="py-2.5 pr-4">
                        <span className="inline-flex items-center gap-2 rounded-md border border-[#d8dfe9] bg-[#f8fafc] px-2 py-1 text-[12px] font-semibold capitalize text-[#344054]">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: STATUS_COLORS[feature.properties.status] }}
                          />
                          {statusKo(feature.properties.status)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-[#344054]">
                        {formatScore(feature.properties.score)}
                      </td>
                      <td className="py-2.5 pr-4 text-[#54606f]">
                        {feature.properties.reason || "-"}
                      </td>
                      <td className="py-2.5 text-[#54606f]">
                        {formatDate(feature.properties.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </LoginGate>
        </section>
      </div>
    </main>
  );
}
