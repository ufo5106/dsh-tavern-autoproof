// lib/local-rules.mjs — 純本地（0 Token、不受雲端審查截斷）小說去 AI 味、引號規範、NSFW 安全分流與防幻覺守門員
// 萃取整合自 dsh-novel-forge、novel-audit、deai、plainspoken-writing、sepia

export const SETTINGS_SCHEMA = Object.freeze([
  // ── 群組一：總控與 NSFW 安全分流 ──
  {
    key: 'enabled',
    group: 'core',
    type: 'boolean',
    tier: 'local',
    label: '自動校對總開關',
    default: true,
    help: '控制每輪 AI 回覆完成後是否自動執行校對流程。關閉後僅可手動點擊「校對」或「重新校對」。',
  },
  {
    key: 'nsfwRouting',
    group: 'core',
    type: 'select',
    tier: 'hybrid',
    label: 'NSFW 安全分流策略',
    default: 'bypass_local',
    options: [
      { value: 'bypass_local', label: '智能分流（推薦：露骨段留本地，安全段進 Tier 2）' },
      { value: 'local_only', label: '全篇純本地（0 Token，絕不觸發雲端截斷）' },
      { value: 'send_all', label: '全部送交 Tier 2（適合本地模型或已破限通道）' },
    ],
    help: '【核心防截斷開關】\n• 智能分流：送交雲端前先在本地掃描段落，含露骨成人描寫的段落僅做純本地 Tier 1 修復與體檢；其餘環境／心理／日常敘事段仍可安全進 Tier 2 潤飾，避免整輪觸發 400 data_inspection_failed。\n• 全篇純本地：完全不呼叫後台 LLM，100% 免疫審查且零 Token 消耗。\n• 全部送交：不做敏感詞過濾，直接送交後台模型。',
  },
  {
    key: 'tier2Route',
    group: 'core',
    type: 'select',
    tier: 'online',
    label: 'Tier 2 輸出方式',
    default: 'text',
    options: [
      { value: 'text', label: '一般文字（預設）' },
      { value: 'tool', label: '工具調用 submit_proofread（可避開部分審查）' },
      { value: 'tool_then_text', label: '工具調用，失敗時退回一般文字' },
    ],
    help: '決定 Tier 2 後台模型回傳校對結果的通道方式：\n• 一般文字：直接輸出改寫後正文。\n• 工具調用 submit_proofread：將校對結果包進工具參數 content 回傳；搭配「全部送交 Tier 2」時可讓 NSFW 段落直接走工具通道完成校對。\n• 工具調用，失敗時退回一般文字：優先走工具調用，若該段工具呼叫失敗則自動退回一般文字重試。',
  },
  {
    key: 'tier2',
    group: 'core',
    type: 'boolean',
    tier: 'online',
    label: '候選段落模型局部改寫（Tier 2）',
    default: true,
    help: '【需消耗後台模型 Token】針對命中機械化敘事（如動作拆解、對舉句式、疊詞過密）的段落呼叫後台模型微調；關閉時將僅運行純本地規則與結構體檢。',
  },
  {
    key: 'mode',
    group: 'core',
    type: 'select',
    tier: 'hybrid',
    label: '校對力道檔位',
    default: 'standard',
    options: [
      { value: 'conservative', label: '保守模式' },
      { value: 'standard', label: '標準模式（推薦）' },
      { value: 'aggressive', label: '積極模式' },
    ],
    help: '• 保守：僅處理明確八股與字級錯漏。\n• 標準：含動作拆解、碎步動作鏈與局部疊詞降密。\n• 積極：放寬單輪改寫段落上限，並納入跨輪次軟性敘事模板收斂。',
  },

  // ── 群組二：純本地淨化（🟢 0 Token、不受雲端截斷） ──
  {
    key: 'charFixMode',
    group: 'local',
    type: 'select',
    tier: 'local',
    label: '字級簡繁／英文殘留修復',
    default: 'full',
    options: [
      { value: 'off', label: '關閉' },
      { value: 'chars_only', label: '僅修簡繁錯字' },
      { value: 'full', label: '簡繁錯字＋英文殘留／詞組修復（推薦）' },
    ],
    help: '【純本地 0 Token】自動統一簡繁字形、修復夾雜在中文裡的英文單詞（如 pull／nod）與常見漏字，同時自動跳過人名、地支與 HTML／程式碼區塊。',
  },
  {
    key: 'script',
    group: 'local',
    type: 'select',
    tier: 'local',
    label: '輸出字形基準',
    default: 'auto',
    options: [
      { value: 'auto', label: '跟隨人物卡（預設）' },
      { value: 'trad', label: '一律繁體' },
      { value: 'simp', label: '一律簡體' },
    ],
    help: '【純本地 0 Token】決定字級修復與引號規範的目標字形；「跟隨人物卡」會自動偵測目前角色卡設定是繁體或簡體。',
  },
  {
    key: 'quoteNormalize',
    group: 'local',
    type: 'select',
    tier: 'local',
    label: '雙向引號規範化',
    default: 'auto',
    options: [
      { value: 'off', label: '關閉' },
      { value: 'auto', label: '跟隨目標字形（繁「」『』／簡“”‘’）' },
      { value: 'trad_corner', label: '強制台灣直角引號「」『』' },
      { value: 'simp_curly', label: '強制簡體彎引號“”‘’' },
    ],
    help: '【純本地 0 Token】修正模型常把繁體文寫成簡體彎引號“”、或混用英文直引號""的問題。採用冪等純函數配對嵌套，不破壞 HTML 屬性與程式碼。',
  },
  {
    key: 'aiLexiconLevel',
    group: 'local',
    type: 'select',
    tier: 'local',
    label: '網文 AI 模板詞與副詞密度掃描',
    default: 'balanced',
    options: [
      { value: 'off', label: '關閉' },
      { value: 'report', label: '僅在報告標記（不觸發改寫）' },
      { value: 'strict', label: '嚴格檔（弱化副詞 > 2.0/千字即觸發）' },
      { value: 'balanced', label: '平衡檔（弱化副詞 > 3.0/千字，推薦）' },
      { value: 'relaxed', label: '寬鬆檔（弱化副詞 > 5.0/千字）' },
    ],
    help: '【純本地 0 Token】整合 deai／novel-audit 網文模板詞庫（如「嘴角勾起」「瞳孔微縮」「指節泛白」「不由自主」等）與弱化副詞（「緩緩／微微／輕輕／淡淡／似乎／彷彿」）千字密度門檻，避免誤殺單次自然描寫。',
  },
  {
    key: 'localRhythmAudit',
    group: 'local',
    type: 'select',
    tier: 'local',
    label: '小說節奏／升華尾句／六感平衡體檢',
    default: 'full',
    options: [
      { value: 'off', label: '關閉' },
      { value: 'basic', label: '基礎體檢（段落節奏 CV＋結尾升華腔）' },
      { value: 'full', label: '完整體檢（含公式轉折、六感分佈與撞場偵測）' },
    ],
    help: '【純本地 0 Token】\n• 段落／句長變異係數 CV（<0.15 代表通篇等長如機器節拍器）。\n• 結尾升華腔：抓出「這一刻」「原來所謂…」「命運的齒輪」等說教尾句。\n• 六感平衡：統計視／聽／嗅／味／觸／溫體感佔比，檢視是否過度依賴視覺而缺乏觸覺與溫體感。',
  },

  // ── 群組三：線上改寫紀律與防幻覺保護（🟡/🔵） ──
  {
    key: 'protectDialogue',
    group: 'tier2',
    type: 'boolean',
    tier: 'hybrid',
    label: '對話與角色口癖保護區',
    default: true,
    help: '【本地保護＋Tier 2 規則】保護純對白行與引號內的角色口癖、語氣詞與方言，避免 Tier 2 改寫時將個性化台詞磨平成標準書面語。',
  },
  {
    key: 'hallucinationGuard',
    group: 'tier2',
    type: 'select',
    tier: 'local',
    label: '改寫後本地防幻覺守門員',
    default: 'strict',
    options: [
      { value: 'off', label: '關閉（僅保留長度截斷檢查）' },
      { value: 'standard', label: '標準（中／阿數字等價保真＋長度檢查）' },
      { value: 'strict', label: '嚴格（數字保真＋長度＋禁止引入新 AI 模板詞）' },
    ],
    help: '【純本地 0 Token 守門】當 Tier 2 回傳改寫結果時，在本地自動比對原文與改寫文：\n• 支援中文數字（「三百」「一萬兩千」）與阿拉伯數字等價核對，防止模型亂改數量。\n• 嚴格檔會拒收「越改越多 AI 模板詞」的結果並自動退回原文。',
  },
  {
    key: 'aestheticPrompt',
    group: 'tier2',
    type: 'select',
    tier: 'online',
    label: '小說美學編修紀律（Tier 2 提示詞）',
    default: 'deep',
    options: [
      { value: 'standard', label: '標準紀律（既有去八股規則）' },
      { value: 'deep', label: '深度美學（替換不複用＋少解釋情緒＋停早一拍）' },
    ],
    help: '【作用於 Tier 2 提示詞】「深度美學」融入 deai 與 sepia 的小說修訂心法：\n• 替換不複用：禁止把所有眼神都改成「垂下眼」。\n• 動作後少解釋一句：動作已表現情緒時刪掉「他猶豫了」。\n• 停早一拍：刪掉說教結尾，停在具體動作或對話。',
  },
  {
    key: 'preHint',
    group: 'tier2',
    type: 'boolean',
    tier: 'online',
    label: '跨輪次生成前輕量提醒',
    default: true,
    help: '當最近幾輪連續出現同類 AI 模板（如連三輪用「不是A是B」或動作拆解）時，於下一輪生成前注入極簡提醒，從源頭減少模板產出。',
  },
  {
    key: 'historyWindow',
    group: 'tier2',
    type: 'number',
    tier: 'local',
    label: '跨輪次記憶輪數',
    min: 4,
    max: 12,
    step: 1,
    default: 8,
    help: '追蹤最近幾輪的敘事習慣（建議 6～10 輪）。',
  },
  {
    key: 'targetedFeedback',
    group: 'tier2',
    type: 'boolean',
    tier: 'hybrid',
    label: '精準病灶定位反饋',
    default: true,
    help: '【本地定位＋Tier 2 提示】送交 Tier 2 改寫前，先在本地抽出該段確切命中的模板詞或頂真片段並標註給模型，讓模型只動刀有問題的局部（對話保護區啟用時自動跳過引號內台詞）。',
  },
  {
    key: 'contrastiveExemplars',
    group: 'tier2',
    type: 'boolean',
    tier: 'online',
    label: '動態正反面極簡對照範例',
    default: true,
    help: '【按需注入 Tier 2 提示】僅針對該段命中的病灶類型，動態附上 1～2 組極簡「壞寫法 → 真人好寫法」對照範例；不塞無關規則，避免提示詞過載。',
  },
  {
    key: 'bestOfN',
    group: 'tier2',
    type: 'select',
    tier: 'online',
    label: 'Best-of-N 局部候補擇優',
    default: '1',
    options: [
      { value: '1', label: '關閉（單次改寫，最省 Token）' },
      { value: 'smart_2', label: '智能雙候補（僅高問題段跑 2 選 1，推薦）' },
      { value: '2', label: '全部雙候補（每段 2 選 1，2x Token）' },
      { value: '3', label: '全部三候補（每段 3 選 1，3x Token）' },
    ],
    help: '【需額外消耗後台 Token】讓 Tier 2 平行產出多份改寫候補，再用純本地評分器（模板詞更少、句長節奏更自然、通過數字防幻覺守門）自動挑出最佳一版。\n• 智能雙候補：只對同時命中 2 項以上毛病的重災段跑雙候補，兼顧品質與速度。',
  },
  {
    key: 'cooldownPool',
    group: 'local',
    type: 'select',
    tier: 'local',
    label: '跨輪高頻動作／意象冷卻池',
    default: 'inject',
    options: [
      { value: 'off', label: '關閉' },
      { value: 'report', label: '僅在報告統計（不注入提示）' },
      { value: 'inject', label: '自動冷卻提醒（最多列 5 個高頻詞，推薦）' },
    ],
    help: '【純本地 0 Token 追蹤】統計最近幾輪重複出現的高頻微動作與意象（如「喉結滾動」「呼吸一滯」「嘴角勾起」）。連續多輪超標時進入動態冷卻，提醒主模型換用其他具體描寫；最多僅列 5 個，不製造冗長禁詞表。',
  },
  {
    key: 'narrativeSteering',
    group: 'local',
    type: 'select',
    tier: 'local',
    label: '敘事結構級主動糾偏（StoryScope）',
    default: 'inject',
    options: [
      { value: 'off', label: '關閉' },
      { value: 'report', label: '僅在報告統計（不注入提示）' },
      { value: 'inject', label: '自動微調提醒（防頓悟收尾／節奏扁平，推薦）' },
    ],
    help: '【純本地 0 Token 結構分析】參考 StoryScope 論文指紋：若連續多輪都以「心理頓悟／說教升華」收尾、節奏長期單調或情緒過度直寫，將在下一輪輕量提醒「可停在動作／對話或留一點未解質感」，不強制製造狗血轉折。',
  },
])

export const DEFAULT_SETTINGS = Object.freeze(
  Object.fromEntries(SETTINGS_SCHEMA.map((f) => [f.key, f.default]))
)

export function normalizeSettings(raw = {}) {
  const out = { ...DEFAULT_SETTINGS }
  if (!raw || typeof raw !== 'object') return out
  for (const field of SETTINGS_SCHEMA) {
    const val = raw[field.key]
    if (val === undefined || val === null) continue
    if (field.type === 'boolean') {
      out[field.key] = Boolean(val)
    } else if (field.type === 'number') {
      const n = Number(val)
      if (Number.isFinite(n)) {
        const clamped = Math.max(field.min ?? -Infinity, Math.min(field.max ?? Infinity, n))
        out[field.key] = clamped
      }
    } else if (field.type === 'select') {
      if ((field.options || []).some((o) => o.value === val)) {
        out[field.key] = val
      }
    }
  }
  return out
}

// ── 1. 雙向引號規範化（純函數、冪等、零資訊損失） ──

/**
 * 將正文引號統一為繁體直角引號（「」『』）或簡體彎引號（“”‘’）。
 * 僅應對純文字段（非 HTML / 非程式碼區塊）呼叫。
 */
export function normalizeQuotes(text, target = 'trad_corner') {
  const input = String(text ?? '')
  if (!input || target === 'off') return { text: input, converted: 0 }

  let converted = 0
  if (target === 'trad_corner') {
    // 先處理配對的彎雙引號 “...” 與彎單引號 ‘...’，再處理成對 ASCII "..."（排除英文單字撇號如 don't）
    let out = input
    // 1. 彎雙引號 “...” -> 「...」（若內部已有 「」 或嵌套 ‘...’，在下面單引號層處理）
    out = out.replace(/“([^“”\n]{1,600})”/g, (_, inner) => {
      converted += 2
      return `「${inner}」`
    })
    // 2. 彎單引號 ‘...’ -> 『...』（若在 「」 外被當一級引號用仍保留『』或轉「」？保守轉『』不猜語意）
    out = out.replace(/‘([^‘’\n]{1,600})’/g, (_, inner) => {
      converted += 2
      return `『${inner}』`
    })
    // 3. 成對 ASCII 雙引號 "..."（前後不可為英文字母或等號，避免破壞殘留屬性或英文縮寫）
    out = out.replace(/(?<![A-Za-z0-9_=])"([^"\n]{1,600})"(?![A-Za-z0-9_])/g, (_, inner) => {
      converted += 2
      return `「${inner}」`
    })
    // 4. 處理「『』」最常見的誤嵌套：若 『』 出現在任何 「」 之外且數量成對，可視情況保留，不做危險跨段猜測
    return { text: out, converted }
  }

  if (target === 'simp_curly') {
    let out = input
    out = out.replace(/「([^「」\n]{1,600})」/g, (_, inner) => {
      converted += 2
      return `“${inner}”`
    })
    out = out.replace(/『([^『』\n]{1,600})』/g, (_, inner) => {
      converted += 2
      return `‘${inner}’`
    })
    out = out.replace(/(?<![A-Za-z0-9_=])"([^"\n]{1,600})"(?![A-Za-z0-9_])/g, (_, inner) => {
      converted += 2
      return `“${inner}”`
    })
    return { text: out, converted }
  }

  return { text: input, converted: 0 }
}

// ── 2. 網文／小說 AI 模板詞庫與千字密度掃描 ──

export const WEBNOVEL_T1_TEMPLATES = Object.freeze([
  // 情態／模糊修飾
  '毫無徵兆', '毫无征兆', '幾不可聞', '几不可闻', '微不可察',
  // 動作／神態
  '深吸一口氣', '深吸一口气', '眼中閃過', '眼中闪过', '眼底閃過', '眼底闪过',
  '嘴角勾起', '嘴角微揚', '嘴角微扬', '眉頭微皺', '眉头微皱', '眉眼低垂',
  '瞳孔微縮', '瞳孔微缩', '瞳孔收縮', '瞳孔收缩', '瞳孔一縮', '瞳孔一缩',
  '指節泛白', '指节泛白', '眼神銳利', '眼神锐利', '目光銳利', '目光锐利',
  // 心理
  '心中一動', '心中一动', '心頭一震', '心头一震', '心下了然', '心中暗道',
  '心底泛起', '心中一凜', '心中一凛', '心頭一緊', '心头一紧',
  // 判斷／過渡
  '不容置疑', '不容置喙', '不易察覺', '不易察觉', '顯而易見', '显而易见',
  '毫無疑問', '毫无疑问', '不可否認', '不可否认', '前所未有',
  '不由自主', '情不自禁', '自然而然', '話鋒一轉', '话锋一转', '不由得',
])

export const SOFT_HEDGE_WORDS = Object.freeze([
  '緩緩', '缓缓', '微微', '輕輕', '轻轻', '淡淡',
  '似乎', '彷彿', '仿佛', '好像', '或許', '或许', '也許', '也许',
  '不禁', '竟然', '居然', '莫名', '隱隱', '隐隐', '隱約', '隐约',
  '一絲', '一丝', '一抹', '幾分', '几分', '些許', '些许',
])

export const LYRIC_FLUFF_WORDS = Object.freeze([
  '安放', '抵達', '抵达', '微光', '褶皺', '褶皱', '滾燙', '滚烫',
  '輕盈', '轻盈', '赤裸', '剝開', '剥开', '鋒利', '锋利', '堅硬', '坚硬', '柔軟', '柔软',
])

const NOMINALIZATION_RE = /(?:進行了|进行了|實現了|实现了|完成了對|完成了对)[\u4e00-\u9fff]{1,10}的(?:提升|優化|优化|調整|调整|處理|处理|探索|分析|觀察|观察|打量)/g

const LEXICON_THRESHOLDS = Object.freeze({
  strict: { softPerK: 2.0, t1Min: 1, lyricMin: 3 },
  balanced: { softPerK: 3.0, t1Min: 1, lyricMin: 4 },
  relaxed: { softPerK: 5.0, t1Min: 2, lyricMin: 6 },
  report: { softPerK: 3.0, t1Min: 1, lyricMin: 4 },
})

function countOccurrences(text, words) {
  const hits = new Map()
  let total = 0
  for (const w of words) {
    let idx = 0
    let c = 0
    while ((idx = text.indexOf(w, idx)) !== -1) {
      c += 1
      idx += w.length
    }
    if (c > 0) {
      hits.set(w, (hits.get(w) || 0) + c)
      total += c
    }
  }
  return { hits, total }
}

export function scanWebNovelAiTells(text, level = 'balanced') {
  const src = String(text ?? '')
  if (!src || level === 'off') {
    return {
      enabled: false,
      t1Count: 0,
      t1Hits: [],
      softCount: 0,
      softPerK: 0,
      softTriggered: false,
      lyricCount: 0,
      nominalCount: 0,
      triggered: false,
      warnings: [],
    }
  }
  const hanziCount = (src.match(/[\u4e00-\u9fff]/g) || []).length
  const kilo = Math.max(0.2, hanziCount / 1000)
  const th = LEXICON_THRESHOLDS[level] || LEXICON_THRESHOLDS.balanced

  const t1 = countOccurrences(src, WEBNOVEL_T1_TEMPLATES)
  const soft = countOccurrences(src, SOFT_HEDGE_WORDS)
  const lyric = countOccurrences(src, LYRIC_FLUFF_WORDS)
  const nominalMatches = src.match(NOMINALIZATION_RE) || []

  const softPerK = Number((soft.total / kilo).toFixed(2))
  const t1Triggered = t1.total >= th.t1Min
  const softTriggered = soft.total >= 2 && hanziCount >= 80 && softPerK > th.softPerK
  const lyricTriggered = lyric.total >= th.lyricMin
  const nominalTriggered = nominalMatches.length >= 1

  const t1Hits = Array.from(t1.hits.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }))

  const softTop = Array.from(soft.hits.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word, count]) => ({ word, count }))

  const warnings = []
  if (t1Triggered) {
    warnings.push(`網文模板詞 ${t1.total} 處（${t1Hits.slice(0, 4).map((x) => `${x.word}×${x.count}`).join('、')}）`)
  }
  if (softTriggered) {
    warnings.push(`弱化/對沖副詞偏密 ${softPerK}/千字（共 ${soft.total} 處：${softTop.slice(0, 3).map((x) => x.word).join('、')}）`)
  }
  if (lyricTriggered) {
    warnings.push(`抒情裝腔詞偏多（${lyric.total} 處）`)
  }
  if (nominalTriggered) {
    warnings.push(`名詞化冗餘殼 ${nominalMatches.length} 處`)
  }

  return {
    enabled: true,
    level,
    t1Count: t1.total,
    t1Hits,
    softCount: soft.total,
    softPerK,
    softTop,
    softTriggered,
    lyricCount: lyric.total,
    nominalCount: nominalMatches.length,
    triggered: t1Triggered || softTriggered || lyricTriggered || nominalTriggered,
    warnings,
  }
}

// ── 3. 純本地節奏／結尾升華／公式轉折／六感平衡／撞場體檢（0 Token） ──

const TRANSITION_WORDS = Object.freeze([
  '然而', '但是', '可是', '不過', '不过', '於是', '于是', '因此', '所以',
  '然後', '然后', '接著', '接着', '緊接著', '紧接着', '與此同時', '与此同时',
  '就在這時', '就在这时', '突然', '忽然', '頓時', '顿时',
])

const APHORISM_END_RE = /(原來|原来|所謂|所谓|這才(?:是|叫)|这才(?:是|叫)|這就是|这就是|不過是|不过是|只不過|只不过|從今以後|从今以后|往後餘生|往后余生|人生|命運|命运|道理|答案|生來|生来|注定|這一刻|这一刻|終於明白|终于明白|這才意識到|这才意识到)/

export const SENSORY_LEXICON = Object.freeze({
  視覺: ['看', '見', '见', '望', '瞧', '盯', '瞥', '眼', '視線', '视线', '光', '亮', '暗', '影', '色', '白', '黑', '紅', '红', '藍', '蓝', '明', '昏', '輪廓', '轮廓'],
  聽覺: ['聽', '听', '聲', '声', '響', '响', '音', '嗡', '叩', '喊', '叫', '低語', '低语', '耳', '靜', '静', '喘', '呢喃', '嗚咽', '呜咽', '鈴', '铃', '腳步', '脚步'],
  嗅覺: ['聞', '闻', '氣味', '气味', '味道', '香', '臭', '腥', '氣息', '气息', '嗅', '汗味', '麝', '薰'],
  味覺: ['嚐', '尝', '舌', '甜', '苦', '酸', '辣', '鹹', '咸', '澀', '涩', '嚥', '咽', '津', '吻', '舔'],
  觸覺: ['摸', '觸', '触', '碰', '握', '捏', '撫', '抚', '壓', '压', '滑', '軟', '软', '硬', '濕', '湿', '黏', '貼', '贴', '指腹', '皮膚', '皮肤', '摩擦', '蹭', '掐', '揉'],
  溫體感: ['涼', '凉', '暖', '冷', '熱', '热', '燙', '烫', '溫', '温', '顫', '颤', '抖', '麻', '痠', '酸軟', '酸软', '痛', '緊', '紧', '鬆', '松', '戰慄', '战栗', '酥'],
})

function calcCv(nums) {
  if (!nums || nums.length < 3) return null
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length
  if (mean <= 0) return null
  const variance = nums.reduce((sum, x) => sum + (x - mean) ** 2, 0) / nums.length
  return Number((Math.sqrt(variance) / mean).toFixed(3))
}

function isDialogueLine(line) {
  const s = line.trim()
  return /^[「『“"（(]/.test(s) || /[」』”"）)]$/.test(s)
}

export function analyzeLocalNovelHealth(text, level = 'full') {
  const src = String(text ?? '')
  if (!src || level === 'off') return { enabled: false, warnings: [] }

  const paras = src.split(/\n+/).map((x) => x.trim()).filter(Boolean)
  const paraLens = paras.map((p) => (p.match(/[\u4e00-\u9fff]/g) || []).length).filter((n) => n > 0)
  const paraCv = calcCv(paraLens)

  const sentences = src
    .split(/[。！？!?…\n]+/)
    .map((s) => (s.match(/[\u4e00-\u9fff]/g) || []).length)
    .filter((n) => n >= 2)
  const sentCv = calcCv(sentences)

  // 結尾升華腔偵測
  const aphorismEndings = []
  const lastPara = paras[paras.length - 1] || ''
  if (lastPara && !isDialogueLine(lastPara)) {
    const tailSegs = lastPara.split(/[。！？!?]+/).map((x) => x.trim()).filter(Boolean)
    const lastSent = tailSegs[tailSegs.length - 1] || ''
    const len = (lastSent.match(/[\u4e00-\u9fff]/g) || []).length
    if (len >= 5 && len <= 36 && APHORISM_END_RE.test(lastSent)) {
      aphorismEndings.push(lastSent.slice(0, 40))
    }
  }

  const warnings = []
  if (paraCv !== null && paraLens.length >= 4 && paraCv < 0.15) {
    warnings.push(`段落長度過於均勻（CV=${paraCv} < 0.15，節奏單調）`)
  }
  if (sentCv !== null && sentences.length >= 6 && sentCv < 0.22) {
    warnings.push(`句長變化偏平（CV=${sentCv} < 0.22）`)
  }
  if (aphorismEndings.length > 0) {
    warnings.push(`結尾疑似說教/升華腔：「${aphorismEndings[0]}」`)
  }

  const result = {
    enabled: true,
    level,
    paraCv,
    sentCv,
    aphorismEndings,
    repeatedTransitions: [],
    sensory: null,
    shingleOverlap: 0,
    warnings,
  }

  if (level === 'basic') return result

  // 公式轉折重複
  const trans = countOccurrences(src, TRANSITION_WORDS)
  const repeatedTransitions = Array.from(trans.hits.entries())
    .filter(([, count]) => count >= 5)
    .map(([word, count]) => ({ word, count }))
  result.repeatedTransitions = repeatedTransitions
  if (repeatedTransitions.length) {
    warnings.push(`公式轉折詞高頻重複：${repeatedTransitions.map((x) => `${x.word}×${x.count}`).join('、')}`)
  }

  // 六感平衡
  const sensoryCounts = {}
  let sensoryTotal = 0
  for (const [sense, words] of Object.entries(SENSORY_LEXICON)) {
    const { total } = countOccurrences(src, words)
    sensoryCounts[sense] = total
    sensoryTotal += total
  }
  if (sensoryTotal >= 8) {
    const ratios = {}
    const dominant = []
    const starved = []
    for (const [sense, count] of Object.entries(sensoryCounts)) {
      const r = Number((count / sensoryTotal).toFixed(2))
      ratios[sense] = r
      if (r > 0.55) dominant.push(`${sense}${Math.round(r * 100)}%`)
      if (r < 0.03) starved.push(sense)
    }
    result.sensory = { counts: sensoryCounts, ratios, total: sensoryTotal, dominant, starved }
    if (dominant.length) {
      warnings.push(`感官過度偏重${dominant.join('、')}`)
    }
  }

  // 8 字 Shingle 撞場／自我複讀偵測（純敘事段落之間）
  const narrativeChars = paras
    .filter((p) => !isDialogueLine(p))
    .join('')
    .replace(/[^\u4e00-\u9fff]/g, '')
  if (narrativeChars.length >= 120) {
    const seen = new Set()
    let dup = 0
    const totalShingles = narrativeChars.length - 7
    for (let i = 0; i < totalShingles; i++) {
      const sh = narrativeChars.slice(i, i + 8)
      if (seen.has(sh)) dup += 1
      else seen.add(sh)
    }
    const overlap = Number((dup / totalShingles).toFixed(3))
    result.shingleOverlap = overlap
    if (overlap >= 0.08) {
      warnings.push(`敘事句段內部重複率偏高（8-gram 重合 ${(overlap * 100).toFixed(1)}%）`)
    }
  }

  return result
}

// ── 4. NSFW 安全分流與對話保護區偵測 ──

const NSFW_EXPLICIT_RE = /(?:陰莖|阴茎|肉棒|陽具|阳具|龜頭|龟头|陰道|阴道|陰戶|阴户|陰蒂|阴蒂|花穴|嫩穴|蜜穴|肉穴|後庭|后庭|菊穴|子宮口|子宫口|乳頭|乳头|乳暈|乳晕|乳房|胸乳|騷穴|骚穴|淫水|愛液|爱液|精液|白濁|白浊|高潮|潮吹|射精|內射|内射|顏射|颜射|口交|口活|吞精|深喉|自慰|抽插|頂弄|顶弄|挺動|挺动|貫穿|贯穿|痙攣|痉挛|失禁|發情|发情|春藥|春药|媚藥|媚药|肉慾|肉欲|交合|交歡|交欢|性交|做愛|做爱|性愛|性爱|呻吟|浪叫|嬌喘|娇喘|腿心|私處|私处|下體|下体|股間|股间|肉壁|花心|敏感點|敏感点)/

export function isSensitiveNsfwSegment(text) {
  return NSFW_EXPLICIT_RE.test(String(text ?? ''))
}

export function isDialogueProtectedParagraph(text) {
  const s = String(text ?? '').trim()
  if (!s) return false
  // 純對話行（整段由引號包覆，且幾乎沒有引號外敘事）
  if (/^[「『“"][^「」『』“”"\n]{1,220}[」』”"]$/.test(s)) return true
  // 超過 70% 字元在引號內的段也視為以對話為主的口癖保護區
  const quoteBody = (s.match(/[「『“"][^「」『』“”"]+[」』”"]/g) || []).join('')
  if (quoteBody.length >= s.length * 0.72) return true
  return false
}

// ── 5. Tier 2 防幻覺與數字保真守門員（純本地） ──

const CN_DIGITS = Object.freeze({
  零: 0, 〇: 0, 一: 1, 壹: 1, 二: 2, 兩: 2, 两: 2, 貳: 2, 三: 3, 參: 3,
  四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
})

function parseCnSection(sec) {
  let total = 0
  let num = 0
  for (const ch of sec) {
    if (ch in CN_DIGITS) {
      num = CN_DIGITS[ch]
    } else if (ch === '十' || ch === '拾') {
      total += (num || 1) * 10
      num = 0
    } else if (ch === '百' || ch === '佰') {
      total += (num || 1) * 100
      num = 0
    } else if (ch === '千' || ch === '仟') {
      total += (num || 1) * 1000
      num = 0
    }
  }
  return total + num
}

function parseCnNumber(s) {
  if (s in CN_DIGITS) return CN_DIGITS[s]
  if (s.includes('億') || s.includes('亿')) {
    const sep = s.includes('億') ? '億' : '亿'
    const [hi, lo] = s.split(sep, 2)
    return parseCnNumber(hi || '一') * 100000000 + (lo ? parseCnNumber(lo) : 0)
  }
  if (s.includes('萬') || s.includes('万')) {
    const sep = s.includes('萬') ? '萬' : '万'
    const [hi, lo] = s.split(sep, 2)
    return parseCnSection(hi || '一') * 10000 + (lo ? parseCnSection(lo) : 0)
  }
  return parseCnSection(s)
}

export function extractNormalizedNumbers(text) {
  const s = String(text ?? '')
  const set = new Set()
  for (const m of s.matchAll(/\d+(?:\.\d+)?/g)) {
    set.add(m[0])
  }
  for (const m of s.matchAll(/[一二兩两三四五六七八九十百千萬万億亿零〇]{1,12}/g)) {
    const tok = m[0]
    // 排除常見非數量詞組如「一起」「一定」「一般」「一直」「一時」「萬一」
    if (/^(?:一起|一定|一般|一直|一時|一时|一切|一樣|一样|一會|一会|一旁|一邊|一边|一絲|一丝|一抹|一陣|一阵|一聲|一声|萬一|万一)$/.test(tok)) {
      continue
    }
    const val = parseCnNumber(tok)
    if (val > 0) set.add(String(val))
  }
  return set
}

export function validateTier2Rewrite(original, rewritten, guardLevel = 'strict') {
  const orig = String(original ?? '').trim()
  const next = String(rewritten ?? '').trim()
  if (!next) return { ok: false, reason: 'empty' }

  const beforeHanzi = (orig.match(/[\u4e00-\u9fff]/g) || []).length
  const afterHanzi = (next.match(/[\u4e00-\u9fff]/g) || []).length
  if (beforeHanzi >= 20 && afterHanzi < beforeHanzi * 0.5) {
    return { ok: false, reason: 'truncated' }
  }
  if (beforeHanzi >= 20 && afterHanzi > beforeHanzi * 1.6) {
    return { ok: false, reason: 'expanded' }
  }

  if (guardLevel === 'off') return { ok: true, reason: '' }

  // 數字保真：改寫後不應憑空冒出原文完全沒有的新數值（> 1 的具體數量）
  const origNums = extractNormalizedNumbers(orig)
  const nextNums = extractNormalizedNumbers(next)
  for (const n of nextNums) {
    if (n !== '1' && !origNums.has(n)) {
      return { ok: false, reason: `hallucinated-number:${n}` }
    }
  }

  if (guardLevel === 'strict') {
    const beforeTells = scanWebNovelAiTells(orig, 'balanced')
    const afterTells = scanWebNovelAiTells(next, 'balanced')
    const beforeAi = beforeTells.t1Count + beforeTells.softCount
    const afterAi = afterTells.t1Count + afterTells.softCount
    if (afterAi > beforeAi + 1) {
      return { ok: false, reason: 'introduced-ai-tells' }
    }
  }

  return { ok: true, reason: '' }
}

// ── 6. 精準病灶定位反饋（Targeted Span Feedback） ──

function stripDialogueSpans(text) {
  return String(text ?? '').replace(/[「『“"][^「」『』“”"\n]{1,300}[」』”"]/g, ' ')
}

/**
 * 從單一段落中精準抽出實際踩中的問題片段（供 Tier 2 局部定位改寫，不傷及無辜句子）。
 * 當 protectDialogue=true 時，引號內的對白不納入定位掃描。
 */
export function locateParagraphIssues(text, findings = [], options = {}) {
  const { protectDialogue = true, lexiconLevel = 'balanced' } = options
  const src = protectDialogue ? stripDialogueSpans(text) : String(text ?? '')
  if (!src.trim()) return []

  const spans = []
  const seen = new Set()
  const add = (label) => {
    const clean = String(label || '').trim()
    if (!clean || seen.has(clean)) return
    seen.add(clean)
    spans.push(clean)
  }

  // 1. 一級網文模板詞
  for (const w of WEBNOVEL_T1_TEMPLATES) {
    if (src.includes(w)) add(w)
    if (spans.length >= 6) return spans
  }

  // 2. 弱化／對沖副詞（段落內出現 >= 2 次，或 strict 檔且有命中）
  const softHits = SOFT_HEDGE_WORDS.filter((w) => src.includes(w))
  if (softHits.length >= 2 || (lexiconLevel === 'strict' && softHits.length >= 1)) {
    for (const w of softHits.slice(0, 3)) add(w)
  }

  // 3. 名詞化冗餘殼
  for (const m of src.matchAll(NOMINALIZATION_RE)) {
    add(m[0])
    if (spans.length >= 6) return spans
  }

  // 4. 對舉「不是…而是/是…」
  if (findings.includes('paired_reversal') || findings.includes('omitted_antithesis')) {
    const m = src.match(/(?:不是|並非|并非)[^，。！？\n]{2,20}[，,]?\s*(?:而是|是)[^，。！？\n]{2,20}/)
    if (m) add(m[0])
  }

  // 5. 頂真拆解或一X一X疊詞堆疊
  const echo = src.match(/([\u4e00-\u9fff]{1,2})[了過着著]?[，,]\s*\1[\u4e00-\u9fff]{1,6}/)
  if (echo) add(echo[0])

  const redup = src.match(/(?:一[\u4e00-\u9fff]一[\u4e00-\u9fff][^，。！？\n]{0,12}){2,}/)
  if (redup) add(redup[0])

  // 6. 結尾升華說教殼
  const lastClause = src.split(/[。！？!?]+/).map((x) => x.trim()).filter(Boolean).pop() || ''
  if (lastClause && APHORISM_END_RE.test(lastClause) && lastClause.length <= 42) {
    add(lastClause)
  }

  return spans.slice(0, 6)
}

// ── 7. 動態正／反面極簡對照範例（Contrastive Exemplars） ──

const EXEMPLAR_BANK_TRAD = Object.freeze({
  action_inflation: '反例：「他點了點頭，點頭的幅度極小。」 → 改為：「他極輕地點了下頭。」',
  action_chain: '反例：「他走到桌前，伸出手，拿起茶杯喝了一口。」 → 改為：「他走到桌前抄起茶杯喝了一口。」',
  paired_reversal: '反例：「那不是恐懼，而是一種說不清的疲憊。」 → 改為：「他沒覺得怕，只是渾身發沉。」',
  omitted_antithesis: '反例：「她想要的不是安慰，而是真相。」 → 改為：「她只想聽實話。」',
  reduplication_cluster: '反例：「水珠一串一串順著指節一根一根往下滴。」 → 改為：「水珠順著指節成串往下滴。」',
  local_webnovel_lexicon: '反例：「他嘴角勾起一抹弧度，眼中閃過一絲冷意。」 → 改為：「他扯了扯嘴角，眼神涼了下來。」',
  aphorism_ending: '反例：「那一刻他終於明白，這就是命運。」 → 改為直接刪去總結，停在最後一個動作或對白。',
  soft_dialogue_stage: '反例：每句對白前都配「他微微垂下眼」「她輕輕咬住唇」 → 改為只留有戲劇張力的動作，其餘直接說話。',
})

const EXEMPLAR_BANK_SIMP = Object.freeze({
  action_inflation: '反例：「他点了点头，点头的幅度极小。」 → 改为：「他极轻地点了下头。」',
  action_chain: '反例：「他走到桌前，伸出手，拿起茶杯喝了一口。」 → 改为：「他走到桌前抄起茶杯喝了一口。」',
  paired_reversal: '反例：「那不是恐惧，而是一种说不清的疲惫。」 → 改为：「他没觉得怕，只是浑身发沉。」',
  omitted_antithesis: '反例：「她想要的不是安慰，而是真相。」 → 改为：「她只想听实话。」',
  reduplication_cluster: '反例：「水珠一串一串顺着指节一根一根往下滴。」 → 改为：「水珠顺着指节成串往下滴。」',
  local_webnovel_lexicon: '反例：「他嘴角勾起一抹弧度，眼中闪过一丝冷意。」 → 改为：「他扯了扯嘴角，眼神凉了下来。」',
  aphorism_ending: '反例：「那一刻他终于明白，这就是命运。」 → 改为直接删去总结，停在最后一个动作或对白。',
  soft_dialogue_stage: '反例：每句对白前都配「他微微垂下眼」「她轻轻咬住唇」 → 改为只留有戏剧张力的动作，其余直接说话。',
})

export function pickContrastiveExemplars(findings = [], { toScript = 'trad', maxItems = 2 } = {}) {
  const bank = toScript === 'simp' ? EXEMPLAR_BANK_SIMP : EXEMPLAR_BANK_TRAD
  const out = []
  const seen = new Set()
  for (const key of findings) {
    const mapped = key === 'omitted_antithesis' && !bank[key] ? 'paired_reversal' : key
    const ex = bank[mapped]
    if (ex && !seen.has(ex)) {
      seen.add(ex)
      out.push(ex)
      if (out.length >= maxItems) break
    }
  }
  return out
}

// ── 8. Best-of-N 本地確定性評分器（SlopBench 思路） ──

export function scoreRewriteCandidate(original, candidate, guardLevel = 'strict') {
  const check = validateTier2Rewrite(original, candidate, guardLevel)
  if (!check.ok) {
    return { ok: false, score: -Infinity, reason: check.reason }
  }
  const next = String(candidate ?? '').trim()
  const orig = String(original ?? '').trim()
  const origTells = scanWebNovelAiTells(orig, 'balanced')
  const nextTells = scanWebNovelAiTells(next, 'balanced')

  const sentences = next
    .split(/[。！？!?…\n]+/)
    .map((s) => (s.match(/[\u4e00-\u9fff]/g) || []).length)
    .filter((n) => n >= 2)
  const sentCv = calcCv(sentences) ?? 0.25

  let score = 100
  score -= nextTells.t1Count * 10
  score -= nextTells.softCount * 3
  score -= nextTells.lyricCount * 2
  score -= nextTells.nominalCount * 4
  score += Math.min(12, sentCv * 20)
  // 若原文有明確一級模板詞卻原封不動照抄，略扣分以優先選擇真正有修復的版本
  if (next === orig && origTells.t1Count > 0) {
    score -= 4
  }

  return {
    ok: true,
    score: Number(score.toFixed(2)),
    t1Count: nextTells.t1Count,
    softCount: nextTells.softCount,
    sentCv,
  }
}

// ── 9. 跨輪高頻動作／意象冷卻池（純本地 0 Token） ──

export const COOLDOWN_MICRO_ACTIONS = Object.freeze([
  '嘴角勾起', '嘴角微揚', '嘴角微扬', '眼中閃過', '眼中闪过', '眼底閃過', '眼底闪过',
  '喉結滾動', '喉结滚动', '呼吸一滯', '呼吸一滞', '指尖微顫', '指尖微颤',
  '指節泛白', '指节泛白', '瞳孔微縮', '瞳孔微缩', '心頭一震', '心头一震',
  '心中一動', '心中一动', '眉頭微皺', '眉头微皱', '深吸一口氣', '深吸一口气',
  '垂下眼', '別開眼', '别开眼', '斂下眉', '敛下眉',
  '空氣凝固', '空气凝固', '陷入沉默', '沉默片刻',
])

export function extractTurnMicroActions(text) {
  const nonDialogue = String(text ?? '')
    .split(/\n+/)
    .filter((line) => !isDialogueLine(line))
    .join('\n')
  if (!nonDialogue) return { counts: {}, topPhrases: [] }

  const { hits } = countOccurrences(nonDialogue, COOLDOWN_MICRO_ACTIONS)
  const counts = Object.fromEntries(hits.entries())
  const topPhrases = Array.from(hits.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
  return { counts, topPhrases }
}

// ── 10. 敘事結構級主動糾偏（StoryScope 指紋：純本地 0 Token） ──

const TELLING_EMOTION_RE = /(?:心中一動|心中一动|心頭一震|心头一震|感到一陣|感到一阵|不禁覺得|不禁觉得|心底湧起|心底涌起|湧上一股|涌上一股|意識到自己|意识到自己)/g
const DIALOGUE_SANDWICH_RE = /^[「『“"][^「」『』“”"\n]{1,120}[」』”"]\s*[^「」『』“”"\n]{3,45}[，,]\s*[「『“"]/gm
const VERB_TRIPLE_RE = /([砍看寫写抓握按推拉說说問问走跑盯壓压抽])[^，。！？\n]{1,16}[，,]\s*\1[^，。！？\n]{1,16}[，,]\s*\1[^，。！？\n]{1,18}[。！？]/g

export function analyzeTurnNarrativeFingerprint(text) {
  const src = String(text ?? '')
  if (!src.trim()) {
    return {
      flags: [],
      tidyEnding: false,
      flatPacing: false,
      tellingHeavy: false,
      dialogueSandwichCount: 0,
      verbTripleCount: 0,
    }
  }
  const health = analyzeLocalNovelHealth(src, 'full')
  const tidyEnding = (health.aphorismEndings || []).length > 0
  const flatPacing = health.paraCv !== null && health.sentCv !== null
    && health.paraCv < 0.18 && health.sentCv < 0.22

  const tellingCount = (src.match(TELLING_EMOTION_RE) || []).length
  const sensoryTypes = health.sensory
    ? Object.values(health.sensory.counts).filter((c) => c > 0).length
    : 3
  const tellingHeavy = tellingCount >= 3 && sensoryTypes <= 2

  const dialogueSandwichCount = (src.match(DIALOGUE_SANDWICH_RE) || []).length
  const verbTripleCount = (src.match(VERB_TRIPLE_RE) || []).length

  const flags = []
  if (tidyEnding) flags.push('tidy_ending')
  if (flatPacing) flags.push('flat_pacing')
  if (tellingHeavy) flags.push('telling_heavy')
  if (dialogueSandwichCount >= 2) flags.push('dialogue_sandwich')
  if (verbTripleCount >= 1) flags.push('verb_triple_parallel')

  return {
    flags,
    tidyEnding,
    flatPacing,
    tellingHeavy,
    dialogueSandwichCount,
    verbTripleCount,
  }
}
