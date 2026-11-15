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
