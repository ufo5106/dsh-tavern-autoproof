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
    _disableLog: true,
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
  const cfg = normalizeSettings({ nsfwRouting: 'invalid_val', tier2Route: 'tool_then_text', aiLexiconLevel: 'strict', historyWindow: 99 })
  assert.equal(cfg.nsfwRouting, 'bypass_local')
  assert.equal(cfg.tier2Route, 'tool_then_text')
  assert.equal(normalizeSettings({ tier2Route: 'unknown' }).tier2Route, 'text')
  assert.equal(cfg.aiLexiconLevel, 'strict')
  assert.equal(cfg.historyWindow, 12)
  assert.ok(buildRewriteSystem('trad', '', 'deep').includes('替換不複用'))
})

test('v1.33 品質強化：精準定位、動態對照範例、Best-of-N 評分、動作冷卻池與 StoryScope 結構糾偏', () => {
  const {
    locateParagraphIssues,
    pickContrastiveExemplars,
    scoreRewriteCandidate,
    extractTurnMicroActions,
    analyzeTurnNarrativeFingerprint,
    buildTurnConstraintHint,
    normalizeSettings,
  } = __test

  // 1. 精準病灶定位：對話保護區啟用時不應誤抓台詞內的詞
  const para = '「你別再嘴角勾起冷笑了！」他眼中閃過一絲寒意，進行了細緻的觀察。'
  const spansProtected = locateParagraphIssues(para, ['local_webnovel_lexicon'], { protectDialogue: true })
  assert.equal(spansProtected.includes('嘴角勾起'), false)
  assert.equal(spansProtected.includes('眼中閃過'), true)
  assert.ok(spansProtected.some(s => s.includes('進行了細緻的觀察')))

  // 2. 動態正反面極簡對照範例（依命中按需抽取，支援繁簡）
  const exTrad = pickContrastiveExemplars(['action_inflation', 'paired_reversal', 'reduplication_cluster'], { toScript: 'trad', maxItems: 2 })
  assert.equal(exTrad.length, 2)
  assert.ok(exTrad[0].includes('點了點頭'))
  const exSimp = pickContrastiveExemplars(['paired_reversal'], { toScript: 'simp', maxItems: 2 })
  assert.ok(exSimp[0].includes('改为'))

  // 3. Best-of-N 本地確定性評分器：真修復勝過照抄，幻覺數字直接判 -Infinity
  const orig = '他嘴角勾起，眼中閃過一絲冷意，走過去拿起茶杯。'
  const lazyCopy = orig
  const goodFix = '他扯了扯嘴角，走過去端起茶杯。'
  const hallucinatedNum = '他扯了扯嘴角，拿起了300個茶杯。'
  assert.ok(scoreRewriteCandidate(orig, goodFix, 'strict').score > scoreRewriteCandidate(orig, lazyCopy, 'strict').score)
  assert.equal(scoreRewriteCandidate(orig, hallucinatedNum, 'strict').ok, false)

  // 4. 跨輪微動作提取（忽略純對話行）
  const micro = extractTurnMicroActions('「嘴角勾起什麼？」\n他喉結滾動了一下，呼吸一滯。')
  assert.equal(micro.counts['嘴角勾起'], undefined)
  assert.equal(micro.counts['喉結滾動'], 1)
  assert.equal(micro.counts['呼吸一滯'], 1)

  // 5. StoryScope 敘事結構指紋與統一生成前提醒
  const fp = analyzeTurnNarrativeFingerprint('他推開門看了一眼。\n那一刻，他終於明白命運的齒輪已經開始轉動。')
  assert.equal(fp.tidyEnding, true)
  assert.ok(fp.flags.includes('tidy_ending'))

  const hint = buildTurnConstraintHint(['paired_reversal'], 'standard', {
    cooldownWords: ['喉結滾動', '呼吸一滯'],
    structuralFlags: ['tidy_ending'],
  })
  assert.ok(hint.includes('喉結滾動、呼吸一滯'))
  assert.ok(hint.includes('心理頓悟／說教總結'))

  // 6. 新設定正規化
  const s = normalizeSettings({ bestOfN: 'smart_2', cooldownPool: 'report', narrativeSteering: 'invalid' })
  assert.equal(s.bestOfN, 'smart_2')
  assert.equal(s.cooldownPool, 'report')
  assert.equal(s.narrativeSteering, 'inject')

  // 7. 簡繁詞組補齊（嘴里/喉嚨里/耳朵里/杯里/隊里/帶着/壓着/团/一分鍾/通道里/半形逗號）＋ 去除寫死古風人名例句
  const phraseOut = applyCharFixes('她嘴里含着水，耳朵里塞著耳機，杯里是溫水，隊里抓成一团，一分鍾後在通道里低頭,便笑了。', { enablePhrases: true, toScript: 'trad' })
  assert.equal(phraseOut.text, '她嘴裡含著水，耳朵裡塞著耳機，杯裡是溫水，隊裡抓成一團，一分鐘後在通道裡低頭，便笑了。')
  const sysPrompt = buildRewriteSystem('trad', '', 'deep')
  assert.equal(sysPrompt.includes('藍曦臣'), false)
  assert.equal(sysPrompt.includes('景儀'), false)

  // 8. 三明治對話模板與動詞三連排比偵測＋提醒
  const swText = [
    '「你砍袁柏清那兩步，砍許斌的背，砍王不留行出來救人的那一下。」',
    '「他收手那件事我哥也幹過。」她說話很平，手卻把帽衫抓成一團，「我哥那兩場我都在場邊。」',
    '「我在樓下翻了半小時舊檔案。」她把照片一張張攤開，「這上面是方士謙。」',
  ].join('\n')
  const swFp = analyzeTurnNarrativeFingerprint(swText)
  assert.ok(swFp.dialogueSandwichCount >= 2)
  assert.ok(swFp.verbTripleCount >= 1)
  assert.ok(swFp.flags.includes('dialogue_sandwich'))
  assert.ok(swFp.flags.includes('verb_triple_parallel'))
  const swHint = buildTurnConstraintHint([], 'standard', { structuralFlags: swFp.flags })
  assert.ok(swHint.includes('三明治格式'))
  assert.ok(swHint.includes('三連排比'))
})

test('v1.35 無微調品質提升：實體名詞鎖、角色知識與台詞邊界門、正面文風卡與口頭取樣', async () => {
  const {
    parseCustomEntityRules,
    extractCardOmissionLocks,
    applyEntityLocks,
    detectInfoDumpDialogue,
    buildTurnConstraintHint,
    normalizeSettings,
  } = __test

  // 1. 自訂實體映射表解析（支援 = / -> / =>，過濾單字與註解）
  const customRules = parseCustomEntityRules('# comment\n亞里斯多=亞里斯多德\n黑森林谷->黑森林山谷\n銀月騎士=>銀月騎士團\n壞=好\n林深=林深')
  assert.equal(customRules.length, 3)
  assert.equal(customRules[0].from, '亞里斯多')
  assert.equal(customRules[0].to, '亞里斯多德')
  assert.equal(customRules[2].to, '銀月騎士團')

  // 2. 角色卡專有名詞自動缺字鎖（支援 card.name／keys／括號詞彙，僅鎖 4~6 字詞且跳過卡片內已存在的近似詞）
  const autoLocks = extractCardOmissionLocks({
    name: '阿爾托莉雅',
    description: '林深與林淺相識，守衛著『聖殿騎士團』的古塔。',
    character_book: { entries: [{ keys: ['翡翠高塔'], content: '『翡翠高塔』位於北境。' }] },
  })
  assert.ok(autoLocks.some((r) => r.from === '阿爾莉雅' && r.to === '阿爾托莉雅'))
  assert.ok(autoLocks.some((r) => r.from === '聖殿士團' && r.to === '聖殿騎士團'))
  assert.ok(autoLocks.some((r) => r.from === '翡翠塔' && r.to === '翡翠高塔'))
  // 2 字近似雙名不應互相替換
  assert.equal(autoLocks.some((r) => r.from === '林淺' || r.to === '林淺'), false)

  const locked = applyEntityLocks('亞里斯多走在翡翠塔下，問銀月騎士與銀月騎士團的聖殿士團在哪。', [...customRules, ...autoLocks])
  assert.equal(locked.total, 4)
  assert.equal(locked.text, '亞里斯多德走在翡翠高塔下，問銀月騎士團與銀月騎士團的聖殿騎士團在哪。')

  // 3. 角色知識與台詞邊界門（通用多題材：歷史／奇幻／校園設定科普對話偵測）
  const dumpHitFantasy = detectInfoDumpDialogue('「這座組織三百年前就創立了，按照這裡的規矩只有長老能進內殿。」他平靜地說。')
  assert.equal(dumpHitFantasy.count, 1)
  const dumpHitCampus = detectInfoDumpDialogue('「全校都知道他當年其實在1998年創立這個社團時就定下規矩。」')
  assert.equal(dumpHitCampus.count, 1)
  const cleanHit = detectInfoDumpDialogue('「門鎖還沒換，今晚別走正門。」\n「收到，我在後巷等。」')
  assert.equal(cleanHit.count, 0)

  // 4. 正面文風卡、口頭取樣與邊界門獨立注入 buildTurnConstraintHint（即使無違規也要生成）
  const styleHint = buildTurnConstraintHint([], 'standard', {
    utteranceGateActive: true,
    styleCardText: '人物多用動詞與短句推進，對話直給當下反應。',
    verbalizedSampling: true,
  })
  assert.ok(styleHint.includes('【正面文風參考（Style Card）】'))
  assert.ok(styleHint.includes('人物多用動詞與短句推進'))
  assert.ok(styleHint.includes('【知而不言邊界】'))
  assert.ok(styleHint.includes('Verbalized Sampling'))

  // 5. v1.35 新增設定正規化
  const s35 = normalizeSettings({
    entityLockMode: 'off',
    customEntityFixes: '亞里斯多=亞里斯多德',
    utteranceGate: 'always',
    styleCardEnabled: true,
    styleCardText: '白描短句為主',
    verbalizedSampling: true,
  })
  assert.equal(s35.entityLockMode, 'off')
  assert.equal(s35.customEntityFixes, '亞里斯多=亞里斯多德')
  assert.equal(s35.utteranceGate, 'always')
  assert.equal(s35.styleCardEnabled, true)
  assert.equal(s35.styleCardText, '白描短句為主')
  assert.equal(s35.verbalizedSampling, true)

  // 6. 整本小說分層採樣與客觀語言指紋統計
  const { analyzeAndSampleNovel } = __test
  const chapters = []
  for (let c = 1; c <= 40; c++) {
    chapters.push(`第${c}章 路上`)
    for (let p = 0; p < 8; p++) {
      chapters.push('「把燈關掉。」他把鑰匙扔上桌面。')
      chapters.push('「太亮了睡不著。」門外雨聲不大，屋檐偶爾滴下一串水珠。')
    }
  }
  const bigBook = chapters.join('\n')
  const sampledBook = analyzeAndSampleNovel(bigBook, { maxTotalChars: 3600, sliceCount: 5 })
  assert.ok(sampledBook.totalChars > 10000)
  assert.ok(sampledBook.statsSummary.includes('對話行佔比'))
  assert.ok(sampledBook.statsSummary.includes('平均句長'))
  assert.equal(sampledBook.sliceCount, 5)
  assert.ok(sampledBook.excerpt.includes('採樣片段 1'))
  assert.ok(sampledBook.excerpt.includes('採樣片段 5'))
  assert.equal(sampledBook.excerpt.includes('第1章 路上'), false)

  // 7. 報告面板 features 與生成前注入紀錄完整回報（端對端模擬）
  let turnSectionFn = null
  let settledFn = null
  const handlers = new Map()
  const mockCtx2 = {
    _disableLog: true,
    llm: {
      async prepareCall() {
        return {
          config: {},
          async *stream() {
            yield { type: 'text-delta', text: '叙述节奏明快，短句收束干脆，"动作"描写克制。' }
          },
        }
      },
    },
    tavern: {
      apiVersion: 7,
      gameSettings() {},
      turnSection(spec) { turnSectionFn = spec.text },
      onTurnSettled(fn) { settledFn = fn },
      onTimelineChanged() {},
      onGameRemoved() {},
      handle(name, fn) { handlers.set(name, fn) },
      async backgroundModel() { return { provider: 'mock', model: 'mock-flash' } },
      async getGameSettings() { return { enabled: true, tier2: false, mode: 'standard', script: 'auto' } },
      async getCard() { return { name: '聖殿騎士團', description: '『聖殿騎士團』成立多年。' } },
      async getTurnState() { return { turn: 1 } },
      async readTurnData() { return null },
      async saveTurnData() {},
      async editTurn({ text }) { return { textVersion: 'v2', text } },
    },
  }
  apply(mockCtx2)
  await handlers.get('dsh-tavern-autoproof/save-settings')({
    gameId: 'g-rpt',
    scope: 'game',
    settings: {
      styleCardEnabled: true,
      styleCardText: '對話簡短有力，動作只寫結果。',
      verbalizedSampling: true,
      customEntityFixes: '亞里斯多=亞里斯多德',
      tier2: false,
    },
  })
  const injected = await turnSectionFn({ gameId: 'g-rpt' })
  assert.ok(injected.includes('正面文風參考'))
  assert.ok(injected.includes('Verbalized Sampling'))
  await settledFn({
    gameId: 'g-rpt',
    turn: 1,
    textVersion: 'v1',
    rawText: '亞里斯多看著聖殿士團說：「這座組織三百年前就創立了，按照這裡的規矩只有長老能進。」',
  })
  const rpt = await handlers.get('dsh-tavern-autoproof/report')({ gameId: 'g-rpt', turn: 1 })
  assert.equal(rpt.features.styleCardGenUsed, true)
  assert.equal(rpt.features.verbalizedSampling, true)
  assert.equal(rpt.features.entityLockTotal, 2)
  assert.equal(rpt.features.entityLockDetail.length, 2)
  assert.equal(rpt.features.infoDumpCount, 1)
  assert.equal(rpt.features.styleCardChars > 0, true)

  // 8. 萃取正面文風卡自動對齊卡面繁簡並清理引號；冷卻池命中擴充微動作
  const extRes = await handlers.get('dsh-tavern-autoproof/extract-style')({
    gameId: 'g-rpt',
    sampleText: '夜色微涼，他站定看了一會兒街角，推開木門走了進去。'.repeat(3),
  })
  assert.equal(extRes.ok, true)
  assert.equal(extRes.toScript, 'trad')
  assert.ok(extRes.styleCard.includes('敘述節奏明快'))
  assert.ok(extRes.styleCard.includes('「動作」'))

  const micro2 = __test.extractTurnMicroActions('他挑了挑眉，抿了抿唇，眸色一暗。')
  assert.equal(micro2.counts['挑了挑眉'], 1)
  assert.equal(micro2.counts['抿了抿唇'], 1)
  assert.equal(micro2.counts['眸色一暗'], 1)

  // 9. 智能對白保護區：保留簡短自然口癖，但放行翻譯腔／三明治／長說教對白給 Tier 2
  const { isDialogueProtectedParagraph, analyzeDialogueAiFlavor, locateParagraphIssues, numberedSegments } = __test
  assert.equal(normalizeSettings({ protectDialogue: true }).protectDialogue, 'smart')
  assert.equal(normalizeSettings({ protectDialogue: false }).protectDialogue, 'off')
  assert.equal(normalizeSettings({ protectDialogue: 'strict' }).protectDialogue, 'strict')

  assert.equal(isDialogueProtectedParagraph('「我不擦！」', 'smart'), true)
  assert.equal(isDialogueProtectedParagraph('「你必須明白，我們別無選擇。」', 'smart'), false)
  assert.equal(isDialogueProtectedParagraph('「你必須明白，我們別無選擇。」', 'strict'), true)
  assert.equal(isDialogueProtectedParagraph('「那件事過去了。」她說話很平，手卻攥緊了袖口，「別再提了。」', 'smart'), false)

  const dlgFlavor = analyzeDialogueAiFlavor('「不是因為怕，而是你必須明白我們別無選擇。」')
  assert.equal(dlgFlavor.hasAiFlavor, true)
  assert.ok(dlgFlavor.reasons.includes('dialogue_antithesis'))
  assert.ok(dlgFlavor.reasons.includes('dialogue_translationese'))

  const smartSpans = locateParagraphIssues('「不是因為怕，而是我們別無選擇。」他點頭走了。', ['dialogue_ai_tone'], { protectDialogue: 'smart' })
  assert.ok(smartSpans.some((s) => s.startsWith('[對白AI腔]')))

  // 10. 隱性格言對舉（不X了。我Y。／V的是A。V的是B。／錯在你以為）、機械遞進與無意義複位動作偵測
  const subtleAiText = '「我明天不畫線條了。我畫人。」「學的是死招。他打的是人。」「沒錯，錯在你以為只有八道。」「把那八個圈重畫。第九個我明天來要。」她把手套摘下來，又套回去。'
  const subtleFlavor = analyzeDialogueAiFlavor(subtleAiText)
  assert.equal(subtleFlavor.hasAiFlavor, true)
  assert.ok(subtleFlavor.reasons.includes('dialogue_implicit_contrast'))
  assert.ok(subtleFlavor.reasons.includes('dialogue_mechanical_enum'))
  assert.ok(subtleFlavor.reasons.includes('fidget_reverse_loop'))
  const subtleSpans = locateParagraphIssues(subtleAiText, ['dialogue_ai_tone'], { protectDialogue: 'smart' })
  assert.ok(subtleSpans.some((s) => s.includes('摘下來，又套回去')))
  assert.ok(subtleSpans.some((s) => s.includes('不畫線條了')))

  const segList = numberedSegments(
    splitSegments('「我不擦！」\n「你必須明白，這不是逃避，而是我們別無選擇。」'),
    false,
    [],
    { mode: 'standard' }
  )
  assert.equal(segList.length, 1)
  assert.ok(segList[0].findings.includes('dialogue_ai_tone'))

  // 11. Anti-lazy-copy 防偷懶照抄重試：模型第一次原句照搬已確診 AI 腔時自動糾偏重試
  let tier2CallCount = 0
  let writtenText = ''
  const lazyHandlers = new Map()
  const mockCtxLazy = {
    _disableLog: true,
    llm: {
      async prepareCall() {
        return {
          config: {},
          async *stream() {
            tier2CallCount += 1
            if (tier2CallCount === 1) {
              // 第一次模擬模型偷懶原句照抄
              yield { type: 'text-delta', text: '「不畫線條了。我畫人。」她把手套摘下來，又套回去，慢慢坐在椅子上。' }
            } else {
              // 收到強制改寫通知後實質去 AI 味
              yield { type: 'text-delta', text: '「不光背那些線了，看人吧。」她摘下手套擱到一邊，慢慢坐在椅子上。' }
            }
          },
        }
      },
    },
    tavern: {
      apiVersion: 7,
      gameSettings() {},
      turnSection() {},
      onTurnSettled() {},
      onTimelineChanged() {},
      onGameRemoved() {},
      handle(name, fn) { lazyHandlers.set(name, fn) },
      async backgroundModel() { return { provider: 'mock', model: 'mock-flash' } },
      async getGameSettings() { return { enabled: true, tier2: true, tier2Route: 'text', protectDialogue: 'smart', mode: 'standard', script: 'trad' } },
      async getCard() { return { name: '林深', description: '現代故事。' } },
      async getTurnState() { return { turn: 5 } },
      async getTurn() {
        return {
          turn: 5,
          textVersion: 'v1',
          rawText: '「不畫線條了。我畫人。」她把手套摘下來，又套回去，慢慢坐在椅子上。',
        }
      },
      async readTurnData() { return null },
      async saveTurnData() {},
      async editTurn({ text }) {
        writtenText = text
        return { textVersion: 'v2', text }
      },
    },
  }
  apply(mockCtxLazy)
  const rptLazy = await lazyHandlers.get('dsh-tavern-autoproof/proof')({ gameId: 'g-lazy', turn: 5 })
  assert.equal(tier2CallCount, 2)
  assert.equal(rptLazy.writeOk, true)
  assert.equal(rptLazy.tier2.lazyRetries, 1)
  assert.ok(rptLazy.tier2.spansFixed >= 2)
  assert.ok(writtenText.includes('不光背那些線了'))
})

test('v1.36 移植強化：白名單掩碼、寫作範例輪轉、動態意象冷卻、碎句稀釋、多角色語言基因卡與語病形近字守門', async () => {
  const {
    WHITELIST_MASK_CHAR,
    parseWhitelistLines,
    maskWhitelistSpans,
    extractDynamicImagery,
    analyzeLocalNovelHealth,
    extractStyleAnchorsFromText,
    rotateSampleAnchors,
    buildTurnConstraintHint,
    parseCharacterVoices,
    clauseHits,
    checkVoiceConsistency,
    formatVoiceInjectionBlock,
    CONFUSABLE_CHARS,
    calcBigramJaccard,
    validateTier2Rewrite,
    findSpeechObjDefects,
  } = __test

  // 1. 文風白名單等長掩碼（僅影響掃描文字，不動 seg.content 原文）
  const wl = parseWhitelistLines('# 註釋忽略\n這不是錯，而是執念。\n太宰治')
  assert.equal(wl.length, 2)
  const wlRaw = '太宰治站在廊下，這不是錯，而是執念。\n空氣彷彿凝固了一瞬，這不是逃避，而是無奈。'
  const masked = maskWhitelistSpans(wlRaw, wl)
  assert.ok(masked.maskedSpans.length >= 2)
  assert.equal(masked.text.length, wlRaw.length)
  assert.ok(masked.text.includes(WHITELIST_MASK_CHAR))
  assert.ok(masked.text.includes('這不是逃避，而是無奈'))

  const wlSegs = numberedSegments(splitSegments(wlRaw), false, [], {
    mode: 'standard',
    whitelist: wl,
  })
  assert.equal(wlSegs.length, 1)
  assert.ok(wlSegs[0].content.includes('這不是逃避'))
  assert.ok(!wlSegs[0].content.includes(WHITELIST_MASK_CHAR), 'seg.content 必須保留乾淨原文')

  // 2. 寫作範例萃取與確定性輪轉庫 + buildTurnConstraintHint
  const sampleNovel = [
    '傍晚的雨順著青瓦檐口砸下來，濺濕了階前的半截石獅。他把油紙傘收攏在腋下，只露出半張被寒氣凍得發青的側臉，垂眸盯著門縫裡透出的那點昏黃燈火。',
    '「你倒還敢上門。」屋裡頭炭盆啪地炸開一星火星，老掌櫃沒抬眼皮，手裡的算盤珠子卻停住了，「當年那筆賬，可不是三兩句話就能抹平的。」',
    '巷口那盞白紗燈在風裡晃得厲害，影子被拉長又猛地縮回去。他沒接話，只是伸手解開了領口的盤扣，從懷裡摸出一枚缺了角的銅錢拍在櫃檯上。',
    '街對面的茶樓早已打烊，二樓木窗卻悄悄支起一道縫隙。灰布衫的年輕人倚在欄杆後頭，指節輕輕叩著窗沿，把樓下兩人的來去看得一清二楚。',
    '夜深了，打更的梆子聲剛從西市繞過來，穿過潮濕的石板巷道。那隻黑貓從矮牆上一躍而下，踩過積水卻半點聲響也沒驚動。',
    '「把門插上。」她吹熄桌上的蠟燭，只留牆角一線冷白的月光斜斜照進來，「今夜無論誰敲門，都別開。」',
  ].join('\n\n')
  const anchors = extractStyleAnchorsFromText(sampleNovel, { maxAnchors: 6 })
  assert.ok(anchors.length >= 4 && anchors.length <= 6)
  const anchorsText = anchors.join('\n---\n')
  const r0 = rotateSampleAnchors(anchorsText, { offset: 0, limit: 2 })
  const r1 = rotateSampleAnchors(anchorsText, { offset: 1, limit: 2 })
  assert.equal(r0.selected.length, 2)
  assert.equal(r1.selected.length, 2)
  assert.notEqual(r0.selected[0], r1.selected[0])

  const hintText = buildTurnConstraintHint(['paired_reversal'], 'standard', {
    sampleAnchors: r0.selected,
    voiceBlock: '【多角色語言基因錨定（嚴防千人一腔）】\n- 陳默｜習慣口癖：……隨便。',
    structuralFlags: ['telegraph_short_paras'],
    cooldownWords: ['琥珀', '漣漪'],
    styleCardText: '白描冷峻',
  })
  assert.ok(hintText.includes('【寫作範例輪轉'))
  assert.ok(hintText.includes('【多角色語言基因錨定'))
  assert.ok(hintText.includes('碎句電報體'))
  assert.ok(hintText.includes('琥珀'))

  // 3. 動態無詞表高頻意象 + 碎句／稀釋體檢
  const repeatedImageryText = [
    '月光落在青銅鐘上，青銅鐘發出低鳴，斑駁銅綠與青銅鐘一起沉在井底深處，冰冷石磚滲出細密水氣。',
    '老宅廊簷掛著兩盞風燈，風聲沿著青石階一路往裡灌，整座院子靜得能聽見竹葉摩擦石壁。',
    '「你別說話！」他喊道，「青銅鐘又響了！」',
    '風穿過長廊，窗欞上的薄霜一點點化開，窗欞外全是雪，夜色壓低了整片屋瓦與遠處枯樹的輪廓。',
  ].join('\n')
  const dynImg = extractDynamicImagery(repeatedImageryText, { minCount: 2, limit: 8 })
  assert.ok(Object.keys(dynImg).some((t) => t.includes('青銅')), '應捕獲重複出現的敘事意象')

  const shortLines = Array.from({ length: 14 }, (_, i) => `他安靜地站在台階前看著細雨滴落，第${i + 1}次抬起頭。`).join('\n')
  const health = analyzeLocalNovelHealth(shortLines, 'full')
  assert.equal(health.oneSentenceParas.triggered, true)
  assert.ok(health.oneSentenceParas.ratio >= 0.45)
  assert.ok(health.dilution && typeof health.dilution.dePerSent === 'number')

  // 4. 多角色語言基因卡：子句邊界匹配（不誤判「坐在下手」）+ 禁忌與口癖檢查
  const profiles = parseCharacterVoices([
    '陳默 | tics: 隨便, 這不合規 | taboo: 寶貝, 在下',
    '沈念 | tics: 你猜呢 | taboo: 老子 | tone: 笑裡藏刀',
  ].join('\n'))
  assert.equal(profiles.length, 2)
  assert.equal(clauseHits('他坐在下手位置上喝茶。', '在下').length, 0, '詞中子字串不應誤判為詞彙「在下」')
  assert.ok(clauseHits('「在下陳默，見過姑娘。」', '在下').length >= 1)

  const voiceCheck = checkVoiceConsistency(
    '陳默：「寶貝，在下這次可幫不了你。」\n沈念笑道：「你猜呢。」',
    profiles
  )
  assert.ok(voiceCheck.tabooHits.some((h) => h.name === '陳默' && h.phrase === '寶貝'))
  assert.ok(voiceCheck.tabooHits.some((h) => h.name === '陳默' && h.phrase === '在下'))
  const voiceBlock = formatVoiceInjectionBlock(profiles)
  assert.ok(voiceBlock.includes('陳默'))
  assert.ok(voiceBlock.includes('沈念'))

  // 5. 高危形近字守衛 + Jaccard 相似度下限 + 言說動詞賓語語病
  assert.ok(CONFUSABLE_CHARS.includes('戍'))
  assert.ok(calcBigramJaccard('門外的風吹進來', '門外的風吹進來') === 1)
  const confusableCheck = validateTier2Rewrite('他派兵去戊守邊境。', '他派兵去戍守邊境。', 'strict')
  assert.equal(confusableCheck.ok, false)
  assert.ok(confusableCheck.reason.startsWith('confusable-char:'))

  const lowSimCheck = validateTier2Rewrite(
    '他推開腐朽的木門走進雨夜裡尋找那枚失蹤多年的舊懷錶，腳步踩在青石板上發出清脆迴響。',
    '今天天空放晴了，大家決定一起坐在草地上開心地分食大西瓜與冰鎮汽水，笑聲不斷。',
    'strict'
  )
  assert.equal(lowSimCheck.ok, false)
  assert.ok(lowSimCheck.reason.startsWith('low-similarity:'))

  const speechBad = findSpeechObjDefects('他急得把自己家那口大黑鐵鍋喊了半條街，鄰居全都出來看。')
  assert.ok(speechBad.length >= 1, '應檢出言說動詞接長非語言賓語的語病')
  const speechOk = findSpeechObjDefects('她把他喊了回來，遞給他一杯熱茶。')
  assert.equal(speechOk.length, 0)

  // 6. extract-style 同步萃取文風卡 + 寫作範例輪轉 + 多角色語言基因卡 + proofTurn 整合驗證（mock 環境 + _disableLog）
  const handlers = new Map()
  let savedTurnData = null
  let turnSectionSpec = null
  const mockCtxV136 = {
    _disableLog: true,
    llm: {
      async prepareCall() {
        return {
          config: {},
          async *stream() {
            yield {
              type: 'text-delta',
              text: [
                '===STYLE_CARD===',
                '人物冷峻寫實、善用感官白描、短句收束節奏。',
                '===CHARACTER_VOICES===',
                '- 老掌柜 | 语气=简短干脆、爱算旧账 | 口头禅=这笔账,且慢 | 绝不说=宝贝,我们别无选择',
                '2. 陈默 | 语氣=少話冷靜、點到為止 | 絕不說=令人震撼',
              ].join('\n'),
            }
          },
        }
      },
    },
    tavern: {
      apiVersion: 7,
      gameSettings() {},
      turnSection(spec) { turnSectionSpec = spec },
      onTurnSettled() {},
      onTimelineChanged() {},
      onGameRemoved() {},
      handle(name, fn) { handlers.set(name, fn) },
      async backgroundModel() { return { provider: 'mock', model: 'mock-flash' } },
      async getGameSettings() {
        return {
          enabled: true,
          tier2: false,
          mode: 'standard',
          script: 'trad',
          styleWhitelist: '這不是錯，這是執念。',
          sampleAnchorsEnabled: true,
          sampleAnchorsText: anchorsText,
          characterVoices: '陳默 | tics: 隨便 | taboo: 寶貝',
        }
      },
      async getCard() { return { name: '陳默', description: '原創故事。' } },
      async getTurnState() { return { turn: 7 } },
      async getTurn() {
        return {
          turn: 7,
          textVersion: 'v1',
          rawText: '陳默：「寶貝。」這不是錯，這是執念。風裡全是焦味。',
        }
      },
      async readTurnData() { return savedTurnData },
      async saveTurnData(_g, _k, val) { savedTurnData = val },
      async editTurn({ text }) { return { textVersion: 'v2', text } },
    },
  }
  apply(mockCtxV136)

  const extRes = await handlers.get('dsh-tavern-autoproof/extract-style')({
    gameId: 'g-v136',
    sampleText: sampleNovel,
  })
  assert.equal(extRes.ok, true)
  assert.ok(extRes.styleCard.includes('感官白描'))
  assert.ok(extRes.anchorsCount >= 4)
  assert.ok(extRes.anchorsText.includes('---'))
  assert.equal(extRes.characterVoicesCount, 2)
  assert.ok(extRes.characterVoicesText.includes('老掌櫃'))
  assert.ok(extRes.characterVoicesText.includes('陳默'))
  assert.ok(!extRes.characterVoicesText.includes('==='))

  const secText = await turnSectionSpec.text({ gameId: 'g-v136', turn: 8 })
  assert.ok(secText && secText.includes('【寫作範例輪轉'))
  assert.ok(secText.includes('【多角色語言基因錨定'))

  const proofRpt = await handlers.get('dsh-tavern-autoproof/proof')({ gameId: 'g-v136', turn: 7 })
  assert.equal(proofRpt.turn, 7)
  assert.ok(proofRpt.features)
  assert.ok(proofRpt.features.whitelistMaskedChars > 0)
  assert.ok(proofRpt.features.voiceTabooHits.length >= 1)
  assert.equal(proofRpt.features.sampleAnchorsGenUsed, 2)
})

test('v1.37 深化借鑑：同構句拍、翻譯腔與廢話無損預清理、AI 味濃度抵銷、模型家族適配與承諾/防退化/跨段去重護欄', async () => {
  const {
    analyze,
    scanWindowClusters,
    scanSyntaxAndTranslationese,
    calcSentenceIsomorphism,
    detectListLikePrefixRun,
    estimateBigramMtld,
    detectSynonymSwaps,
    countParagraphCohesionChain,
    detectEmbodiedOverload,
    preCleanNarrativeFillers,
    calcAiConcentration,
    detectModelFamily,
    checkAddressConsistency,
    validateTier2Rewrite,
    scoreRewriteCandidate,
    hasGenuineImperfection,
    isDialogueProtectedParagraph,
  } = __test

  // 1. 頓號 3 項修正 + 句法翻譯腔／膨脹動詞殼（排除口語「的時候」）
  assert.ok(analyze('桌上有茶壺、油燈、銅錢三樣物件。').metrics.dunhaoTriples >= 1)
  const transDiag = scanSyntaxAndTranslationese('當他走進屋時，對於她而言，兩人進行了討論並以一種生硬的方式坐下。')
  assert.ok(transDiag.total >= 4)
  assert.ok(transDiag.paddingVerbs >= 1)
  const spokenDiag = scanSyntaxAndTranslationese('走的時候他順手把門帶上。')
  assert.equal(spokenDiag.counts.when_clause || 0, 0)

  // 2. 200字滑窗集群 + 結構同構 + 連續同開頭列表感
  const winHit = scanWindowClusters('他緩緩走近，微微抬眼，輕輕抿唇，淡淡笑著點頭。', ['緩緩', '微微', '輕輕', '淡淡'], 200, 3)
  assert.ok(winHit.maxInWindow >= 4)

  const isoText = '他伸手推開木門，轉身望向院內。她端起桌邊茶盞，緩慢低下視線。他收緊手指關節，依舊沉默不語。'
  const isoRes = calcSentenceIsomorphism(isoText)
  assert.ok(isoRes.pairCount >= 1 && isoRes.tripleCount >= 1)

  const listRes = detectListLikePrefixRun('他把茶杯放到桌上。他把油燈撥亮幾分。他把窗戶栓緊不再說話。')
  assert.ok(listRes.runs.length >= 1 && listRes.runs[0].prefix === '他把')

  // 3. MTLD、同段刻意換詞、過度平滑銜接、過度生理渲染
  const mtldVal = estimateBigramMtld('青石巷口落了層薄霜，他拎著半壺冷茶沿牆根走過，屋瓦上幾隻灰雀驚飛起來，拐進西邊狹窄木門後面去。'.repeat(2))
  assert.ok(typeof mtldVal === 'number' && mtldVal > 10)
  const swapRes = detectSynonymSwaps('他看了一眼屋角，又悄悄盯住那扇半掩的木門，眼神一路凝視過去還順便打量著門鎖。'.repeat(2))
  assert.ok(swapRes.windowCount >= 1)
  const cohRes = countParagraphCohesionChain(['第一幕。\n於是他走出去。\n然而沒人應門。\n這時風吹過來。\n所以他回頭。\n緊接著燈亮了。\n因此門開了。'].join('\n'))
  assert.ok(cohRes.maxChain >= 6)
  const embRes = detectEmbodiedOverload('他心跳漏一拍，呼吸一滯，喉結滾動著冷汗直流，連胃裡一沉、脊背發涼。')
  assert.equal(embRes.overloaded, true)

  // 4. 非對白廢話無損預清理（不觸碰對白與白名單）
  const pcRes = preCleanNarrativeFillers('不可否認的是，風越吹越大。\n「值得一提的是，這句在對白裡要保留。」\n顯而易見的是，門沒鎖。', {
    whitelist: ['顯而易見的是，門沒鎖。'],
  })
  assert.equal(pcRes.count, 1)
  assert.ok(pcRes.text.startsWith('風越吹越大。'))
  assert.ok(pcRes.text.includes('「值得一提的是，這句在對白裡要保留。」'))
  assert.ok(pcRes.text.includes('顯而易見的是，門沒鎖。'))

  // 5. AI 味綜合濃度與具體細節／口語猶豫抵銷
  const concHigh = calcAiConcentration('他嘴角勾起，心中一震，眼神微暗。當他走近時，以一種不容置疑的方式說完。')
  const concDamped = calcAiConcentration('昨天下午3點，他攥著50塊錢進門。我想想，不對，其實那件事我說不準，手一抖差點掉在地上。')
  assert.ok(concHigh.score > concDamped.score)
  assert.ok(concDamped.anchorHits >= 1 && concDamped.imperfectionHits >= 1)

  // 6. 防幻覺／防退化／承諾保真／年份豁免／跨段去重罰分／口語保護
  assert.equal(validateTier2Rewrite('他一九九九年抵達此地，共買了兩本書。', '他1999年抵達此地，只帶走2本書。', 'strict').ok, true)
  const commitFail = validateTier2Rewrite('他或許會改變主意，也許明天再說。', '他必然會改變主意，絕對不會等明天。', 'strict')
  assert.equal(commitFail.ok, false)
  assert.equal(commitFail.reason, 'commitment-drift')

  const telFail = validateTier2Rewrite(
    '他沿著青石板路慢慢走回茶館裡，手裡攥著泛黃舊車票看了許久。推開木門朝裡面張望半天卻發現沒人。',
    '他沿青石回館。\n走回老茶館裡。\n手緊攥舊車票。\n泛黃票看半天。\n推開舊木門看。\n朝裡面張望著。',
    'strict'
  )
  assert.equal(telFail.ok, false)
  assert.equal(telFail.reason, 'telegraph-regression')

  const sFresh = scoreRewriteCandidate('他嘴角勾起，這不是害怕。', '他扯開衣領別開目光。', 'strict', { injectedStockCounts: { 垂下眼: 1 } })
  const sDupStock = scoreRewriteCandidate('他嘴角勾起，這不是害怕。', '他垂下眼沒有再說。', 'strict', { injectedStockCounts: { 垂下眼: 1 } })
  assert.ok(sFresh.score > sDupStock.score)

  assert.equal(hasGenuineImperfection('「不對，其實我想想還是算了。」'), true)
  assert.equal(isDialogueProtectedParagraph('「不對，其實我想想還是算了。」', 'smart'), true)

  // 7. 模型家族辨識 ＋ 稱謂混用檢查
  assert.equal(detectModelFamily('deepseek-chat').dashStrict, true)
  assert.equal(detectModelFamily('gemini-2.5-flash').dashStrict, false)
  const addrWarn = checkAddressConsistency(
    '陳默走了進來，小陳問好。陳默拿起茶杯，小陳坐下，陳默點頭，小陳嘆氣，陳默看窗外，小陳整理書，陳默笑著回話，小陳點點頭。',
    [['陳默', '小陳']]
  )
  assert.equal(addrWarn.length, 1)
  assert.ok(addrWarn[0].total >= 10)

  // 8. 端到端 mock 驗證：模型辨識 + 預清理 + 跨段去重退回
  const handlers = new Map()
  let writtenText = ''
  let callNum = 0
  const mockCtxV137 = {
    _disableLog: true,
    llm: {
      async prepareCall() {
        return {
          config: {},
          async *stream() {
            callNum += 1
            // 兩段故意都改出同一個「垂下眼」，驗證跨段去重後退回第二段
            yield {
              type: 'text-delta',
              text: callNum === 1
                ? '他垂下眼，直接走到屋裡的燈下坐定。'
                : '她垂下眼，朝桌上那隻舊木匣子望過去，神情顯得相當平靜。',
            }
          },
        }
      },
    },
    tavern: {
      apiVersion: 7,
      gameSettings() {},
      turnSection() {},
      onTurnSettled() {},
      onTimelineChanged() {},
      onGameRemoved() {},
      handle(name, fn) { handlers.set(name, fn) },
      async backgroundModel() { return { provider: 'mock', model: 'deepseek-chat' } },
      async getGameSettings() {
        return {
          enabled: true,
          tier2: true,
          mode: 'standard',
          script: 'trad',
          preCleanFillers: true,
          modelFamilyAdapt: 'auto',
          tier2BatchMode: 'single',
          characterVoices: '陳默 | 語氣=少話冷靜',
        }
      },
      async getCard() { return { name: '陳默', description: '現代日常故事。' } },
      async getTurnState() { return { turn: 9 } },
      async getTurn() {
        return {
          turn: 9,
          textVersion: 'v1',
          rawText: [
            '不可否認的是，屋裡還亮著燈。他心中一動，這不是錯，而是無奈。',
            '她不禁皺著眉頭朝桌上的那隻舊木匣子望過去，神情顯得相當平靜。',
          ].join('\n'),
        }
      },
      async readTurnData() { return null },
      async saveTurnData() {},
      async editTurn({ text }) {
        writtenText = text
        return { textVersion: 'v2', text }
      },
    },
  }
  apply(mockCtxV137)
  const rpt137 = await handlers.get('dsh-tavern-autoproof/proof')({ gameId: 'g-v137', turn: 9 })
  assert.equal(rpt137.turn, 9)
  assert.equal(rpt137.features.modelFamily, 'deepseek')
  assert.equal(rpt137.features.dashLimitApplied, 2)
  assert.equal(rpt137.features.preCleanedCount, 1)
  assert.ok(rpt137.features.concentration && typeof rpt137.features.concentration.score === 'number')
  assert.ok(!writtenText.includes('不可否認的是，'))
  assert.ok(rpt137.tier2.dedupReverted >= 1)
})

test('冷卻池專名防誤抓：角色卡／世界書與遊戲帳號／戰隊名（微草／木恩／獨活）絕不進冷卻名單', async () => {
  const {
    extractCardProperNouns,
    detectLikelyProperNouns,
    extractDynamicImagery,
  } = __test

  const card = {
    name: '微草戰隊訓練室',
    description: '隊長王傑希帶領高英傑（帳號卡：木恩）與許斌（帳號卡：獨活）練習。',
    character_book: {
      entries: [
        { keys: ['微草', '木恩', '獨活'], content: '微草戰隊旗下帳號包括王不留行、木恩與獨活。' },
      ],
    },
  }
  const cardNouns = extractCardProperNouns(card)
  assert.ok(cardNouns.includes('微草'))
  assert.ok(cardNouns.includes('木恩'))
  assert.ok(cardNouns.includes('獨活'))

  const combatText = [
    '訓練賽開場後，「木恩」拎著掃把搶先升空，「獨活」舉盾護住微草側翼。',
    '木恩甩出一記熔岩燒瓶，琥珀燈光在訓練室牆面晃動，獨活順勢卡住通道。',
    '微草隊員配合極緊，木恩繞後壓制，獨活正面頂盾，琥珀燈光映得鍵盤泛黃。',
    '微草替補席全神貫注看著木恩走位，木恩再度拉開角度，獨活回防極快，頭頂那盞琥珀燈光依舊刺眼。',
  ].join('\n')

  const autoNouns = detectLikelyProperNouns(combatText)
  assert.ok(autoNouns.includes('木恩'))
  assert.ok(autoNouns.includes('獨活'))
  assert.ok(autoNouns.includes('微草'))

  // 不傳卡面名詞時，僅靠文內自動識別亦不應誤抓木恩／獨活／微草，同時仍可抓到重複意象「琥珀燈光」
  const imgAuto = extractDynamicImagery(combatText, { minCount: 3 })
  assert.equal(imgAuto['木恩'], undefined)
  assert.equal(imgAuto['微草'], undefined)
  assert.equal(imgAuto['獨活'], undefined)
  assert.ok(Object.keys(imgAuto).some((k) => k.includes('琥珀')))

  // 端到端驗證 proofTurn + 舊歷史清理（就算舊歷史曾緩存過「木恩」「微草」，也會被自動踢出）
  const handlers = new Map()
  let turnSecSpec = null
  const mockCtxGame = {
    _disableLog: true,
    tavern: {
      apiVersion: 7,
      gameSettings() {},
      turnSection(spec) { turnSecSpec = spec },
      onTurnSettled() {},
      onTimelineChanged() {},
      onGameRemoved() {},
      handle(name, fn) { handlers.set(name, fn) },
      async readPluginData() {
        return {
          styleHistory: {
            'g-weicao': [
              { turn: 1, keys: [], microActions: {}, dynamicImages: { 木恩: 5, 微草: 4, 琥珀燈光: 3 }, structuralFlags: [] },
              { turn: 2, keys: [], microActions: {}, dynamicImages: { 木恩: 6, 微草: 5, 琥珀燈光: 4 }, structuralFlags: [] },
            ],
          },
        }
      },
      async getGameSettings() { return { enabled: true, tier2: false, cooldownPool: 'inject' } },
      async getCard() { return card },
      async getTurnState() { return { turn: 3 } },
      async getTurn() { return { turn: 3, textVersion: 'v1', rawText: combatText } },
      async readTurnData() { return null },
      async saveTurnData() {},
    },
  }
  apply(mockCtxGame)

  const rpt = await handlers.get('dsh-tavern-autoproof/proof')({ gameId: 'g-weicao', turn: 3 })
  assert.ok(!rpt.features.cooldownInjected.includes('木恩'))
  assert.ok(!rpt.features.cooldownInjected.includes('微草'))
  assert.ok(!rpt.features.cooldownInjected.includes('獨活'))
  assert.ok(!rpt.features.turnMicroActions.some((x) => /^(?:木恩|微草|獨活)/.test(x.word)))

  const sec = await turnSecSpec.text({ gameId: 'g-weicao', turn: 4 })
  assert.ok(!sec.includes('木恩'))
  assert.ok(!sec.includes('微草'))
  assert.ok(!sec.includes('獨活'))
})

test('v1.38 核心升級：修辭骨架冷卻衰減、純文字行為自適應、元資料防護、Tier 2 批次＋單段兜底＋空轉過濾與一鍵還原', async () => {
  const {
    isRhetoricalSkeleton,
    extractRhetoricalSkeletons,
    computeDecayedCooldown,
    detectModelFamily,
    classifyTurnOpening,
    analyzeTurnBehavioralMetrics,
    deriveBehavioralAdaptation,
    scanAndCleanMetaLeakage,
    parseBatchOutput,
    buildSegmentDiffs,
  } = __test

  // 1. 修辭骨架冷卻 ＋ 指數衰減 ＋ 舊「地圖」雜訊剔除
  assert.equal(isRhetoricalSkeleton('地圖'), false)
  assert.equal(isRhetoricalSkeleton('隊友'), false)
  assert.equal(isRhetoricalSkeleton('一抹冷笑'), true)
  assert.equal(isRhetoricalSkeleton('眼底閃過'), true)

  const skelText = [
    '他看著地圖，指尖微微一顫，眼底閃過一絲寒意。',
    '隊友打開地圖確認路線，他的指尖微微一顫，窗外月光灑落桌面。',
    '地圖邊角捲了起來，兩人眼底閃過同樣的遲疑，一絲寒意順著門縫滲進來。',
  ].join('\n')
  const skels = extractRhetoricalSkeletons(skelText, { minCount: 2 })
  assert.equal(skels['地圖'], undefined)
  assert.equal(skels['隊友'], undefined)
  assert.ok(Object.keys(skels).length >= 1)

  const cdDecayed = computeDecayedCooldown([
    { turn: 1, microActions: {}, dynamicImages: { 地圖: 9, 眼底閃過: 3 } },
    { turn: 2, microActions: {}, skeletons: { 眼底閃過: 3, 嘴角勾起: 1 } },
    { turn: 3, microActions: {}, skeletons: { 眼底閃過: 2 } },
  ])
  assert.ok(!cdDecayed.includes('地圖'))
  assert.ok(cdDecayed.includes('眼底閃過'))

  // 2. 模型名稱診斷識別擴充（qwen / grok / glm / minimax）
  assert.equal(detectModelFamily('qwen3.8-flash').family, 'qwen')
  assert.equal(detectModelFamily('grok-3-beta').family, 'grok')
  assert.equal(detectModelFamily('glm-4-plus').family, 'glm')
  assert.equal(detectModelFamily('minimax-text-01').family, 'minimax')

  // 3. 純文字行為自適應 ＋ 連 3 輪相同開場偵測
  assert.equal(classifyTurnOpening('夜色壓得很低，窗外飄著細雨。'), 'weather_time')
  assert.equal(classifyTurnOpening('「別等了。」她把鑰匙丟在桌上。'), 'dialogue')
  const bSample = analyzeTurnBehavioralMetrics(
    '夜色正濃——他走進房間——空氣有點悶。\n桌子靠著牆。\n窗簾拉了一半。',
    { embodied: { hits: 5 } },
    { chars: 200, dashOutside: 6, paragraphs: 3 }
  )
  assert.ok(bSample.dashPer1k > 5)
  assert.equal(bSample.openingKind, 'weather_time')

  const adaptRes = deriveBehavioralAdaptation([
    { turn: 1, behavior: { ...bSample, directSpeechRatio: 0.05, frontLoadChars: 420 } },
    { turn: 2, behavior: { ...bSample, directSpeechRatio: 0.08, frontLoadChars: 390 } },
    { turn: 3, behavior: { ...bSample, directSpeechRatio: 0.04, frontLoadChars: 410 } },
  ])
  assert.equal(adaptRes.active, true)
  assert.equal(adaptRes.dashLimit, 1.5)
  assert.equal(adaptRes.openingMonotony, 'weather_time')
  assert.ok(adaptRes.hints.some((h) => h.includes('開場') || h.includes('破折號') || h.includes('對白')))

  // 4. 後設／系統元資料洩漏清理與截斷告警（白名單與對白內豁免）
  const rawMeta = [
    '「這上面寫著（未完待續），別管它。」他把紙揉成一團。',
    '他推開門走進走廊。',
    '（字數統計：1,280字）',
    '【本節重點】',
    '[OOC: 接下來進入戰鬥]',
    '雨水打在屋簷上，啪嗒作響—',
  ].join('\n')
  const metaRes = scanAndCleanMetaLeakage(rawMeta, { clean: true })
  assert.equal(metaRes.removedCount, 3)
  assert.ok(metaRes.text.includes('「這上面寫著（未完待續），別管它。」'))
  assert.ok(!metaRes.text.includes('字數統計'))
  assert.ok(!metaRes.text.includes('【本節重點】'))
  assert.ok(!metaRes.text.includes('[OOC:'))
  assert.equal(metaRes.truncatedEnding, true)

  // 5. batch 解析與 segment diff
  const parsedMap = parseBatchOutput('[1]\n這是校對後保持長度的第一段正文甲。\n\n[2]\n這是校對後保持長度的第二段正文乙。', [
    { num: 1, content: '這是一段超過十個漢字的原始段落甲。' },
    { num: 2, content: '這是一段超過十個漢字的原始段落乙。' },
  ])
  assert.equal(parsedMap.size, 2)
  assert.equal(parsedMap.get(1), '這是校對後保持長度的第一段正文甲。')
  const diffsPreview = buildSegmentDiffs('甲\n多餘一行\n乙', '甲改\n乙')
  assert.equal(diffsPreview.length, 2)

  // 6. E2E Mock：空轉低訊號過濾 -> Tier 2 批次＋單段兜底 -> Diff 與一鍵還原鎖定
  const handlers = new Map()
  let latestText = ''
  let curVer = 'v1'
  let curTurn = 1
  let llmCalls = 0
  let storedTurnData = new Map()

  const mockCtxV138 = {
    _disableLog: true,
    llm: {
      async prepareCall() {
        return {
          config: {},
          async *stream(req) {
            llmCalls += 1
            const msg0 = req?.messages?.[0]?.content
            const userMsg = Array.isArray(msg0)
              ? msg0.map((p) => p?.text || '').join('')
              : String(msg0 || '')
            if (userMsg.includes('【批次局部校對')) {
              // Batch 模式回傳第 1 段，故意漏掉第 2 段以驗證單段兜底
              yield {
                type: 'text-delta',
                text: '[1]\n屋裡還亮著白燈。這是無可奈何的選擇，他沉默著低頭看著文件。',
              }
            } else {
              yield {
                type: 'text-delta',
                text: '她打開木匣子看著舊鑰匙，沉思了幾秒沒有再多說，神情看似平靜卻像早有盤算。',
              }
            }
          },
        }
      },
    },
    tavern: {
      apiVersion: 8,
      gameSettings() {},
      turnSection() {},
      onTurnSettled() {},
      onTimelineChanged() {},
      onGameRemoved() {},
      handle(name, fn) { handlers.set(name, fn) },
      async backgroundModel() { return { provider: 'mock', model: 'qwen3.8-flash' } },
      async getGameSettings() {
        return {
          enabled: true,
          tier2: true,
          mode: 'standard',
          script: 'trad',
          tier2BatchMode: 'batch',
          metaLeakGuard: 'clean',
          preCleanFillers: true,
          targetedFeedback: true,
        }
      },
      async getCard() { return { name: '林硯', description: '現代日常故事。' } },
      async getTurnState() { return { turn: curTurn } },
      async getTurn({ turn }) {
        return { turn, textVersion: curVer, rawText: latestText }
      },
      async readTurnData({ gameId, turn }) {
        return storedTurnData.get(`${gameId}:${turn}`) || null
      },
      async saveTurnData({ gameId, turn, data }) {
        storedTurnData.set(`${gameId}:${turn}`, { data })
      },
      async editTurn({ text }) {
        latestText = text
        curVer = 'v_' + Math.random().toString(36).slice(2, 6)
        return { textVersion: curVer, text }
      },
    },
  }
  apply(mockCtxV138)

  // 6a. 低訊號段落僅觸發弱警示且無人為 P0／精準定位，應略過 Tier 2（0 LLM 呼叫）
  curTurn = 1
  latestText = '午後三點的咖啡廳有點安靜，街邊電車叮鈴噹啷開過，桌上拿鐵表面的奶泡緩緩塌了一小角，似乎帶著一點淡淡的焦糖味兒。'
  const rptLow = await handlers.get('dsh-tavern-autoproof/proof')({ gameId: 'g-v138', turn: 1 })
  assert.equal(llmCalls, 0)
  assert.equal(rptLow.tier2.ran, false)

  // 6b. 實質 P0 段落：驗證 Meta-leak 清理 + Batch(1次) + 漏段 Fallback(1段) + Diff + Undo + 鎖定
  curTurn = 2
  curVer = 'v10'
  const origTurn2 = [
    '不可否認的是，屋裡還亮著白燈。這不是他的錯，而是無可奈何的選擇，他低頭看著文件。',
    '她打開木匣子看著舊鑰匙，這不是挑釁，而是無聲的回應，神情看似平靜卻像什麼都明白。',
    '（未完待續）',
  ].join('\n')
  latestText = origTurn2

  const rptBatch = await handlers.get('dsh-tavern-autoproof/proof')({ gameId: 'g-v138', turn: 2 })
  assert.equal(rptBatch.features.metaLeakRemovedCount, 1)
  assert.ok(!latestText.includes('（未完待續）'))
  assert.equal(rptBatch.tier2.batchCalls, 1)
  assert.equal(rptBatch.tier2.fallbackSingles, 1)
  assert.ok(Array.isArray(rptBatch.diffs) && rptBatch.diffs.length >= 2)
  assert.equal(rptBatch.canUndo, true)
  assert.equal(rptBatch.reverted, false)

  // 執行一鍵還原原文
  const undoRes = await handlers.get('dsh-tavern-autoproof/undo')({ gameId: 'g-v138', turn: 2 })
  assert.equal(undoRes.ok, true)
  assert.equal(latestText, origTurn2)
  assert.equal(undoRes.report.reverted, true)
  assert.equal(undoRes.report.canUndo, false)

  // 還原後重啟模擬：readTurnData 應維持鎖定，不再自動改寫
  const callsBeforeTick = llmCalls
  const tickAfterUndo = await handlers.get('dsh-tavern-autoproof/tick')({
    gameId: 'g-v138',
    turn: 2,
    textVersion: 'v_new_external',
  })
  assert.equal(llmCalls, callsBeforeTick)
  assert.equal(latestText, origTurn2)
  assert.ok(tickAfterUndo.ok)
})
