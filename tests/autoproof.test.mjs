import test from 'node:test'
import assert from 'node:assert/strict'
import { __test, apply, inject } from '../index.mjs'

const {
  splitSegments,
  editableParts,
  diffProtected,
  rebuildKeepingProtected,
  applyCharFixes,
  isProtectedLine,
  semanticHits,
  numberedSegments,
  detectCardScript,
  readCardStyleSpec,
  buildRewriteSystem,
  runOfflineProof,
} = __test

test('HTML 與程式碼區塊切分：巢狀 div、行內反引號、敘事標籤與 style 區塊', () => {
  const raw = [
    '他推開門，看見 `<div class="inline">示例</div>` 幾個字。',
    '<now_plot>',
    '這段是敘事標籤裡的繁體正文，有简體字应该被修。',
    '</now_plot>',
    '```js',
    'const x = "<div>not html</div>"',
    '```',
    '<div class="status"><div class="inner">简体状态栏</div><style>.a{color:red}</style></div>',
    '最後一行正文。',
  ].join('\n')

  const segs = splitSegments(raw)
  const htmlSegs = segs.filter(s => s.type === 'html')
  const codeSegs = segs.filter(s => s.type === 'code')
  assert.equal(htmlSegs.length, 1)
  assert.ok(htmlSegs[0].content.includes('<div class="status">'))
  assert.ok(htmlSegs[0].content.includes('<style>.a{color:red}</style>'))
  assert.equal(codeSegs.length, 1)
  assert.ok(codeSegs[0].content.includes('```js'))

  // Tier 1 只改 text 段，不動 html 與 code
  const out = segs.map(s => (s.type === 'text' ? applyCharFixes(s.content).text : s.content)).join('')
  assert.equal(diffProtected(raw, out), '')
  assert.ok(out.includes('简体状态栏')) // HTML 內原文不變
  assert.ok(out.includes('const x = "<div>not html</div>"')) // 程式碼塊不變
  assert.ok(out.includes('簡體字應該被修')) // 敘事標籤內正文被修復
})

test('applyCharFixes：避免誤傷人名／地支／山谷，並支援 simp 模式', () => {
  const text = '于先生與范公子丑時在山谷會面，于是谈起范围与丑陋之事。'
  const trad = applyCharFixes(text, { toScript: 'trad' })
  assert.ok(trad.text.includes('于先生'))
  assert.ok(trad.text.includes('范公子'))
  assert.ok(trad.text.includes('丑時'))
  assert.ok(trad.text.includes('山谷'))
  assert.ok(trad.text.includes('於是談起範圍與醜陋之事'))

  const simp = applyCharFixes('「這是繁體氣息與視線。」', { toScript: 'simp' })
  assert.equal(simp.text, '「这是繁体气息与视线。」')
})

test('detectCardScript 與 readCardStyleSpec：自動偵測卡字形與讀取【文風基準】', () => {
  const simpCard = {
    description: '这是一个简体中文人物卡，里面有很多简体字用来测试自动识别功能是否正常。',
    first_mes: '他走进客栈，环顾四周，然后坐下来喝茶。',
  }
  assert.equal(detectCardScript(simpCard), 'simp')

  const tradCard = {
    description: '這是一個繁體中文人物卡，裡面有很多繁體字用來測試自動識別功能是否正常。',
    character_book: {
      entries: [
        {
          comment: '【文風基準】魔道祖師',
          enabled: true,
          content: '```json\n{"dashLimit": 0.5, "maxSegments": 5}\n```\n對白簡練，少用破折號。',
        },
      ],
    },
  }
  assert.equal(detectCardScript(tradCard), 'trad')
  const spec = readCardStyleSpec(tradCard)
  assert.deepEqual(spec.limits, { dashLimit: 0.5, maxSegments: 5 })
  assert.equal(spec.styleGuide, '對白簡練，少用破折號。')
  assert.ok(buildRewriteSystem('simp').includes('統一使用簡體中文'))
  assert.ok(buildRewriteSystem('trad', spec.styleGuide).includes('對白簡練，少用破折號。'))
})

test('正則收緊與分段上限：action_inflation 不誤傷普通對稱詞，numberedSegments 遵守上限', () => {
  // 普通短句不應誤中 action_inflation
  const normal = '他看了一眼窗外，看清來人是誰後便收回視線。'
  const hitsNormal = semanticHits(normal, [], { mode: 'conservative' })
  assert.equal(hitsNormal.some(h => h.key === 'action_inflation'), false)

  // 真頂真拆解應命中
  const echo = '他點了點頭，點頭的幅度極小。'
  const hitsEcho = semanticHits(echo, [], { mode: 'conservative' })
  assert.equal(hitsEcho.some(h => h.key === 'action_inflation'), true)

  // 保護短句
  assert.equal(isProtectedLine('井底沒有底。'), true)
  assert.equal(isProtectedLine('「都別下去。」'), true)

  // 分段上限
  const manyLines = Array.from({ length: 12 }, (_, i) =>
    `第${i + 1}段：這不是誤會，而是實實在在的線索，他點了點頭，點頭的幅度極小。`
  ).join('\n')
  const segs = splitSegments(manyLines)
  const numbered = numberedSegments(segs, false, ['paired_reversal', 'action_inflation'], { mode: 'standard', maxSegments: 4 })
  assert.equal(numbered.length, 4)
})

test('runOfflineProof 與宿主生命周期：versionSignal 與 saveTurnData 去重', async () => {
  const raw = '这并不是巧合，而是早有预谋。\n<div class="bar">状态</div>'
  const offline = runOfflineProof(raw, { mode: 'standard' })
  assert.equal(offline.edited, true)
  assert.ok(offline.finalText.includes('<div class="bar">状态</div>'))
  assert.equal(diffProtected(raw, offline.finalText), '')

  assert.equal(inject.tavern.required, true)
  assert.equal(inject.llm.required, false)

  let settledHandler = null
  const savedTurnMap = new Map()
  let editCalls = 0
  const mockCtx = {
    tavern: {
      apiVersion: 7,
      gameSettings() {},
      turnSection() {},
      onTurnSettled(fn) { settledHandler = fn },
      onTimelineChanged() {},
      onGameRemoved() {},
      handle() {},
      async getGameSettings() { return { enabled: true, tier2: false, mode: 'standard', script: 'auto' } },
      async getCard() { return { description: '繁體中文設定描述與人物背景故事。' } },
      async getTurnState() { return { turn: 1 } },
      async readTurnData({ gameId, turn }) { return savedTurnMap.get(`${gameId}:${turn}`) || null },
      async saveTurnData({ gameId, turn, textVersion, data }) {
        savedTurnMap.set(`${gameId}:${turn}`, { textVersion, data })
      },
      async editTurn({ text }) {
        editCalls++
        return { textVersion: 'v2', text }
      },
    },
  }

  apply(mockCtx)
  assert.ok(settledHandler)
  await settledHandler({
    gameId: 'g-test',
    turn: 1,
    textVersion: 'v1',
    rawText: '这里的风很冷。<div class="hp">100</div>',
  })
  assert.equal(editCalls, 1)
  assert.equal(savedTurnMap.get('g-test:1')?.textVersion, 'v2')

  // 模擬重啟後同一 textVersion v2 再次進入，應從 readTurnData 命中快取而不重複寫回
  await settledHandler({
    gameId: 'g-test',
    turn: 1,
    textVersion: 'v2',
    rawText: '這裡的風很冷。<div class="hp">100</div>',
  })
  assert.equal(editCalls, 1)
})

test('v1.30 新增規則：光桿頂真、碎步動作鏈、程度副詞密度、方向回聲與 Tier1 錯字', () => {
  // 1. 光桿頂真應命中 action_inflation
  const bareSamples = [
    '在黑暗裡往上退，退到五丈上還有。',
    '拽著那線氣往一個方向偏，偏的方向是井壁。',
    '井裡的水還在往上湧。湧到井沿時，那團黑裡浮上來一隻手。',
    '堂外那條黑道上一聲喊從墻那邊傳進來，喊得氣都不順。',
  ]
  for (const s of bareSamples) {
    const hits = semanticHits(s, [], { mode: 'conservative' })
    assert.equal(hits.some(h => h.key === 'action_inflation'), true, `應命中 action_inflation: ${s}`)
  }

  // 代詞「你…你的」不應誤中光桿頂真
  const pronounSafe = '你站在隊伍裡。你的名帖還在裡面。'
  assert.equal(semanticHits(pronounSafe, [], { mode: 'conservative' }).some(h => h.key === 'action_inflation'), false)

  // 2. 碎步動作鏈（把…托起來→滑下去→舉起來）應命中 action_chain
  const chainSample = '魏無羨把那截布托起來，石子從四角滑下去，他把抹額舉起來又站住。'
  assert.equal(semanticHits(chainSample, [], { mode: 'standard' }).some(h => h.key === 'action_chain'), true)

  // 3. 程度副詞密度「得極／得很／極X」同段出現 2 次以上應命中 degree_cluster
  const degSample = '他把這幾個字念得很慢，聲音壓得極低。'
  assert.equal(semanticHits(degSample, [], { mode: 'standard' }).some(h => h.key === 'degree_cluster'), true)

  // 4. 方向介詞回聲僅在 aggressive 命中 prep_echo
  const prepSample = '另一頭往井裡去，往井裡去的那一段被水拉直了。'
  assert.equal(semanticHits(prepSample, [], { mode: 'standard' }).some(h => h.key === 'prep_echo'), false)
  assert.equal(semanticHits(prepSample, [], { mode: 'aggressive' }).some(h => h.key === 'prep_echo'), true)

  // 5. 中文敘事英文殘留應命中 stray_english
  assert.equal(semanticHits('口開到岐山Unmounted的殿前。', [], { mode: 'conservative' }).some(h => h.key === 'stray_english'), true)

  // 6. Tier 1 錯字修正：的的水 / 射日之徵
  const fixed = applyCharFixes('他擰袖口的的水，談起射日之徵。', { toScript: 'trad' })
  assert.equal(fixed.text, '他擰袖口的水，談起射日之征。')
})

test('v1.31 純本地規則：引號雙向規範、網文模板詞庫、節奏/升華尾句/六感與防幻覺守門', () => {
  const {
    normalizeQuotes,
    scanWebNovelAiTells,
    analyzeLocalNovelHealth,
    isSensitiveNsfwSegment,
    isDialogueProtectedParagraph,
    validateTier2Rewrite,
    normalizeSettings,
  } = __test

  // 1. 雙向引號規範化（繁/簡）
  const qTrad = normalizeQuotes('他說：“別動，這裡有‘秘密’。”而且他喊了"小心"。', 'trad_corner')
  assert.equal(qTrad.text, '他說：「別動，這裡有『秘密』。」而且他喊了「小心」。')
  assert.equal(normalizeQuotes(qTrad.text, 'trad_corner').converted, 0) // 冪等
  const qSimp = normalizeQuotes('他说：「别动，这里有『秘密』。」', 'simp_curly')
  assert.equal(qSimp.text, '他说：“别动，这里有‘秘密’。”')

  // 2. 網文模板詞庫與千字密度門檻
  const lexHit = scanWebNovelAiTells('他嘴角勾起，眼中閃過一絲冷意，不由自主地深吸一口氣。', 'balanced')
  assert.equal(lexHit.triggered, true)
  assert.ok(lexHit.t1Count >= 3)
  // 單次正常使用「微微」在長文中不應觸發弱化副詞過密
  const longClean = '他推開木門走進院子，桌上放著半碗涼茶。'.repeat(12) + '他微微點頭。'
  const lexClean = scanWebNovelAiTells(longClean, 'balanced')
  assert.equal(lexClean.softTriggered, false)

  // 3. 純本地節奏 CV、升華尾句與六感平衡
  const flatText = [
    '他站在門前看著夜色裡的燈火和屋簷上的影子。',
    '她坐在桌邊看著杯子裡的茶葉和窗外飄落的葉子。',
    '風吹過院子裡的青石板與牆角那棵老樹的枝椏。',
    '他低下頭看著地面上被拉長的影子與微弱的燈光。',
    '這一刻，他終於明白命運的齒輪早已悄悄轉動。',
  ].join('\n')
  const health = analyzeLocalNovelHealth(flatText, 'full')
  assert.ok(health.aphorismEndings.length >= 1)
  assert.ok(health.sensory && health.sensory.counts['視覺'] > 0)

  // 4. NSFW 安全分流與對話保護區
  assert.equal(isSensitiveNsfwSegment('他的手指撫過她滾燙的乳頭與濕潤的花穴，低聲喘息。'), true)
  assert.equal(isSensitiveNsfwSegment('他走到窗邊看著遠處的山嵐，把茶杯放回桌上。'), false)
  assert.equal(isDialogueProtectedParagraph('「喂，別亂動啊你！」'), true)
  assert.equal(isDialogueProtectedParagraph('他走到門邊把門鎖上，回頭看著桌上那封信。'), false)

  // 5. 防幻覺與數字等價守門員
  assert.equal(validateTier2Rewrite('他走了三百步，花了二兩銀子。', '他走了300步，花了2兩銀子。', 'strict').ok, true)
  assert.equal(validateTier2Rewrite('他走了三百步，花了二兩銀子。', '他走了500步，花了2兩銀子。', 'strict').ok, false)
  assert.equal(
    validateTier2Rewrite('他點點頭把門關上。', '他嘴角勾起，眼中閃過一絲冷意，心中一動把門關上。', 'strict').reason,
    'introduced-ai-tells'
  )

  // 6. 設定檔位正規化 + 深度美學 Prompt
  const cfg = normalizeSettings({ nsfwRouting: 'invalid_val', aiLexiconLevel: 'strict', historyWindow: 99 })
  assert.equal(cfg.nsfwRouting, 'bypass_local')
  assert.equal(cfg.aiLexiconLevel, 'strict')
  assert.equal(cfg.historyWindow, 12)
  assert.ok(buildRewriteSystem('trad', '', 'deep').includes('替換不複用'))
})
