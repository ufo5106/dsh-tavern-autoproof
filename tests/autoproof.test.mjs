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
