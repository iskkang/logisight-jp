import io

EDITS = {
'src/lib/dataSources.ts': [
    ('SCFI: "상하이해운거래소 (SSE)",', 'SCFI: "上海航運交易所 (SSE)",'),
    ('CCFI: "상하이해운거래소 (SSE)",', 'CCFI: "上海航運交易所 (SSE)",'),
    ('KCCI: "한국해양진흥공사 (KOBC)",', 'KCCI: "韓国海洋振興公社 (KOBC)",'),
    ('trade: "관세청 수출입무역통계",', 'trade: "財務省貿易統計",'),
    ('port: "PORT-MIS (해양수산부)",', 'port: "国土交通省 港湾統計",'),
    ('air: "KITA 항공운임",', 'air: "日本銀行 企業向けサービス価格指数",'),
    ('sea: "KITA 해상운임",', 'sea: "日本銀行 企業向けサービス価格指数",'),
    ('fx: "하나은행 고시환율",', 'fx: "—",'),
],

'src/lib/congestion.ts': [
    ('severe: { label: "심각",', 'severe: { label: "深刻",'),
    ('moderate: { label: "중간",', 'moderate: { label: "中程度",'),
    ('warning: { label: "주의",', 'warning: { label: "注意",'),
    ('normal: { label: "정상",', 'normal: { label: "正常",'),
],

'src/components/ui/DataMeta.tsx': [
    ('["출처", source],', '["出典", source],'),
    ('["기준일", asOf],', '["基準日", asOf],'),
    ('["갱신주기", cadence],', '["更新頻度", cadence],'),
    ('["단위", unit],', '["単位", unit],'),
    ('["산정방식", method],', '["算定方法", method],'),
],

'src/lib/api/freight-indices.ts': [
    ('"업데이트: 수집 예정 (주 1회)"', '"更新: 収集予定(週1回)"'),
    ('`업데이트: ${d.getUTCFullYear()}', '`更新: ${d.getUTCFullYear()}'),
    ('.padStart(2, "0")} 기준`', '.padStart(2, "0")} 時点`'),
    ('"NYFI:ASIA-USWC": "아시아→미서안",', '"NYFI:ASIA-USWC": "アジア→米西岸",'),
    ('"NYFI:ASIA-USEC": "아시아→미동안",', '"NYFI:ASIA-USEC": "アジア→米東岸",'),
    ('"NYFI:ASIA-NEUR": "아시아→북유럽",', '"NYFI:ASIA-NEUR": "アジア→北欧州",'),
    ('"NYFI:TRANS-ATLANTIC_WESTBOUND": "대서양(서행)",', '"NYFI:TRANS-ATLANTIC_WESTBOUND": "大西洋(西航)",'),
    ('"NYFI:TRANS-ATLANTIC_EASTBOUND": "대서양(동행)",', '"NYFI:TRANS-ATLANTIC_EASTBOUND": "大西洋(東航)",'),
],

'src/lib/climate-quality.ts': [
    ('asset_risk 예보 행 없음`', 'asset_risk の予報行がありません`'),
    ('자산 예보 ${rows.length}/${expectedRows}개만 수신`', '資産の予報が ${rows.length}/${expectedRows} 件のみ`'),
    ('예보 갱신 시각 없음`', '予報の更新時刻がありません`'),
    ('예보 갱신 ${Math.round(ageHours)}시간 전`', '予報更新から ${Math.round(ageHours)} 時間経過`'),
    ('핵심 기상 변수 일부 누락`', '主要な気象変数の一部が欠落`'),
    ('해상 파고는 장기예보 미제공(모델 한계)`', '波高は長期予報が提供されない(モデルの制約)`'),
    ('해상 파고 예보 미제공`', '波高の予報が提供されていない`'),
    ('해상 파고 ${coverage.wave}/${maritimeRows}개만 수신`', '波高が ${coverage.wave}/${maritimeRows} 件のみ`'),
    ('return "예보 데이터 부족";', 'return "予報データ不足";'),
    ('return "일부 데이터 제한";', 'return "一部データに制限";'),
    ('return "예보 정상";', 'return "予報は正常";'),
    ('return "갱신 시각 없음";', 'return "更新時刻なし";'),
    ('return "1시간 이내 갱신";', 'return "1時間以内に更新";'),
    ('return `${Math.round(ageHours)}시간 전 갱신`;', 'return `${Math.round(ageHours)} 時間前に更新`;'),
    ('return `${Math.round(ageHours / 24)}일 전 갱신`;', 'return `${Math.round(ageHours / 24)} 日前に更新`;'),
],

'src/routes/climate.tsx': [
    ('"전 세계 항만·주요 해협·내륙 철도 거점의 기상 리스크를 AI 예보 기반, 영향을 받는 노선과 리스크를 감지합니다.";',
     '"世界の主要港湾・海峡・内陸拠点の気象リスクを予報にもとづいて監視し、影響を受ける航路を示します。";'),
    ('title: "세계 기후 예측 — Logisight",', 'title: "世界の気象リスク — Logisight",'),
],

'src/routes/port-risk.tsx': [
    ('title: "포트 리스크 인텔리전스 — Logisight",', 'title: "港湾リスク — Logisight",'),
    ('description: "항만 혼잡, 해상 병목, 초크포인트와 규제 이벤트 리스크 모니터.",',
     'description: "港湾の混雑、海上のボトルネック、チョークポイントと規制イベントのリスク監視。",'),
],
}

missed = []
for path, pairs in EDITS.items():
    s = io.open(path, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            missed.append('%s :: %s' % (path, a[:70]))
        s = s.replace(a, b)
    io.open(path, 'w', encoding='utf-8').write(s)

io.open('i18n-missed.txt', 'w', encoding='utf-8').write('\n'.join(missed) if missed else 'ALL APPLIED')
