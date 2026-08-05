import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

// site_views는 생성된 Database 타입에 아직 없다(climate.functions.ts와 같은 상황).
// 캐스팅하지 않으면 테이블명이 never로 좁혀진다.
const sb = supabase as unknown as SupabaseClient;

/**
 * 열람 기록.
 *
 * 무료 기간이 끝날 때 "누구에게 결제를 요청할지"를 판단하려면, 누가 리포트를
 * 몇 번 열었는지가 있어야 한다. GA4 무료판은 사용자 단위로 그걸 꺼내기 어렵다.
 * 로그인과 DB가 이미 있으니 직접 남긴다.
 *
 * 남기는 것은 경로와 누구인지까지다. IP·UA는 남기지 않는다.
 */

const ANON_KEY = "lsg_anon";

/** 브라우저 단위 임의 식별자. 개인을 특정하지 않는다. */
function anonId(): string {
  try {
    let v = localStorage.getItem(ANON_KEY);
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, v);
    }
    return v;
  } catch {
    // 시크릿 모드 등 저장소가 막힌 경우. 세션마다 새 값이 되지만 기록은 남는다.
    return "no-storage";
  }
}

/**
 * 같은 경로를 연속으로 다시 그릴 때 중복 기록을 막는다.
 * TanStack Router는 search만 바뀌어도 location이 갱신되고, StrictMode는
 * effect를 두 번 돌린다 — 그대로 두면 열람 수가 부풀려진다.
 */
let lastPath: string | null = null;

async function record(path: string) {
  if (path === lastPath) return;
  lastPath = path;
  try {
    const { data } = await supabase.auth.getSession();
    await sb.from("site_views").insert({
      site: "jp",
      path,
      user_id: data.session?.user.id ?? null,
      anon_id: anonId(),
      // 같은 사이트 안의 이동은 유입 경로가 아니다.
      referrer: document.referrer && !document.referrer.startsWith(location.origin)
        ? document.referrer.slice(0, 500)
        : null,
    });
  } catch {
    // 기록 실패가 화면을 막아서는 안 된다. 조용히 버린다.
  }
}

/** 라우트가 바뀔 때마다 한 번 기록한다. __root에서 한 번만 호출한다. */
export function usePageView() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (typeof window === "undefined") return;
    void record(path);
  }, [path]);
}
