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
      { value: 'full', label: '完整體檢（含公式轉折、六感、同構／翻譯腔與 MTLD）' },
    ],
    help: '【純本地 0 Token】\n• 段落／句長變異係數 CV（<0.15 代表通篇等長如機器節拍器）＋ 相鄰句結構同構與列表同開頭。\n• 結尾升華腔與翻譯腔句法殼（當…時／對於…而言／三連「的」鏈）。\n• 六感平衡、過度生理反應、MTLD 過度換詞與銜接連環數。',
  },
  {
    key: 'preCleanFillers',
    group: 'local',
    type: 'boolean',
    tier: 'local',
    label: '無損清理敘事廢話起手（0 Token）',
    default: true,
    help: '【純本地 0 Token · 僅作用於非對白敘事】\n自動移除「不可否認的是，」「顯而易見的是，」「值得一提的是，」「不難看出，」「眾所周知，」等零資訊廢話起手，並順手修復殘留雙逗號／孤立標點；完全跳過引號對白與白名單區域。',
  },

  // ── 群組三：線上改寫紀律與防幻覺保護（🟡/🔵） ──
  {
    key: 'protectDialogue',
    group: 'tier2',
    type: 'select',
    tier: 'hybrid',
    label: '對話與角色口癖保護區',
    default: 'smart',
    options: [
      { value: 'smart', label: '智能放行（護短口癖；AI腔／三明治／長台詞照修並保口氣，推薦）' },
      { value: 'strict', label: '嚴格跳過所有對白段落（完全不動引號對白）' },
      { value: 'off', label: '關閉保護（全部對白皆交由 Tier 2 檢查改寫）' },
    ],
    help: '【本地識別＋Tier 2 口語保護】\n• 智能放行（推薦）：像「我不擦！」「嗯。」這類簡短自然口癖照常跳過保護；但一旦偵測到長段說教、翻譯腔（「別無選擇」「你必須明白」）、對舉「不是A而是B」、三連排比或「語氣很平，手卻…」三明治動作，就會放行給 Tier 2 改成真人順口口語，同時保留原本稱呼與語氣詞。\n• 嚴格跳過：完全不讓 Tier 2 修改純對白段落。\n• 關閉：全面送交 Tier 2 檢查。',
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
    help: '【純本地 0 Token 守門】當 Tier 2 回傳改寫結果時，在本地自動比對原文與改寫文：\n• 中／阿數字等價保真（含年份豁免）＋ 形近易混字（戍/戌、祗/祇）守衛。\n• 語氣承諾度保真：禁止把「也許／似乎」誤改為「必然／絕對」。\n• 嚴格檔會拒收「越改越多 AI 詞」「離題重寫」「電報體碎片化退化」並退回原文。',
  },
  {
    key: 'modelFamilyAdapt',
    group: 'tier2',
    type: 'select',
    tier: 'hybrid',
    label: '依後台／生成模型家族自適應先驗',
    default: 'auto',
    options: [
      { value: 'auto', label: '自動識別（DeepSeek／Claude／GPT／Gemini，推薦）' },
      { value: 'off', label: '關閉（全模型套用統一基準）' },
    ],
    help: '【參考 sepia／deai 模型指紋實測】依目前辨識到的模型名稱自動微調側重點：\n• DeepSeek：從嚴清理破折號，提醒勿開局一口氣科普背景與過度均衡插敘。\n• Claude：抑制平滑升級、華而不實比喻與說教尾聲。\n• GPT：抑制旁人傳言推進與過度反轉。\n• Gemini：放寬原本就偏低的破折號誤報，提醒少寫工整大團圓與補入間接轉述。',
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
  {
    key: 'entityLockMode',
    group: 'local',
    type: 'select',
    tier: 'local',
    label: '實體專有名詞鎖（Canonical Entity Lock）',
    default: 'auto_and_custom',
    options: [
      { value: 'off', label: '關閉' },
      { value: 'custom_only', label: '僅套用下方自訂名詞對照表' },
      { value: 'auto_and_custom', label: '人物卡 4 字＋漏字防錯 ＋ 自訂對照表（推薦）' },
    ],
    help: '【純本地 0 Token 防專名詞漂移（RoleRAG 思路）】\n• 自動防漏字：讀取人物卡與世界書裡的 4 字以上專有名詞（如「聖殿騎士團」），自動抓出漏掉中間字的錯寫（如「聖殿士團」→「聖殿騎士團」，並排除設定集中本來就存在的詞以免誤傷）。\n• 搭配下方自訂對照表，在 Tier 1 寫回前直接訂正，阻止錯字遺傳進下一輪歷史記憶。',
  },
  {
    key: 'customEntityFixes',
    group: 'local',
    type: 'textarea',
    tier: 'local',
    maxLen: 1200,
    placeholder: '每行一組「錯詞=正詞」，例如：\n亞里斯多=亞里斯多德\n黑森林谷=黑森林山谷',
    label: '自訂專有名詞修正對照',
    default: '',
    help: '【純本地 0 Token】每行填寫一組「錯詞=正詞」（亦支援 -> 或 →）。會在 Tier 1 最先執行精準替換，用來鎖死人名／稱號／組織／招式／地名等專有名詞，防止長對話錯名擴散。',
  },
  {
    key: 'utteranceGate',
    group: 'local',
    type: 'select',
    tier: 'local',
    label: '知而不言邊界（防角色念設定集）',
    default: 'adaptive',
    options: [
      { value: 'off', label: '關閉' },
      { value: 'report', label: '僅在報告標記科普對話' },
      { value: 'adaptive', label: '自適應（偵測到念設定集時自動提醒 2 輪，推薦）' },
      { value: 'always', label: '每輪生成前皆注入邊界提醒' },
    ],
    help: '【PersonaForge 知而不言原則】區分「角色腦中知道的設定」與「當下會說出口的話」。偵測到台詞裡出現「百年前創立／按照規矩只有／正如你所知當年…」等百科式設定複誦時，在生成前提醒主模型只寫符合當下關係與情境的口語台詞。',
  },
  {
    key: 'styleWhitelist',
    group: 'local',
    type: 'textarea',
    tier: 'local',
    maxLen: 1500,
    placeholder: '每行填入一條「這是原作或本作刻意寫法、不要當成 AI 味」的字面短語，例如：\n某個招牌口癖\n固定比喻短句',
    label: '文風白名單（等長掩碼豁免）',
    default: '',
    help: '【純本地 0 Token（dsh-novel-forge 白名單掩碼機制）】解決「改到沒 AI 味卻改到不像本人／原作」的矛盾：填入的字面短語在本地體檢與病灶掃描前會做等長豁免掩碼（字數、段落與正文內容完全不動），讓特色寫法與口頭禪不被當成 AI 味送修。',
  },

  // ── 群組四：正面文風與多角色語氣（✨ 同人／小說改編卡強推；原創卡可選填） ──
  {
    key: 'styleCardEnabled',
    group: 'style',
    type: 'boolean',
    tier: 'hybrid',
    label: '啟用正面文風錨點（適用同人卡／小說卡）',
    default: true,
    help: '【同人卡／小說改編卡適用（原創卡若無範文可略過）】\n將下方萃取或手動撰寫的「正面語言指紋」於生成前輕量注入主模型，並在 Tier 2 編修時作為風格參考。建議用 100～220 字描述句長節奏與接話神態；若為純原創角色卡找不到原作文本，保持空白即可，完全不影響其他淨化功能。',
  },
  {
    key: 'styleCardText',
    group: 'style',
    type: 'textarea',
    tier: 'hybrid',
    maxLen: 1200,
    placeholder: '（同人卡／小說卡適用，原創卡找不到原作文本可留白）可貼上範文或上傳 .txt／.md 小說自動萃取…',
    label: '正面文風錨點內容（可搭配一鍵萃取）',
    default: '',
    help: '存放這張角色卡（或全域預設）的正面語感指南。完全不照抄範文劇情，只描述句型節奏、對白接話方式與情緒留白感；無可用原作範文的純原創卡留空即可。',
  },
  {
    key: 'sampleAnchorsEnabled',
    group: 'style',
    type: 'boolean',
    tier: 'hybrid',
    label: '啟用寫作範例輪轉（適用同人卡／小說卡）',
    default: true,
    help: '【同人卡／小說改編卡適用（原創卡可略過）】\n除了抽象文風描述外，搭配「真實寫作範例片段」按輪次確定性輪轉 1～2 段（敘事段＋對白段）提供給主模型當語感示範，並附「嚴禁抄人名／劇情」邊界。上傳小說檔或按萃取時會自動挑出範例片段。',
  },
  {
    key: 'sampleAnchorsText',
    group: 'style',
    type: 'textarea',
    tier: 'hybrid',
    maxLen: 2400,
    placeholder: '（同人／小說卡適用，原創卡可留白）每段範例片段用一行 --- 分隔（建議 60～240 字一段）；上傳小說或點擊萃取時會自動挑選填入…',
    label: '寫作範例輪轉庫（以 --- 分隔多段）',
    default: '',
    help: '【確定性輪轉 · 不過擬合】將多段精選的原作或理想段落以獨立一行 `---` 隔開；每輪自動依輪數輪換不同片段當正面語感參考，不會整場對話死抱同一段腔調。找不到參考小說的原創卡保持空白即可。',
  },
  {
    key: 'characterVoices',
    group: 'style',
    type: 'textarea',
    tier: 'hybrid',
    maxLen: 2000,
    placeholder: '每行一位角色（原創卡／同人卡皆適用；一鍵文風萃取時也會自動填入），例如：\n角色名 | 口頭禪=行吧,算了 | 絕不說=親愛的,別無選擇 | 語氣=短句為主、不解釋動機',
    label: '多角色語言基因卡（防千人一腔）',
    default: '',
    help: '【通用（原創卡／同人卡皆適用）】多角色同台最怕全員說同一種書面 AI 腔。點擊「一鍵萃取」時會連同範文中的主要角色語氣自動抽出；純原創卡也可直接手動填寫「口頭禪」「絕不說（禁忌詞）」「語氣／句長」，會在生成前提醒主模型，並在純本地精準檢查是否誤觸禁忌詞。',
  },
  {
    key: 'verbalizedSampling',
    group: 'style',
    type: 'boolean',
    tier: 'online',
    label: 'Verbalized Sampling（思考期破除套路）',
    default: false,
    help: '【通用（所有卡片皆適用）· ICML 2026 去模式坍塌技術】只在思考／規劃區起作用：要求主模型寫正文前先構想 2 種截然不同的對話切入點並評估典型度，刻意捨棄最高機率的第一直覺俗套，改走新鮮但不 OOC 的路線。',
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
      let normalizedVal = val
      if (field.key === 'protectDialogue' && typeof val === 'boolean') {
        normalizedVal = val ? 'smart' : 'off'
      }
      if ((field.options || []).some((o) => o.value === normalizedVal)) {
        out[field.key] = normalizedVal
      }
    } else if (field.type === 'textarea') {
      out[field.key] = String(val).slice(0, field.maxLen || 1200)
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
  // 判斷／過渡／段中過擬合說教
  '不容置疑', '不容置喙', '不易察覺', '不易察觉', '顯而易見', '显而易见',
  '毫無疑問', '毫无疑问', '不可否認', '不可否认', '前所未有',
  '不由自主', '情不自禁', '自然而然', '話鋒一轉', '话锋一转', '不由得',
  '殊不知', '多年以後', '多年以后', '反擊才剛剛開始', '反击才刚刚开始',
  '這絕非偶然', '这绝非偶然', '背後折射出', '背后折射出',
  '身體知道答案', '身体知道答案', '直覺告訴你', '直觉告诉你',
  '底層邏輯', '底层逻辑', '顆粒度', '颗粒度', '閉環', '闭环',
  '高光時刻', '高光时刻', '里程碑', '史詩級', '史诗级',
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

// 雙指標局部滑窗密集群偵測（參考 plainspoken-writing 200 字滑窗與密度原則）
export function scanWindowClusters(text, words, windowChars = 200, minCount = 3) {
  const src = String(text ?? '')
  if (!src || !Array.isArray(words) || !words.length) {
    return { maxInWindow: 0, positions: [] }
  }
  const positions = []
  for (const w of words) {
    let idx = 0
    while ((idx = src.indexOf(w, idx)) !== -1) {
      positions.push({ pos: idx, word: w })
      idx += w.length
    }
  }
  if (positions.length < minCount) {
    return { maxInWindow: positions.length, positions }
  }
  positions.sort((a, b) => a.pos - b.pos)
  let maxInWindow = 1
  let left = 0
  for (let right = 0; right < positions.length; right++) {
    while (positions[right].pos - positions[left].pos > windowChars) {
      left += 1
    }
    const spanCount = right - left + 1
    if (spanCount > maxInWindow) maxInWindow = spanCount
  }
  return { maxInWindow, positions }
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
      softWindowMax: 0,
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
  const softWin = scanWindowClusters(src, SOFT_HEDGE_WORDS, 200, level === 'strict' ? 2 : 3)
  const lyric = countOccurrences(src, LYRIC_FLUFF_WORDS)
  const nominalMatches = src.match(NOMINALIZATION_RE) || []

  const softPerK = Number((soft.total / kilo).toFixed(2))
  const t1Triggered = t1.total >= th.t1Min
  const winThreshold = level === 'strict' ? 2 : (level === 'relaxed' ? 4 : 3)
  const softWindowTriggered = softWin.maxInWindow >= winThreshold
  const softTriggered = (soft.total >= 2 && hanziCount >= 80 && softPerK > th.softPerK) || softWindowTriggered
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
    const winTag = softWindowTriggered ? ` · 200字窗峰值 ${softWin.maxInWindow}` : ''
    warnings.push(`弱化/對沖副詞偏密 ${softPerK}/千字${winTag}（共 ${soft.total} 處：${softTop.slice(0, 3).map((x) => x.word).join('、')}）`)
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
    softWindowMax: softWin.maxInWindow,
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
    // 資訊稀釋：純敘事 bigram 重複率 + 平均每句「的」字數（排除對話）
    const nonDialSents = src
      .split('\n')
      .filter((l) => !isDialogueLine(l))
      .join('\n')
      .split(/[。！？!?…]+/)
      .map((x) => x.trim())
      .filter(Boolean)
    const cleanNar = src.split('\n').filter((l) => !isDialogueLine(l)).join('').replace(/\s+/g, '')
    const dePerSent = nonDialSents.length > 0
      ? Number(((cleanNar.match(/的/g) || []).length / nonDialSents.length).toFixed(2))
      : 0
    const bgMap = new Map()
    let bgDup = 0
    let bgTotal = 0
    for (let i = 0; i < narrativeChars.length - 1; i++) {
      const bg = narrativeChars.slice(i, i + 2)
      bgMap.set(bg, (bgMap.get(bg) || 0) + 1)
    }
    for (const c of bgMap.values()) {
      bgTotal += c
      if (c > 1) bgDup += c - 1
    }
    const bigramRate = bgTotal > 0 ? Number((bgDup / bgTotal).toFixed(3)) : 0
    result.dilution = { dePerSent, bigramRate }
    if (dePerSent > 2.4 || bigramRate > 0.28) {
      warnings.push(`敘事資訊稀釋（平均每句「的」${dePerSent} 次 · bigram 重複 ${Math.round(bigramRate * 100)}%）`)
    }
  }

  // 一句一段碎句盲區補充（paraCv 看似正常但超過 45% 都是 40 字以內單句段）
  if (paras.length >= 12) {
    let oneSentShort = 0
    for (const p of paras) {
      const marks = (p.match(/[。！？!?…]+/g) || []).length
      if (marks <= 1 && p.replace(/\s+/g, '').length <= 40) oneSentShort += 1
    }
    const oneRatio = Number((oneSentShort / paras.length).toFixed(2))
    result.oneSentenceParas = { hits: oneSentShort, total: paras.length, ratio: oneRatio, triggered: oneRatio >= 0.45 }
    if (oneRatio >= 0.45) {
      warnings.push(`「一句一段」碎句偏高（${Math.round(oneRatio * 100)}%，${oneSentShort}/${paras.length} 段）`)
    }
  }

  // 同構句拍、列表同前綴、MTLD/同義輪換、語氣詞密度、RLHF 七虛詞、銜接連環與過度生理渲染
  const syntax = scanSyntaxAndTranslationese(src)
  const isomorphic = calcSentenceIsomorphism(src)
  const listPrefix = detectListLikePrefixRun(src)
  const mtld = estimateBigramMtld(src)
  const synonymSwaps = detectSynonymSwaps(src)
  const cohesion = countParagraphCohesionChain(src)
  const embodied = detectEmbodiedOverload(src)
  const fnRatio = calcFunctionCharRatio(src)

  result.syntax = syntax
  result.isomorphic = isomorphic
  result.listPrefix = listPrefix
  result.mtld = mtld
  result.synonymSwaps = synonymSwaps
  result.cohesion = cohesion
  result.embodied = embodied
  result.rlhfFunctionRatio = fnRatio

  if (isomorphic.tripleCount >= 1 || isomorphic.pairCount >= 3) {
    warnings.push(`相鄰句結構同構（兩連 ${isomorphic.pairCount} 組 / 三連 ${isomorphic.tripleCount} 組）`)
  }
  if (listPrefix.runs.length >= 1) {
    warnings.push(`連續列表同字前綴（${listPrefix.runs.map((r) => `${r.prefix}×${r.length}`).slice(0, 2).join('、')}）`)
  }
  if (syntax.total >= 3) {
    warnings.push(`敘事翻譯腔／膨脹動詞殼 ${syntax.total} 處`)
  }
  if (synonymSwaps.windowCount >= 1) {
    warnings.push(`同段同義詞刻意輪換（${synonymSwaps.samples.slice(0, 2).join('｜')}）`)
  }
  if (embodied.overloaded) {
    warnings.push(`生理反應連發過度（${embodied.hits} 處生理詞、缺直接情緒命名）`)
  }

  return result
}

// ── 4. NSFW 安全分流與對話保護區偵測 ──

const NSFW_EXPLICIT_RE = /(?:陰莖|阴茎|肉棒|陽具|阳具|龜頭|龟头|陰道|阴道|陰戶|阴户|陰蒂|阴蒂|花穴|嫩穴|蜜穴|肉穴|後庭|后庭|菊穴|子宮口|子宫口|乳頭|乳头|乳暈|乳晕|乳房|胸乳|騷穴|骚穴|淫水|愛液|爱液|精液|白濁|白浊|高潮|潮吹|射精|內射|内射|顏射|颜射|口交|口活|吞精|深喉|自慰|抽插|頂弄|顶弄|挺動|挺动|貫穿|贯穿|痙攣|痉挛|失禁|發情|发情|春藥|春药|媚藥|媚药|肉慾|肉欲|交合|交歡|交欢|性交|做愛|做爱|性愛|性爱|呻吟|浪叫|嬌喘|娇喘|腿心|私處|私处|下體|下体|股間|股间|肉壁|花心|敏感點|敏感点)/

export function isSensitiveNsfwSegment(text) {
  return NSFW_EXPLICIT_RE.test(String(text ?? ''))
}

const DIALOGUE_TRANSLATIONESE_RE = /(?:別無選擇|别无选择|你必須明白|你必须明白|我向你保證|我向你保证|問題(?:並)?不在於|问题(?:并)?不在于|坦白說這很|坦白说这很|你永遠不會懂|你永远不会懂|讓我告訴你|让我告诉你|這簡直(?:令人|難以)|这简直(?:令人|难以)|所謂的[^，。！？\n]{1,10}(?:就是|其實|不过|不過)|所谓的[^，。！？\n]{1,10}(?:就是|其实|不过))/
const DIALOGUE_CONTRAST_TAG_RE = /[「『“"][^「」『』“”"\n]{1,100}[」』”"]\s*(?:她|他|它)?(?:說話|说话|語氣|语气|聲音|声音)很[平淡冷靜輕]\S{0,18}[，,]\s*(?:手|手指|指尖|肩膀|喉結)?卻[^「」『』“”"\n]{2,26}[，,]\s*[「『“"]/
const DIALOGUE_SANDWICH_INLINE_RE = /[「『“"][^「」『』“”"\n]{1,120}[」』”"]\s*[^「」『』“”"\n]{2,45}[，,]\s*[「『“"]/
const DIALOGUE_ANTITHESIS_RE = /(?:不是|並非|并非|不在於|不在于)[^，。！？\n]{1,22}[，,]?\s*(?:而是|而在於|而在于|是)(?![^，。！？\n]{0,4}(?:嗎|吗|呢|？))[^，。！？\n]{1,22}/
// 無「而是」的隱性格言對立（例：「我不畫格子了。我畫人。」「學的是背格子。他打的是人。」「是拔刀斬，我按的是防拔刀斬」「讀得沒錯，錯在你以為…」）
const DIALOGUE_IMPLICIT_CONTRAST_RE = /(?:不[\u4e00-\u9fff]{1,8}了[。！]\s*(?:我|他|她|你|咱|我們)[\u4e00-\u9fff]{1,6}[。！]|[\u4e00-\u9fff]{1,8}的是[^，。！？\n]{1,12}[，。！？]\s*[^，。！？\n]{1,12}的是[^，。！？\n]{1,12}|(?:^|[，。！？\n])\s*是[\u4e00-\u9fff]{2,8}[，,]\s*[^，。！？\n]{1,10}的是[\u4e00-\u9fff]{2,10}|(?:[說看讀打做想]得?(?:沒錯|没错|對)|沒有看錯|没有看错)[，,]\s*錯在|错在[^，。！？\n]{1,18}|(?:今天|現在|直到今天|此時|此刻)才明白)/
// 機械數字／序數遞進與無意義複位動作
const MECHANICAL_ENUM_RE = /(?:[一二兩两三四五六七八九十\d]+[個道條張格步層圈次位][^。！？\n]{0,16}[。，,]\s*第[二三四五六七八九十\d]+[個道條張格步層圈次位]?|第[一二三四五六七八九十\d]+[個道條張格步層圈次位]?[，、跟和與及]\s*第[一二三四五六七八九十\d]+)/
const FIDGET_REVERSE_LOOP_RE = /(?:摘下[來来]?[，,]?\s*又套回[去去]?|立了\s*又壓|壓了\s*又立|打開[了]?\s*又[關合]上?|拿(?:起來|起)[，,]?\s*又放下|抽出[來来]?[，,]?\s*又(?:插|壓)回|拉開[了]?\s*又拉[上回]|戴上[了]?\s*又摘下)/

/**
 * 檢查含有引號對白的段落是否帶有 AI 書面說教、翻譯腔、隱性對舉金句、機械遞進、三明治動作或設定科普感。
 */
export function analyzeDialogueAiFlavor(text) {
  const s = String(text ?? '').trim()
  if (!s) return { hasDialogue: false, quoteHanzi: 0, isSandwich: false, reasons: [], samples: [], hasAiFlavor: false }
  const quoteMatches = [...s.matchAll(/[「『“"]([^「」『』“”"\n]+)[」』”"]/g)]
  if (!quoteMatches.length) {
    return { hasDialogue: false, quoteHanzi: 0, isSandwich: false, reasons: [], samples: [], hasAiFlavor: false }
  }
  const joinedQuotes = quoteMatches.map((m) => m[1]).join('\n')
  const quoteHanzi = (joinedQuotes.match(/[\u4e00-\u9fff]/g) || []).length
  const sandwichMatch = s.match(DIALOGUE_SANDWICH_INLINE_RE) || s.match(DIALOGUE_CONTRAST_TAG_RE)
  const isSandwich = Boolean(sandwichMatch)

  const reasons = []
  const samples = []
  const pushReason = (r, samp) => {
    if (!reasons.includes(r)) reasons.push(r)
    if (samp && samples.length < 4) samples.push(String(samp).trim().slice(0, 38))
  }

  if (sandwichMatch) pushReason('dialogue_sandwich', sandwichMatch[0])
  const anti = joinedQuotes.match(DIALOGUE_ANTITHESIS_RE)
  if (anti) pushReason('dialogue_antithesis', anti[0])
  const impContrast = joinedQuotes.match(DIALOGUE_IMPLICIT_CONTRAST_RE)
  if (impContrast) pushReason('dialogue_implicit_contrast', impContrast[0])
  const mechEnum = joinedQuotes.match(MECHANICAL_ENUM_RE)
  if (mechEnum) pushReason('dialogue_mechanical_enum', mechEnum[0])
  const trans = joinedQuotes.match(DIALOGUE_TRANSLATIONESE_RE)
  if (trans) pushReason('dialogue_translationese', trans[0])
  const triple = joinedQuotes.match(/([砍看寫写抓握按推拉說说問问走跑盯壓压抽])[^，。！？\n]{1,16}[，,]\s*\1[^，。！？\n]{1,16}[，,]\s*\1[^，。！？\n]{1,18}[。！？]?/)
  if (triple) pushReason('dialogue_triple', triple[0])
  const infoDump = detectInfoDumpDialogue(s)
  if (infoDump.count > 0) pushReason('dialogue_info_dump', infoDump.samples[0])
  if (NOMINALIZATION_RE.test(joinedQuotes)) {
    const nm = joinedQuotes.match(NOMINALIZATION_RE)
    pushReason('dialogue_nominalization', nm?.[0])
  }
  const fidget = s.match(FIDGET_REVERSE_LOOP_RE)
  if (fidget) pushReason('fidget_reverse_loop', fidget[0])

  return {
    hasDialogue: true,
    quoteHanzi,
    isSandwich,
    reasons,
    samples,
    hasAiFlavor: reasons.length > 0,
  }
}

export const GENUINE_IMPERFECTION_RE = /(?:不對[，,。]?\s*其實|不对[，,。]?\s*其实|我想想|說不清|说不清|說不準|说不准|沒把握|没把握|不太確定|不太确定|我也不知道|算了[，,]?\s*(?:你當我沒說|你当我没说|就這樣|就这样)|手一抖|語氣一噎|语气一噎|話卡了|话卡了)/

export function hasGenuineImperfection(text) {
  return GENUINE_IMPERFECTION_RE.test(String(text ?? ''))
}

export function isDialogueProtectedParagraph(text, mode = 'smart') {
  if (mode === 'off' || mode === false) return false
  const s = String(text ?? '').trim()
  if (!s) return false
  const pureDialogue = /^[「『“"][^「」『』“”"\n]{1,220}[」』”"]$/.test(s)
  const quoteBody = (s.match(/[「『“"][^「」『』“”"]+[」』”"]/g) || []).join('')
  const dialogueDominated = pureDialogue || (quoteBody.length >= s.length * 0.72)
  if (!dialogueDominated) return false

  if (mode === 'strict') return true

  // smart 模式（預設）：僅保護簡短自然口癖（<=42 漢字且不含 AI 腔）與口語猶豫自我修正，長段／翻譯腔／三明治／設定科普一律放行給 Tier 2
  const flavor = analyzeDialogueAiFlavor(s)
  if (flavor.hasAiFlavor || flavor.quoteHanzi > 42) return false
  if (hasGenuineImperfection(s)) return true
  return true
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
    const val = Number(m[0])
    // 豁免獨立 4 位數常見西元年份（1900–2100），避免年份格式調整誤攔（來自 plainspoken validator）
    if (Number.isInteger(val) && val >= 1900 && val <= 2100) continue
    set.add(m[0])
  }
  for (const m of s.matchAll(/[一二兩两三四五六七八九十百千萬万億亿零〇]{1,12}/g)) {
    const tok = m[0]
    // 排除常見非數量詞組如「一起」「一定」「一般」「一直」「一時」「萬一」與四位數年份讀法（「二零二五」）
    if (/^(?:一起|一定|一般|一直|一時|一时|一切|一樣|一样|一會|一会|一旁|一邊|一边|一絲|一丝|一抹|一陣|一阵|一聲|一声|萬一|万一)$/.test(tok)) {
      continue
    }
    if (/^(?:一九|二〇|二零|兩千零|两千零)[零〇一二三四五六七八九]{2}$/.test(tok)) {
      continue
    }
    const val = parseCnNumber(tok)
    if (val > 0 && !(val >= 1900 && val <= 2100)) set.add(String(val))
  }
  return set
}

const WEAK_COMMITMENT_RE = /(?:可能|也許|也许|似乎|大概|說不定|说不定|試圖|试图|或許|或许)/
const STRONG_COMMITMENT_RE = /(?:必然|必定|絕對|绝对|肯定會|一定会|100%|百分百)/

export function calcContentOverlap(a, b) {
  const mkWords = (s) => new Set(String(s ?? '').match(/[\u4e00-\u9fff]{2,}/g) || [])
  const sa = mkWords(a)
  if (!sa.size) return 1
  const sb = mkWords(b)
  let inter = 0
  for (const w of sa) if (sb.has(w)) inter += 1
  return Number((inter / sa.size).toFixed(3))
}

export const CONFUSABLE_CHARS = Object.freeze(['恨', '戍', '戌', '柝', '祗', '祇', '菅', '圮'])

export function calcBigramJaccard(a, b) {
  const mk = (s) => {
    const t = String(s ?? '').replace(/\s+/g, '')
    const set = new Set()
    for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2))
    return set
  }
  const sa = mk(a)
  const sb = mk(b)
  if (!sa.size && !sb.size) return 1
  let inter = 0
  for (const x of sa) if (sb.has(x)) inter += 1
  return Number((inter / (sa.size + sb.size - inter)).toFixed(3))
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

  // 承諾強度保真：原文帶不確定口氣而無強肯定詞時，禁止改寫成武斷的「必然/絕對」
  if (WEAK_COMMITMENT_RE.test(orig) && !STRONG_COMMITMENT_RE.test(orig) && !WEAK_COMMITMENT_RE.test(next) && STRONG_COMMITMENT_RE.test(next)) {
    return { ok: false, reason: 'commitment-drift' }
  }

  // 高危易混字黑名單（防止 Tier 2 改出原文沒有的形近錯字，如 戍/戌、祗/祇、恨/狠）
  for (const ch of CONFUSABLE_CHARS) {
    if (next.includes(ch) && !orig.includes(ch)) {
      return { ok: false, reason: `confusable-char:${ch}` }
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
    // 段落級 Jaccard bigram 相似度下限：防止整段離題幻覺重寫（局部潤飾應維持 >= 0.18）
    if (beforeHanzi >= 30 && next !== orig) {
      const sim = calcBigramJaccard(orig, next)
      if (sim < 0.18) {
        return { ok: false, reason: `low-similarity:${sim}` }
      }
    }
    // 防電報體碎片化退化：原文平均句長 >= 14 字時，禁止被切成滿篇 <= 8 字的碎短句
    const splitLens = (txt) => txt
      .split(/[。！？!?…\n]+/)
      .map((s) => (s.match(/[\u4e00-\u9fff]/g) || []).length)
      .filter((n) => n >= 2)
    const origLens = splitLens(orig)
    const nextLens = splitLens(next)
    if (origLens.length >= 2 && nextLens.length >= 3) {
      const origAvg = origLens.reduce((a, b) => a + b, 0) / origLens.length
      const nextAvg = nextLens.reduce((a, b) => a + b, 0) / nextLens.length
      const origShortRatio = origLens.filter((n) => n <= 8).length / origLens.length
      const nextShortRatio = nextLens.filter((n) => n <= 8).length / nextLens.length
      if (origAvg >= 14 && nextAvg <= origAvg * 0.5 && (nextShortRatio - origShortRatio) >= 0.45) {
        return { ok: false, reason: 'telegraph-regression' }
      }
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
  const { protectDialogue = 'smart', lexiconLevel = 'balanced' } = options
  const mode = protectDialogue === false ? 'off' : (protectDialogue === true ? 'smart' : (protectDialogue || 'smart'))
  const src = mode === 'off' ? String(text ?? '') : stripDialogueSpans(text)
  const spans = []
  const seen = new Set()
  const add = (label) => {
    const clean = String(label || '').trim()
    if (!clean || seen.has(clean)) return
    seen.add(clean)
    spans.push(clean)
  }

  if (mode !== 'strict') {
    const flavor = analyzeDialogueAiFlavor(text)
    for (const samp of flavor.samples) {
      add(`[對白AI腔] ${samp}`)
    }
  }

  if (!src.trim()) return spans.slice(0, 6)

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

  // 6. 無意義複位動作或精確次數／距離量測癖
  const fidgetNarr = src.match(FIDGET_REVERSE_LOOP_RE)
  if (fidgetNarr) add(fidgetNarr[0])
  const exactCnt = src.match(/[動动搬撥拨走看敲摸揉吹嘆叹笑推拉退進进]{1,2}了\s*[一二兩两三四五六七八九十半\d]+\s*[回遍次下尺寸步]/g)
  if (exactCnt) {
    for (const ec of exactCnt.slice(0, 2)) add(ec)
  }

  // 7. 言說動詞賓語頂替語病（如「把大黑鐵鍋喊了半條街」）
  for (const frag of findSpeechObjDefects(src)) {
    add(`[語病定位] ${frag}`)
  }

  // 8. 敘事句法翻譯腔／膨脹動詞殼／同構前綴（非對白區）
  const synDiag = scanSyntaxAndTranslationese(src)
  for (const sp of synDiag.samples.slice(0, 2)) {
    add(`[句法譯製腔] ${sp}`)
  }

  // 9. 結尾升華說教殼
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
  dialogue_ai_tone: '反例：「我不畫格子了。我畫人。」「學的是死招，打的是人。」＋「摘下來，又套回去」 → 改為大白話：「別光背點了，看人。」並砍掉無意義的複位與插話微動作。',
  speech_obj_defect: '反例：「把自己家那口鐵鍋喊了半條街。」 → 改為：「他要賣那口鐵鍋的事，跑著喊了半條街。」（補全言說內容）',
  syntax_translationese: '反例：「當他推開門時，對於此時的他而言，以一種緩慢的方式走了進去。」 → 改為：「他推開門，慢吞吞走了進去。」',
  padding_verb_chain: '反例：「兩人針對這件事進行了深入的討論，最終做出了決定。」 → 改為：「兩人商量半晌，終於拍了板。」',
  isomorphic_rhythm: '反例：「他看了一眼窗外。他端起桌上的茶杯。他垂下眼沒有說話。」 → 改為長短錯落且變換開頭：「瞥了眼窗外，他端起涼透的茶卻沒喝。」',
  list_prefix_run: '反例：連續三句都以「她看著… / 她聽著… / 她想著…」起頭 → 合併或換用景物／動作開頭打破列表感。',
  exact_count: '反例：「看了三遍，把椅子往後推了半尺。」 → 改為：「盯著回放看了幾眼，拉開椅子。」（減少精確次數與尺度量詞堆砌）',
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
  dialogue_ai_tone: '反例：「我不画格子了。我画人。」「学的是死招，打的是人。」＋「摘下来，又套回去」 → 改为大白话：「别光背点了，看人。」并砍掉无意义的复位与插话微动作。',
  speech_obj_defect: '反例：「把自己家那口铁锅喊了半条街。」 → 改为：「他要卖那口铁锅的事，跑着喊了半条街。」（补全言说内容）',
  syntax_translationese: '反例：「当他推开门时，对于此时的他而言，以一种缓慢的方式走了进去。」 → 改为：「他推开门，慢吞吞走了进去。」',
  padding_verb_chain: '反例：「两人针对这件事进行了深入的讨论，最终做出了决定。」 → 改为：「两人商量半晌，终于拍了板。」',
  isomorphic_rhythm: '反例：「他看了一眼窗外。他端起桌上的茶杯。他垂下眼没有说话。」 → 改为长短错落且变换开头：「瞥了眼窗外，他端起凉透的茶却没喝。」',
  list_prefix_run: '反例：连续三句都以「她看着… / 她听着… / 她想着…」起头 → 合并或换用景物／动作开头打破列表感。',
  exact_count: '反例：「看了三遍，把椅子往后推了半尺。」 → 改为：「盯着回放看了几眼，拉开椅子。」（减少精确次数与尺度量词堆砌）',
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

const CROSS_SEG_STOCK_REPLACEMENTS = Object.freeze([
  '垂下眼', '扯了扯嘴角', '了一下', '轉開視線', '转开视线', '抿了抿唇', '低笑一聲', '低笑一声',
])

export function scoreRewriteCandidate(original, candidate, guardLevel = 'strict', extraContext = {}) {
  const check = validateTier2Rewrite(original, candidate, guardLevel)
  if (!check.ok) {
    return { ok: false, score: -Infinity, reason: check.reason }
  }
  const next = String(candidate ?? '').trim()
  const orig = String(original ?? '').trim()
  const origTells = scanWebNovelAiTells(orig, 'balanced')
  const nextTells = scanWebNovelAiTells(next, 'balanced')
  const nextSyntax = scanSyntaxAndTranslationese(next)

  const getLens = (t) => t
    .split(/[。！？!?…\n]+/)
    .map((s) => (s.match(/[\u4e00-\u9fff]/g) || []).length)
    .filter((n) => n >= 2)
  const origLens = getLens(orig)
  const sentences = getLens(next)
  const origCv = calcCv(origLens) ?? 0.25
  const sentCv = calcCv(sentences) ?? 0.25

  let score = 100
  score -= nextTells.t1Count * 10
  score -= nextTells.softCount * 3
  score -= nextTells.lyricCount * 2
  score -= nextTells.nominalCount * 4
  score -= nextSyntax.total * 3
  score += Math.min(12, sentCv * 20)

  // 節奏方差改善比（plainspoken _check_rhythm）
  if (origLens.length >= 3 && sentences.length >= 3) {
    const varRatio = sentCv / Math.max(0.08, origCv)
    if (varRatio >= 1.2) score += 6
    else if (varRatio < 0.7) score -= 8
  }

  // 雙字以上實詞重疊（防大幅替換實名詞幹）
  const origHanzi = (orig.match(/[\u4e00-\u9fff]/g) || []).length
  if (origHanzi >= 24 && next !== orig) {
    const overlap = calcContentOverlap(orig, next)
    if (overlap >= 0.35) score += 3
    else if (overlap < 0.22) score -= 12
  }

  // 口語不完美痕跡保真（保護角色口語磕巴與自我修正）
  if (hasGenuineImperfection(orig)) {
    score += hasGenuineImperfection(next) ? 5 : -8
  }

  // 跨段替換不複用罰分（deai 4.4：避開整輪集體改出同一批新套詞）
  const injectedMap = extraContext?.injectedStockCounts
  if (injectedMap && typeof injectedMap === 'object') {
    for (const st of CROSS_SEG_STOCK_REPLACEMENTS) {
      if (!orig.includes(st) && next.includes(st) && (injectedMap[st] || 0) >= 1) {
        score -= 12
      }
    }
  }

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
  '嘴角勾起', '嘴角微揚', '嘴角微扬', '扯了扯嘴角', '眼中閃過', '眼中闪过', '眼底閃過', '眼底闪过',
  '眸色一暗', '眼神微暗', '眼神一沉', '喉結滾動', '喉结滚动', '呼吸一滯', '呼吸一滞',
  '指尖微顫', '指尖微颤', '指節泛白', '指节泛白', '瞳孔微縮', '瞳孔微缩',
  '心頭一震', '心头一震', '心中一動', '心中一动', '眉頭微皺', '眉头微皱',
  '挑了挑眉', '挑起眉梢', '抿了抿唇', '抿緊嘴唇', '抿紧嘴唇', '頓了頓', '顿了顿',
  '低笑一聲', '低笑一声', '輕笑一聲', '轻笑一声', '深吸一口氣', '深吸一口气',
  '輕嘆一聲', '轻叹一声', '輕嘆一口氣', '轻叹一口气', '垂下眼簾', '垂下眼帘',
  '垂下眼', '別開眼', '别开眼', '斂下眉', '敛下眉',
  '空氣凝固', '空气凝固', '陷入沉默', '沉默片刻', '沉默了幾秒', '沉默了几秒',
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
const DIALOGUE_SANDWICH_RE = /[「『“"][^「」『』“”"\n]{1,120}[」』”"]\s*[^「」『』“”"\n]{2,45}[，,]\s*[「『“"]/g
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
  const embodiedOverload = Boolean(health.embodied?.overloaded)
  const cohesionChainTrigger = (health.cohesion?.maxChain || 0) >= 6
  const isoRhythmTrigger = (health.isomorphic?.tripleCount || 0) >= 1 || (health.isomorphic?.pairCount || 0) >= 3

  const flags = []
  if (tidyEnding) flags.push('tidy_ending')
  if (flatPacing) flags.push('flat_pacing')
  if (tellingHeavy) flags.push('telling_heavy')
  if (dialogueSandwichCount >= 2) flags.push('dialogue_sandwich')
  if (verbTripleCount >= 1) flags.push('verb_triple_parallel')
  if (embodiedOverload) flags.push('embodied_overload')
  if (cohesionChainTrigger) flags.push('cohesion_chain')
  if (isoRhythmTrigger) flags.push('iso_rhythm')

  return {
    flags,
    tidyEnding,
    flatPacing,
    tellingHeavy,
    dialogueSandwichCount,
    verbTripleCount,
    embodiedOverload,
    cohesionChainTrigger,
    isoRhythmTrigger,
  }
}

// ── 11. 實體專有名詞鎖（Canonical Entity Lock，純本地 0 Token） ──

export function parseCustomEntityRules(raw = '') {
  const rules = []
  const seen = new Set()
  for (const line of String(raw ?? '').split(/\r?\n/)) {
    const s = line.trim()
    if (!s || s.startsWith('#') || s.startsWith('//')) continue
    const m = s.match(/^(.+?)\s*(?:=>|->|→|=)\s*(.+)$/)
    if (!m) continue
    const from = m[1].trim()
    const to = m[2].trim()
    if (from.length < 2 || !to || from === to || seen.has(from)) continue
    seen.add(from)
    rules.push({ from, to })
  }
  return rules
}

/**
 * 從人物卡與世界書抽出高可信 4～6 字專有名詞，為「漏掉中間某 1 字」產生極保守的防誤寫規則（如「聖殿騎士」→「聖騎士」「聖殿士」可安全訂正）。
 * 會檢查漏字後的形式不得本身就存在於角色卡／世界書中，避免誤傷相近雙名。
 */
export function extractCardOmissionLocks(card) {
  if (!card || typeof card !== 'object') return []
  const chunks = [card.name, card.description, card.personality, card.scenario, card.first_mes]
  const rawEntries = card.character_book?.entries ?? card.characterBook?.entries
  const entries = Array.isArray(rawEntries)
    ? rawEntries
    : (rawEntries && typeof rawEntries === 'object' ? Object.values(rawEntries) : [])
  const explicitKeyTerms = []
  if (typeof card.name === 'string' && /^[\u4e00-\u9fff]{4,6}$/.test(card.name.trim())) {
    explicitKeyTerms.push(card.name.trim())
  }
  for (const e of entries) {
    if (!e || e.enabled === false) continue
    if (typeof e.comment === 'string') chunks.push(e.comment)
    if (typeof e.name === 'string') chunks.push(e.name)
    if (Array.isArray(e.keys)) {
      chunks.push(e.keys.join(' '))
      for (const k of e.keys) {
        const kw = String(k ?? '').trim()
        if (/^[\u4e00-\u9fff]{4,6}$/.test(kw)) explicitKeyTerms.push(kw)
      }
    }
    if (typeof e.content === 'string') chunks.push(e.content.slice(0, 600))
  }
  const corpus = chunks.filter(Boolean).join('\n')
  if (!corpus) return []

  const counts = new Map()
  for (const w of explicitKeyTerms) {
    if (!/[的了在是有和與對把被]/.test(w)) counts.set(w, (counts.get(w) || 0) + 2)
  }
  // 提取括號內專名、人名／地名／組織名／稱號等 4～6 字高頻詞彙
  for (const m of corpus.matchAll(/(?:『|「|（|\(|【)([\u4e00-\u9fff]{4,6})(?:』|」|）|\)|】)/g)) {
    const w = m[1]
    if (!/[的了在是有和與對把被]/.test(w)) counts.set(w, (counts.get(w) || 0) + 2)
  }
  for (const m of corpus.matchAll(/(?:^|[\s，。；：「『(（])([\u4e00-\u9fff]{4,6})(?:（|：|是|的|號|位)/g)) {
    const w = m[1]
    if (!/[的了在是有和與對把被]/.test(w)) counts.set(w, (counts.get(w) || 0) + 1)
  }

  const locks = []
  const seenFrom = new Set()
  const candidates = Array.from(counts.entries())
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)

  for (const [canon] of candidates) {
    for (let pos = 1; pos < canon.length - 1; pos++) {
      const omitted = canon.slice(0, pos) + canon.slice(pos + 1)
      if (omitted.length < 3 || corpus.includes(omitted) || seenFrom.has(omitted)) continue
      seenFrom.add(omitted)
      locks.push({ from: omitted, to: canon })
    }
  }
  return locks
}

const CARD_GENERIC_SKIP = new Set([
  '主角', '配角', '角色', '設定', '设定', '性格', '外貌', '背景', '世界', '規則', '规则',
  '注意事項', '注意事项', '禁止', '要求', '備註', '备注', '關係', '关系', '對話', '对话',
  '技能', '武器', '職業', '职业', '戰隊', '战队', '公會', '公会', '帳號', '账号', '介紹', '介绍',
])

export function extractCardProperNouns(card) {
  if (!card || typeof card !== 'object') return []
  const terms = new Set()
  const addFromChunk = (raw, allowSingle = false) => {
    for (const m of String(raw ?? '').matchAll(/[\u4e00-\u9fff]{2,8}/g)) {
      const w = m[0]
      if (!CARD_GENERIC_SKIP.has(w) && !/[的了在是有和與對把被]/.test(w)) {
        terms.add(w)
      }
    }
    if (allowSingle) {
      const cleaned = String(raw ?? '').trim()
      if (/^[\u4e00-\u9fff]{2,6}$/.test(cleaned) && !CARD_GENERIC_SKIP.has(cleaned)) terms.add(cleaned)
    }
  }

  if (typeof card.name === 'string') addFromChunk(card.name, true)
  const rawEntries = card.character_book?.entries ?? card.characterBook?.entries
  const entries = Array.isArray(rawEntries)
    ? rawEntries
    : (rawEntries && typeof rawEntries === 'object' ? Object.values(rawEntries) : [])
  for (const e of entries) {
    if (!e || e.enabled === false) continue
    if (typeof e.name === 'string') addFromChunk(e.name, true)
    if (typeof e.comment === 'string') addFromChunk(e.comment, true)
    const keys = Array.isArray(e.keys) ? e.keys : (Array.isArray(e.key) ? e.key : (typeof e.keys === 'string' ? e.keys.split(/[,，、]+/) : []))
    for (const k of keys) addFromChunk(k, true)
  }

  const bodyChunks = [card.description, card.personality, card.scenario, card.first_mes]
  for (const e of entries) {
    if (e && e.enabled !== false && typeof e.content === 'string') bodyChunks.push(e.content.slice(0, 1200))
  }
  const body = bodyChunks.filter(Boolean).join('\n')
  for (const m of body.matchAll(/(?:『|「|（|\(|【|《|\*\*)([\u4e00-\u9fff]{2,6})(?:』|」|）|\)|】|》|\*\*)/g)) {
    addFromChunk(m[1], true)
  }
  for (const m of body.matchAll(/(?:角色名?|姓名|人物|主角|隊員|队员|隊長|队长|戰隊|战队|公會|公会|帳號卡?|账号卡?|銀武|银武|武器|稱號|称号|綽號|绰号|門派|门派|宗門|宗门)\s*[：:=為为是]\s*([\u4e00-\u9fff]{2,6})/g)) {
    addFromChunk(m[1], true)
  }
  for (const m of body.matchAll(/(?:^|[\n，。；：「『(（\s\-*•])([\u4e00-\u9fff]{2,5})\s*(?:（|\(|：|:|戰隊|战队|公會|公会)/g)) {
    addFromChunk(m[1], true)
  }
  return Array.from(terms)
}

export function detectLikelyProperNouns(text) {
  const src = String(text ?? '')
  if (!src) return []
  const found = new Set()
  const add = (w) => {
    const clean = String(w ?? '').trim()
    if (clean.length >= 2 && clean.length <= 6 && !CARD_GENERIC_SKIP.has(clean) && !/[的了在是有和與對把被將]/.test(clean)) {
      found.add(clean)
    }
  }
  // 括號／引號標記的專名、角色名、遊戲帳號卡或武器技能名（如「木恩」「獨活」「微草」）
  for (const m of src.matchAll(/[「『【《（(]([\u4e00-\u9fff]{2,6})[」』】》）)]/g)) {
    add(m[1])
  }
  // 組織／稱謂／職業／操控後綴詞前緊鄰的 2–4 字專名
  for (const m of src.matchAll(/([\u4e00-\u9fff]{2,4})(?:戰隊|战队|公會|公会|隊員|队员|隊長|队长|副隊|副队|選手|选手|先生|小姐|前輩|前辈|學長|学长|師兄|师兄|師姐|师姐)/g)) {
    add(m[1])
  }
  // 帳號操控或言說動詞前緊鄰的人名／帳號名
  for (const m of src.matchAll(/(?:操控|操縱|操作|控制|名叫|叫做|名為|名为)\s*(?:著|着|了)?\s*([\u4e00-\u9fff]{2,4})/g)) {
    add(m[1])
  }
  for (const m of src.matchAll(/(?:^|[。！？\n「」『』“”，、\s])([\u4e00-\u9fff]{2,3})(?:說道|说道|問道|问道|笑道|笑著|笑着|開口|开口|挑眉|點頭|点头|搖頭|摇头|抬眼|看了一眼|盯著|盯着|轉頭|转头|舉起|举起|揮出|挥出|操作著|操作着)/g)) {
    if (!/^(?:自己|大家|兩人|两人|眾人|众人|他們|她們|彼此|對方|对方|那人|這人|这时|這時|然後|然而|不過|只是|沒有|已经|已經)$/.test(m[1])) {
      add(m[1])
    }
  }
  return Array.from(found)
}

export function isCooldownExcludedTerm(term, excludedTerms = []) {
  const t = String(term ?? '').trim()
  if (!t || !Array.isArray(excludedTerms) || !excludedTerms.length) return false
  for (const raw of excludedTerms) {
    const ex = String(raw ?? '').trim()
    if (ex.length < 2) continue
    if (t === ex || ex.includes(t) || t.includes(ex)) return true
  }
  return false
}

export function applyEntityLocks(text, rules = []) {
  let out = String(text ?? '')
  if (!out || !Array.isArray(rules) || rules.length === 0) {
    return { text: out, fixes: [], total: 0 }
  }
  const fixes = []
  let total = 0
  // 先換較長的錯詞，避免部分前綴截斷
  const ordered = [...rules].sort((a, b) => b.from.length - a.from.length)
  for (const { from, to } of ordered) {
    if (!from || !to || from === to || !out.includes(from)) continue
    const idxInTo = to.indexOf(from)
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(escaped, 'g')
    let count = 0
    out = out.replace(re, (match, offset, full) => {
      // 若錯詞是目標全稱的前／後綴且當前位置已經是正確全稱，略過避免重複補字
      if (idxInTo >= 0 && offset - idxInTo >= 0 && full.slice(offset - idxInTo, offset - idxInTo + to.length) === to) {
        return match
      }
      count += 1
      return to
    })
    if (count > 0) {
      fixes.push({ from, to, count })
      total += count
    }
  }
  return { text: out, fixes, total }
}

// ── 12. 知而不言邊界：偵測對白裡強行念設定集（純本地 0 Token） ──

const INFO_DUMP_PATTERNS = Object.freeze([
  /(?:第[一二三四五六七八九十百\d]+(?:任|代|紀元|紀|階段|屆|届|賽季|赛季|年)|(?:[一二三四五六七八九十百\d]+年前|[12]\d{3}年))[^「」『』“”"\n]{0,16}(?:創立|创立|成立|建立|建隊|建队|締結|缔结|頒布|颁布|廢除|废除|畢業|毕业|退役|奪冠|夺冠|誕生|诞生|覆滅|覆灭|封印)/,
  /(?:創立|创立|成立|建立|建隊|建队|締結|缔结|頒布|颁布|廢除|废除|畢業|毕业|退役|奪冠|夺冠|覆滅|覆灭|封印)[^「」『』“”"\n]{0,16}(?:第[一二三四五六七八九十百\d]+(?:任|代|紀元|紀|屆|届|賽季|赛季)|[一二三四五六七八九十百\d]+年前|[12]\d{3}年)/,
  /(?:正如你(?:所知|知道的)|你應該(?:很)?記得當年|它的由來是|這個(?:稱號|組織|規矩|制度|秘密)(?:是從|源自)|按照(?:這裡的)?(?:規定|規矩|制度|定律)只有|這套(?:制度|體系|機制|規則)分為|(?:全城|全國|全校|全聯盟|全宗門|全世界|人人)都知道[^「」『』“”"\n]{2,18}(?:當年|其實|原本))/,
])

export function detectInfoDumpDialogue(text) {
  const src = String(text ?? '')
  if (!src) return { count: 0, samples: [] }
  const samples = []
  for (const m of src.matchAll(/[「『“"]([^「」『』“”"\n]{14,280})[」』”"]/g)) {
    const line = m[1]
    if (INFO_DUMP_PATTERNS.some((re) => re.test(line))) {
      samples.push(line.slice(0, 48))
    }
  }
  return { count: samples.length, samples: samples.slice(0, 4) }
}

// ── 13. 整本小說分層採樣與客觀語言指紋統計（純本地） ──

const CHAPTER_HEADING_RE = /^(?:第[一二三四五六七八九十百千萬\d]+[章回節卷部集篇]|Chapter\s+\d+|序章|楔子|尾聲|後記|番外)[^\n]{0,40}$/i

export function analyzeAndSampleNovel(rawText, options = {}) {
  const src = String(rawText ?? '').replace(/\r\n?/g, '\n').trim()
  const maxTotalChars = Math.max(800, Number(options.maxTotalChars) || 4800)
  const sliceCount = Math.max(2, Math.min(8, Number(options.sliceCount) || 6))
  if (!src) {
    return { totalChars: 0, statsSummary: '', excerpt: '', sliceCount: 0 }
  }

  const totalChars = src.replace(/\s+/g, '').length
  // 大檔（>12萬字）取 12 段均勻樣本做統計掃描，避免手機端正規表達式卡頓
  let scanText = src
  if (src.length > 120000) {
    const step = Math.floor(src.length / 12)
    const blocks = []
    for (let i = 0; i < 12; i++) {
      const start = Math.min(src.length - 8000, i * step)
      blocks.push(src.slice(Math.max(0, start), Math.max(0, start) + 8000))
    }
    scanText = blocks.join('\n')
  }

  const lines = scanText.split('\n').map((l) => l.trim()).filter(Boolean)
  const dialogueLines = lines.filter((l) => /^[「『“"‘']/.test(l) || /[」』”"]\s*$/.test(l))
  const dialogueRatio = lines.length ? Math.round((dialogueLines.length / lines.length) * 100) : 0

  const sentLens = scanText
    .split(/[。！？!?\n]+/)
    .map((s) => s.replace(/[\s「」『』“”"（）()《》…—，、；：,.]/g, '').length)
    .filter((n) => n >= 2)
  const avgSentLen = sentLens.length
    ? Math.round((sentLens.reduce((a, b) => a + b, 0) / sentLens.length) * 10) / 10
    : 0
  const shortSentRatio = sentLens.length
    ? Math.round((sentLens.filter((n) => n <= 12).length / sentLens.length) * 100)
    : 0
  const paraLens = lines.filter((l) => !CHAPTER_HEADING_RE.test(l)).map((l) => l.replace(/\s+/g, '').length)
  const avgParaLen = paraLens.length
    ? Math.round(paraLens.reduce((a, b) => a + b, 0) / paraLens.length)
    : 0

  const wanLabel = totalChars >= 10000 ? `約 ${(totalChars / 10000).toFixed(1)} 萬字` : `${totalChars} 字`
  const statsSummary = `【客觀語言指紋（${wanLabel}）】對話行佔比 ${dialogueRatio}%｜平均句長 ${avgSentLen} 字｜短句（<=12字）佔比 ${shortSentRatio}%｜平均段長 ${avgParaLen} 字`

  if (src.length <= maxTotalChars) {
    return {
      totalChars,
      dialogueRatio,
      avgSentLen,
      shortSentRatio,
      avgParaLen,
      statsSummary,
      excerpt: src,
      sliceCount: 1,
    }
  }

  const perSliceBudget = Math.max(420, Math.floor((maxTotalChars - statsSummary.length - 240) / sliceCount))
  const anchors = Array.from({ length: sliceCount }, (_, i) => 0.08 + (0.8 / Math.max(1, sliceCount - 1)) * i)
  const excerpts = []
  let prevEnd = 0
  for (let i = 0; i < anchors.length; i++) {
    const pct = Math.round(anchors[i] * 100)
    let cursor = Math.max(prevEnd + 80, Math.floor(src.length * anchors[i]))
    if (cursor >= src.length - 120) break
    const nl = src.indexOf('\n', cursor)
    if (nl >= 0 && nl - cursor < 400) cursor = nl + 1

    const chunkLines = []
    let collected = 0
    while (cursor < src.length && collected < perSliceBudget) {
      const nextNl = src.indexOf('\n', cursor)
      const end = nextNl >= 0 ? nextNl : src.length
      const line = src.slice(cursor, end).trim()
      cursor = end + 1
      if (!line || CHAPTER_HEADING_RE.test(line)) continue
      // 跳過明顯作者公告／求票／目錄行
      if (/(?:求月票|求推薦|加更|作者的話|第.{1,6}章\s+\S+$)/.test(line) && line.length < 36) continue
      chunkLines.push(line)
      collected += line.length + 1
    }
    prevEnd = cursor
    if (chunkLines.length) {
      excerpts.push(`--- 採樣片段 ${excerpts.length + 1}（約 ${pct}% 處）---\n${chunkLines.join('\n')}`)
    }
  }

  const excerpt = excerpts.length ? excerpts.join('\n\n') : src.slice(0, maxTotalChars)
  return {
    totalChars,
    dialogueRatio,
    avgSentLen,
    shortSentRatio,
    avgParaLen,
    statsSummary,
    excerpt,
    sliceCount: excerpts.length || 1,
  }
}

// ── 14. 文風白名單等長掩碼（取自 dsh-novel-forge style-whitelist.js，純本地 0 Token） ──

export const WHITELIST_MASK_CHAR = '\u0000'

export function parseWhitelistLines(raw = '') {
  const lines = String(raw ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'))
  return [...new Set(lines)].sort((a, b) => b.length - a.length)
}

export function maskWhitelistSpans(text, literals = []) {
  const src = String(text ?? '')
  const lit = (Array.isArray(literals) ? literals : parseWhitelistLines(literals))
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
  if (!src || !lit.length) return { text: src, maskedSpans: [], maskedChars: 0 }

  const masked = new Array(src.length).fill(false)
  const maskedSpans = []
  for (const w of lit) {
    for (let at = src.indexOf(w); at !== -1; at = src.indexOf(w, at + w.length)) {
      let overlapped = false
      for (let i = at; i < at + w.length; i++) {
        if (masked[i]) {
          overlapped = true
          break
        }
      }
      if (overlapped) continue
      for (let i = at; i < at + w.length; i++) masked[i] = true
      maskedSpans.push({ start: at, length: w.length, literal: w })
    }
  }
  if (!maskedSpans.length) return { text: src, maskedSpans: [], maskedChars: 0 }
  let out = ''
  let maskedChars = 0
  for (let i = 0; i < src.length; i++) {
    if (masked[i]) {
      out += WHITELIST_MASK_CHAR
      maskedChars += 1
    } else {
      out += src[i]
    }
  }
  return { text: out, maskedSpans, maskedChars }
}

// ── 15. 全通用無詞表高頻意象抽取（純本地 0 Token · 自動避開人物／戰隊／帳號等專有名詞） ──

const IMAGERY_STOP_CHARS = new Set(
  '的了着著是在有個一不很都也就還还們们這这那我你他她它和與及或把被讓让給给對从從向到於之其所以但而上下裡里中去來過說问問看想能會要得把卻却又再剛才'.split('')
)

const IMAGERY_COMMON_WORDS = new Set([
  '沒有', '没有', '已經', '已经', '忽然', '突然', '似乎', '彷彿', '仿佛', '自己', '對方', '对方',
  '兩人', '两人', '眾人', '众人', '彼此', '時候', '时候', '片刻', '半晌', '眼前', '面前', '身後', '身后',
  '身邊', '身边', '手裡', '手里', '手中', '眼神', '目光', '神色', '動作', '动作', '聲音', '声音',
  '空氣', '空气', '視線', '视线', '房間', '房间', '門口', '门口', '旁邊', '旁边', '裡面', '里面',
  '外面', '現在', '现在', '剛才', '刚才', '這裡', '这里', '那裡', '那里', '什麼', '什么', '怎麼', '怎么',
  '戰隊', '战队', '公會', '公会', '帳號', '账号', '技能', '比賽', '比赛', '選手', '选手', '隊員', '队员',
])

export function extractDynamicImagery(text, { minLen = 2, maxLen = 4, minCount = 3, limit = 5, excludeTerms = [] } = {}) {
  const src = String(text ?? '')
  const narration = src
    .split('\n')
    .filter((l) => !/[「『“"]/.test(l))
    .join('\n')
  const totalHanzi = (narration.match(/[\u4e00-\u9fff]/g) || []).length
  if (totalHanzi < 60) return {}

  const autoExcluded = detectLikelyProperNouns(src)
  const allExcluded = [...new Set([...(Array.isArray(excludeTerms) ? excludeTerms : []), ...autoExcluded])]

  // 按標點與換行切成獨立漢字片段，避免跨句拼接造出偽 N-gram
  const runs = narration.split(/[^\u4e00-\u9fff]+/).filter((r) => r.length >= minLen)
  const counts = new Map()
  for (const run of runs) {
    for (let len = Math.min(maxLen, run.length); len >= minLen; len--) {
      for (let i = 0; i <= run.length - len; i++) {
        const term = run.slice(i, i + len)
        if (IMAGERY_COMMON_WORDS.has(term)) continue
        let bad = false
        for (const ch of term) {
          if (IMAGERY_STOP_CHARS.has(ch)) {
            bad = true
            break
          }
        }
        if (bad) continue
        if (isCooldownExcludedTerm(term, allExcluded)) continue
        counts.set(term, (counts.get(term) || 0) + 1)
      }
    }
  }

  const hits = Array.from(counts.entries())
    .filter(([, c]) => c >= minCount)
    .sort((a, b) => (b[1] - a[1]) || (b[0].length - a[0].length))

  // 若長詞已計入，避免把它的純子串重複放進冷卻池
  const kept = {}
  const keptTerms = []
  for (const [term, c] of hits) {
    if (keptTerms.some((k) => k.includes(term))) continue
    kept[term] = c
    keptTerms.push(term)
    if (keptTerms.length >= limit) break
  }
  return kept
}

// ── 16. 寫作範例輪轉庫自動提取與確定性輪轉 ──

export function extractStyleAnchorsFromText(rawText, { maxAnchors = 6 } = {}) {
  const src = String(rawText ?? '').replace(/\r\n?/g, '\n').trim()
  if (!src) return []
  const paras = src
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p && !CHAPTER_HEADING_RE.test(p))
    .filter((p) => !/(?:求月票|求推薦|加更|作者的話)/.test(p))
    .filter((p) => !/^(?:【客觀語言指紋|---\s*採樣片段)/.test(p))

  const pickByRange = (minLen, maxLen) => {
    const out = []
    for (const p of paras) {
      const len = p.replace(/\s+/g, '').length
      if (len < minLen || len > maxLen) continue
      const quotes = (p.match(/[「『“"]/g) || []).length
      out.push({
        kind: quotes >= 2 ? 'dialogue' : 'narration',
        text: p,
        scoreDiff: Math.abs(len - 135),
      })
    }
    return out
  }
  let cands = pickByRange(55, 260)
  if (cands.length < 2) {
    cands = pickByRange(35, 280)
  }
  const dialPool = cands.filter((c) => c.kind === 'dialogue').sort((a, b) => a.scoreDiff - b.scoreDiff)
  const narrPool = cands.filter((c) => c.kind === 'narration').sort((a, b) => a.scoreDiff - b.scoreDiff)
  const picked = []
  const seen = new Set()
  const half = Math.ceil(maxAnchors / 2)
  for (let i = 0; i < Math.max(dialPool.length, narrPool.length) && picked.length < maxAnchors; i++) {
    if (i < narrPool.length && picked.filter((x) => x.kind === 'narration').length < half && !seen.has(narrPool[i].text)) {
      seen.add(narrPool[i].text)
      picked.push(narrPool[i])
    }
    if (picked.length >= maxAnchors) break
    if (i < dialPool.length && picked.filter((x) => x.kind === 'dialogue').length < half && !seen.has(dialPool[i].text)) {
      seen.add(dialPool[i].text)
      picked.push(dialPool[i])
    }
  }
  return picked.map((x) => x.text)
}

export function rotateSampleAnchors(rawAnchorsText, { offset = 0, limit = 2 } = {}) {
  const blocks = String(rawAnchorsText ?? '')
    .split(/\n\s*---\s*\n|\n\s*===\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length >= 25)
  if (!blocks.length) return { selected: [], total: 0 }
  const win = Math.max(1, Math.min(3, Number(limit) || 2))
  if (blocks.length <= win) return { selected: blocks, total: blocks.length }
  const start = (((Number(offset) || 0) % blocks.length) + blocks.length) % blocks.length
  const rotated = [...blocks.slice(start), ...blocks.slice(0, start)].slice(0, win)
  return { selected: rotated, total: blocks.length }
}

// ── 17. 多角色語言基因卡與精準禁忌詞巡檢（取自 dsh-novel-forge voice.js） ──

export function parseCharacterVoices(raw = '') {
  const out = []
  const seen = new Set()
  for (const line of String(raw ?? '').split(/\r?\n/)) {
    const s = line.trim()
    if (!s || s.startsWith('#') || s.startsWith('//')) continue
    const parts = s.split('|').map((x) => x.trim()).filter(Boolean)
    if (!parts.length) continue
    const name = parts[0].replace(/^(?:角色名?|人物)\s*[=：:]\s*/, '').trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    const profile = { name, tics: [], taboo: [], tone: '' }
    for (const seg of parts.slice(1)) {
      const m = seg.match(/^([^=：:]+)\s*[=：:]\s*(.+)$/)
      if (!m) {
        profile.tone = profile.tone ? `${profile.tone}；${seg}` : seg
        continue
      }
      const k = m[1].trim()
      const v = m[2].trim()
      if (/^(?:口頭禪|口头禅|口癖|tics?)$/i.test(k)) {
        profile.tics.push(...v.split(/[,，、/]+/).map((x) => x.trim()).filter(Boolean))
      } else if (/^(?:絕不說|绝不说|禁忌詞?|taboo)$/i.test(k)) {
        profile.taboo.push(...v.split(/[,，、/]+/).map((x) => x.trim()).filter(Boolean))
      } else {
        profile.tone = profile.tone ? `${profile.tone}；${k}：${v}` : `${k}：${v}`
      }
    }
    if (profile.tics.length || profile.taboo.length || profile.tone) {
      out.push(profile)
    }
    if (out.length >= 10) break
  }
  return out
}

const CLAUSE_BOUNDARY_RE = /[\s，,、；;：:。．.！!？?…·—－"'“”‘’「」『』（）()【】《》[\]{}]/
const DLG_OPEN_SET = new Set(['「', '『', '“', '‘'])
const DLG_CLOSE_SET = new Set(['」', '』', '”', '’'])

export function clauseHits(text, phrase) {
  const s = String(text ?? '')
  const p = String(phrase ?? '')
  if (!s || !p) return []
  const inDialogue = new Uint8Array(s.length)
  let depth = 0
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    let inside = depth > 0
    if (ch === '"') {
      depth = depth > 0 ? depth - 1 : depth + 1
      inside = depth > 0
    } else if (DLG_OPEN_SET.has(ch)) {
      depth += 1
      inside = true
    } else if (DLG_CLOSE_SET.has(ch)) {
      depth = Math.max(0, depth - 1)
      inside = depth > 0
    }
    inDialogue[i] = inside ? 1 : 0
  }
  const hits = []
  let from = 0
  while (from < s.length) {
    const idx = s.indexOf(p, from)
    if (idx < 0) break
    const before = idx === 0 ? '' : s[idx - 1]
    const quoted = inDialogue[idx] === 1
    const atClauseStart = idx === 0 || CLAUSE_BOUNDARY_RE.test(before)
    if (quoted || atClauseStart) hits.push({ index: idx, quoted, atClauseStart })
    from = idx + 1
  }
  return hits
}

export function checkVoiceConsistency(text, profiles = []) {
  const s = String(text ?? '')
  if (!s || !Array.isArray(profiles) || !profiles.length) {
    return { checked: 0, tabooHits: [], ticsMissing: [], issues: [] }
  }
  const lines = s.split('\n')
  const tabooHits = []
  const ticsMissing = []
  const issues = []
  let checked = 0

  for (const prof of profiles) {
    if (!prof?.name) continue
    checked += 1
    const esc = prof.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const spokeRe = new RegExp(`${esc}[^\\n]{0,12}(?:說|道|問|答|喊|嘆|嘟囔|回|笑|低聲)|[」』”"]\\s*${esc}(?:說|道|問)`)
    const spoken = lines.some((l) => /[「『“"]/.test(l) && (l.includes(prof.name) && (spokeRe.test(l) || new RegExp(`^${esc}[：:]`).test(l.trim()))))

    for (const bad of (prof.taboo || [])) {
      const m = clauseHits(s, bad)
      if (m.length > 0 && (!spoken ? m.some((x) => x.quoted) : true)) {
        tabooHits.push({ name: prof.name, phrase: bad, count: m.length })
        issues.push(`角色語言破功：「${prof.name}」禁忌詞「${bad}」出現 ${m.length} 處`)
      }
    }
    if (spoken && prof.tics?.length > 0) {
      const anyTic = prof.tics.some((t) => s.includes(t))
      if (!anyTic) {
        ticsMissing.push(prof.name)
      }
    }
  }
  return { checked, tabooHits, ticsMissing, issues }
}

export function formatVoiceInjectionBlock(profiles = []) {
  if (!Array.isArray(profiles) || !profiles.length) return ''
  const lines = profiles.slice(0, 6).map((p) => {
    const bits = []
    if (p.tone) bits.push(`語氣節奏：${p.tone}`)
    if (p.tics?.length) bits.push(`習慣口癖：${p.tics.join('、')}`)
    if (p.taboo?.length) bits.push(`絕不說：${p.taboo.join('、')}`)
    return `- ${p.name}｜${bits.join('｜')}`
  })
  return `【多角色語言基因錨定（嚴防千人一腔）】\n${lines.join('\n')}`
}

export function serializeCharacterVoices(profiles = [], toScript = 'trad') {
  if (!Array.isArray(profiles) || !profiles.length) return ''
  const isSimp = toScript === 'simp'
  const kTone = isSimp ? '语气' : '語氣'
  const kTics = isSimp ? '口头禅' : '口頭禪'
  const kTaboo = isSimp ? '绝不说' : '絕不說'
  return profiles
    .slice(0, 6)
    .filter((p) => p?.name && !/^(?:角色名|人物|範例|范例|example|none|無|无|略)$/i.test(p.name))
    .map((p) => {
      const parts = [p.name]
      if (p.tone) parts.push(`${kTone}=${p.tone}`)
      if (p.tics?.length) parts.push(`${kTics}=${p.tics.join('、')}`)
      if (p.taboo?.length) parts.push(`${kTaboo}=${p.taboo.join('、')}`)
      return parts.join(' | ')
    })
    .join('\n')
}

export function splitExtractStyleSections(rawOut = '') {
  let src = String(rawOut ?? '').replace(/\r\n?/g, '\n').trim()
  src = src.replace(/^\s*```[a-zA-Z]*\s*\n?/, '').replace(/\n?```\s*$/, '').trim()
  if (!src) return { styleRaw: '', voiceRaw: '' }

  const voiceMarkerRe = /(?:^|\n)\s*(?:===\s*CHARACTER_VOICES\s*===|【(?:多)?角色語言基因卡?】|【(?:多)?角色语言基因卡?】)\s*(?:\n|$)/i
  const styleMarkerRe = /^\s*(?:===\s*STYLE_CARD\s*===|【(?:正面)?文風(?:規範|指南)?卡?】|【(?:正面)?文风(?:规范|指南)?卡?】)\s*\n?/i

  const vm = voiceMarkerRe.exec(src)
  if (!vm) {
    return { styleRaw: src.replace(styleMarkerRe, '').trim(), voiceRaw: '' }
  }
  const styleRaw = src.slice(0, vm.index).replace(styleMarkerRe, '').trim()
  let voiceRaw = src.slice(vm.index + vm[0].length).trim()
  if (/^(?:none|無|无|\(無\)|（無）|（无）|無明顯多角色對白|无明显多角色对白)$/i.test(voiceRaw)) {
    voiceRaw = ''
  } else {
    voiceRaw = voiceRaw
      .split('\n')
      .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)、])\s*/, '').trim())
      .filter((l) => l && !/^(?:none|無|无|略)$/i.test(l))
      .join('\n')
  }
  return { styleRaw, voiceRaw }
}

// ── 18. 言說動詞賓語被物件頂替語病（取自 dsh-novel-forge polish.js findSpeechObjDefects） ──

const SPEECH_OBJ_DEFECT_RE = /(?:把|將|将)([^，。！？；、\s]{2,16}?)(?:喊|嚷|吼|吆喝|說|说|講|讲|念|告訴|告诉|宣布)(?:了|著|着|過|过)[^，。！？；、\s]{0,4}?(?:街|巷|村|鎮|镇|城|院|樓|楼|路)/g
const SPEECH_CONTENT_WORDS_RE = /話|话|名|事|消息|秘密|想法|主意|經過|经过|來意|来意|真相|實情|实情|原委|條件|条件|要求|意見|意见|感受|經歷|经历|供詞|供词|口供/

export function findSpeechObjDefects(text) {
  const out = []
  const s = String(text ?? '')
  const re = new RegExp(SPEECH_OBJ_DEFECT_RE.source, 'g')
  let m = re.exec(s)
  while (m !== null) {
    const obj = m[1] || ''
    if (!SPEECH_CONTENT_WORDS_RE.test(obj) && !/^[他她它我你咱]{1,2}(?:們|们|自己)?$/.test(obj)) {
      out.push(m[0])
    }
    m = re.exec(s)
  }
  return out
}

// ── 19. 敘事句法翻譯腔／同構句拍／列表前綴／MTLD／銜接連環／生理過度（純本地 0 Token） ──

const SYNTAX_TRANS_RULES = Object.freeze([
  { key: 'when_clause', re: /(?:^|[，。！？\n])\s*[當当][^，。！？\n]{2,18}(?<!的時候|的时候)[時时][，,]/g },
  { key: 'topic_shell', re: /(?:對於|对于|關於|关于)[^，。！？\n]{1,14}(?:來說|来说|而言)|(?:對|对|就)[^，。！？\n]{1,14}而言/g },
  { key: 'process_case', re: /在[^，。！？\n]{2,18}的(?:過程中|过程中|情況下|情况下)/g },
  { key: 'way_manner', re: /以一[種种][^，。！？\n]{2,12}的(?:方式|形式)/g },
  { key: 'de_triple_chain', re: /的[^，。！？\n]{1,8}的[^，。！？\n]{1,8}的/g },
  { key: 'padding_verb', re: /(?:進行|进行)(?:了)?(?:討論|讨论|分析|溝通|沟通|對話|对话|調查|调查|解釋|解释|整理|處理|处理|觀察|观察|試探|试探)|(?:加以|予以)(?:說明|说明|處理|处理|安撫|安抚|制止|拒絕|拒绝)|(?:做出|作出)(?:了)?(?:決定|决定|選擇|选择|回應|回应|讓步|让步)/g },
])

export function scanSyntaxAndTranslationese(text) {
  const src = String(text ?? '')
  if (!src.trim()) return { total: 0, counts: {}, paddingVerbs: 0, scareQuotes: 0, samples: [] }
  const nonQuote = src
    .split('\n')
    .filter((l) => !isDialogueLine(l))
    .join('\n')
    .replace(/[「『“"][^「」『』“”"\n]{1,160}[」』”"]/g, ' ')

  const counts = {}
  const samples = []
  let total = 0
  for (const rule of SYNTAX_TRANS_RULES) {
    const matches = nonQuote.match(rule.re) || []
    if (matches.length) {
      counts[rule.key] = matches.length
      total += matches.length
      for (const m of matches.slice(0, 2)) {
        const clean = m.replace(/^[，。！？\s]+/, '').trim()
        if (clean && samples.length < 6) samples.push(clean.slice(0, 32))
      }
    }
  }
  const scareQuotes = countNonDialogueScareQuotes(src)
  return {
    total,
    counts,
    paddingVerbs: counts.padding_verb || 0,
    scareQuotes,
    samples,
  }
}

export function countNonDialogueScareQuotes(text) {
  const lines = String(text ?? '').split(/\n+/).filter((l) => l.trim() && !isDialogueLine(l))
  let count = 0
  for (const l of lines) {
    const m = l.match(/[「『“"][^「」『』“”"\n]{2,8}[」』”"]/g) || []
    count += m.length
  }
  return count
}

export function calcFunctionCharRatio(text) {
  const src = String(text ?? '')
  const hanziCount = (src.match(/[\u4e00-\u9fff]/g) || []).length
  if (!hanziCount) return 0
  const fnCount = (src.match(/[的著着了把被將在]/g) || []).length
  return Number((fnCount / hanziCount).toFixed(3))
}

export function calcSentenceIsomorphism(text) {
  const sents = String(text ?? '')
    .split(/[。！？!?]+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 10 && !isDialogueLine(x))
  const sigs = sents.map((s) => {
    const commas = (s.match(/[，,]/g) || []).length
    if (commas < 1) return null
    const hasColon = /[：:]/.test(s) ? 1 : 0
    const hasParen = /[（(]/.test(s) ? 1 : 0
    const bucket = Math.floor((s.match(/[\u4e00-\u9fff]/g) || []).length / 15)
    return `${commas}|${hasColon}|${hasParen}|${bucket}`
  })

  let pairCount = 0
  let tripleCount = 0
  const pairSents = []
  let run = 1
  for (let i = 1; i < sigs.length; i++) {
    if (sigs[i] && sigs[i] === sigs[i - 1]) {
      run += 1
      if (run === 2) {
        pairCount += 1
        pairSents.push(sents[i].slice(0, 32))
      } else if (run === 3) {
        tripleCount += 1
      }
    } else {
      run = 1
    }
  }
  return { pairCount, tripleCount, samples: pairSents.slice(0, 3) }
}

export function detectListLikePrefixRun(text) {
  const sents = String(text ?? '')
    .split(/[。！？!?\n]+/)
    .map((x) => x.replace(/^[—\-–。，、！？；：…「」『』（）()《》〈〉"'\s]+/, '').trim())
    .filter((x) => x.length >= 4 && !/^\d/.test(x))
  const runs = []
  let i = 0
  while (i < sents.length) {
    const prefix = sents[i].slice(0, 2)
    let j = i + 1
    while (j < sents.length && sents[j].slice(0, 2) === prefix) j += 1
    if (j - i >= 3) {
      runs.push({ prefix, length: j - i })
    }
    i = j
  }
  return { runs }
}

export function estimateBigramMtld(text) {
  const chars = String(text ?? '')
    .split('\n')
    .filter((l) => !isDialogueLine(l))
    .join('')
    .replace(/[^\u4e00-\u9fff]/g, '')
  if (chars.length < 80) return null
  const toks = []
  for (let i = 0; i < chars.length - 1; i++) toks.push(chars.slice(i, i + 2))
  const pass = (arr) => {
    let factors = 0
    const types = new Set()
    let count = 0
    for (const tok of arr) {
      count += 1
      types.add(tok)
      if (count >= 10 && (types.size / count) < 0.72) {
        factors += 1
        types.clear()
        count = 0
      }
    }
    if (count > 0) {
      factors += (1 - types.size / count) / (1 - 0.72)
    }
    return factors > 0 ? arr.length / factors : arr.length
  }
  const f = pass(toks)
  const r = pass([...toks].reverse())
  return Number(((f + r) / 2).toFixed(1))
}

const FICTION_SYNONYM_GROUPS = Object.freeze([
  ['看', '盯', '望', '瞧', '瞥', '注視', '注视', '凝視', '凝视', '打量'],
  ['笑', '輕笑', '轻笑', '低笑', '哂笑', '冷笑', '微笑', '嘴角微揚', '嘴角微扬'],
  ['說', '说', '道', '開口', '开口', '喃喃', '低語', '低语', '嘟囔', '咕噥'],
  ['突然', '忽然', '陡然', '驟然', '骤然', '猛然', '猛地', '瞬間', '瞬间', '頓時', '顿时'],
])

export function detectSynonymSwaps(text, windowChars = 260) {
  const src = String(text ?? '')
  if (src.length < 60) return { windowCount: 0, samples: [] }
  let windowCount = 0
  const samples = []
  for (let start = 0; start < src.length; start += Math.floor(windowChars / 2)) {
    const win = src.slice(start, start + windowChars)
    for (const grp of FICTION_SYNONYM_GROUPS) {
      const hitTerms = grp.filter((w) => win.includes(w))
      if (hitTerms.length >= 3) {
        windowCount += 1
        if (samples.length < 4) samples.push(hitTerms.slice(0, 4).join('/'))
        break
      }
    }
  }
  return { windowCount, samples }
}

const COHESION_START_RE = /^(?:然而|因此|於是|于是|所以|不過|不过|這時|这时|他|她|那|這|这|緊接著|紧接着|與此同時|与此同时)/

export function countParagraphCohesionChain(text) {
  const paras = String(text ?? '').split(/\n+/).map((p) => p.trim()).filter(Boolean)
  if (paras.length < 3) return { maxChain: 0 }
  let maxChain = 0
  let cur = 0
  for (let i = 1; i < paras.length; i++) {
    const p = paras[i]
    if (!isDialogueLine(p) && COHESION_START_RE.test(p)) {
      cur += 1
      if (cur > maxChain) maxChain = cur
    } else {
      cur = 0
    }
  }
  return { maxChain }
}

const EMBODIED_CUES_RE = /(?:心跳(?:漏|加速|狂跳)|呼吸一[滯滞]|喉[嚨結喉](?:發緊|发紧|滾動|滚动)|指尖(?:發涼|发凉|微顫|微颤)|冷汗|胃裡一沉|胃里一沉|胸口(?:發悶|发闷|一窒|壓|紧|緊)|瞳孔(?:微縮|微缩|驟縮|骤缩)|脊背發涼|脊背发凉)/g
const DIRECT_EMOTION_RE = /(?:害怕|恐懼|恐惧|生氣|生气|憤怒|愤怒|焦慮|焦虑|緊張|紧张|委屈|難過|难过|高興|高兴|開心|开心|嫉妒|絕望|绝望|慌了|怕了|急了|氣壞|气坏)/

export function detectEmbodiedOverload(text) {
  const src = String(text ?? '')
  const hits = (src.match(EMBODIED_CUES_RE) || []).length
  const direct = DIRECT_EMOTION_RE.test(src)
  return { hits, directEmotionPresent: direct, overloaded: hits >= 4 && !direct }
}

// ── 20. 非對白零資訊廢話無損預清理 ＋ 標點塌縮修復（來自 plainspoken rewriter.py，純本地 0 Token） ──

const SAFE_FILLER_OPENERS = Object.freeze([
  '不可否認的是，', '不可否认的是，', '顯而易見的是，', '显而易见的是，',
  '不言而喻的是，', '毋庸置疑的是，', '可以肯定的是，', '值得一提的是，',
  '值得注意的是，', '需要指出的是，', '不得不說的是，', '不得不说的是，',
  '不可否認，', '不可否认，', '顯而易見，', '显而易见，',
  '眾所周知，', '众所周知，', '不難看出，', '不难看出，',
  '毋庸置疑，', '毋庸讳言，', '毋庸諱言，', '毫無疑問，', '毫无疑问，',
  '總而言之，', '总而言之，', '綜上所述，', '综上所述，',
])

export function preCleanNarrativeFillers(text, { whitelist = [] } = {}) {
  const src = String(text ?? '')
  if (!src) return { text: src, count: 0, removed: [] }
  const wl = Array.isArray(whitelist) ? whitelist : parseWhitelistLines(whitelist)
  const masked = wl.length ? maskWhitelistSpans(src, wl).text : src
  const lines = src.split('\n')
  const maskedLines = masked.split('\n')
  let count = 0
  const removed = []

  const outLines = lines.map((line, li) => {
    const trimmed = line.trim()
    if (!trimmed || isDialogueLine(trimmed)) return line
    // 若開頭處在引號或白名單保護區內則跳過
    const leadIdx = line.indexOf(trimmed)
    const mLine = maskedLines[li] || line
    let next = line
    let changed = false
    for (const filler of SAFE_FILLER_OPENERS) {
      const fIdx = next.indexOf(filler)
      if (fIdx < 0) continue
      // 僅清句首／逗號句首位置，且不得覆蓋到掩碼字元與引號內
      const atBoundary = fIdx === leadIdx || /[。！？\s]/.test(next[fIdx - 1] || '')
      if (!atBoundary) continue
      const inQuotesBefore = (next.slice(0, fIdx).match(/[「『“"]/g) || []).length % 2 === 1
      if (inQuotesBefore) continue
      const maskedSlice = mLine.slice(fIdx, fIdx + filler.length)
      if (maskedSlice.includes(WHITELIST_MASK_CHAR)) continue
      next = next.slice(0, fIdx) + next.slice(fIdx + filler.length)
      count += 1
      removed.push(filler.replace(/[，,]$/, ''))
      changed = true
    }
    if (changed) {
      next = next.replace(/([，,]){2,}/g, '$1').replace(/([。！？]){2,}/g, '$1').replace(/^(\s*)[，、；]+/, '$1')
    }
    return next
  })

  return { text: outLines.join('\n'), count, removed: [...new Set(removed)] }
}

// ── 21. AI 味綜合濃度評分與細節抵銷引擎 ＋ 模型家族指紋自適應 ──

const CONCRETE_ANCHOR_RE = /(?:昨天|前天|昨晚|上周|上週|週[一二三四五六日天]|\d{1,2}月\d{1,2}日|\d{1,2}點|[一二三四五六七八九十\d]+(?:塊錢|块钱|分鐘|分钟|小時|小时|步|斤|兩))/g

export function calcAiConcentration(text, options = {}) {
  const s = String(text ?? '')
  if (!s.trim()) return { score: 0, level: 'low', anchorHits: 0, imperfectionHits: 0, modalDensity: 0 }
  const tells = options.tells || scanWebNovelAiTells(s, 'balanced')
  const health = options.health || analyzeLocalNovelHealth(s, 'full')
  const syntax = health.syntax || scanSyntaxAndTranslationese(s)

  const sentCount = Math.max(1, (s.match(/[。！？!?]+/g) || []).length)
  let rawScore = 0
  // 根因類（對舉 / 翻譯腔 / T1 模板 / 膨脹動詞殼）
  rawScore += Math.min(0.6, tells.t1Count * 0.14)
  rawScore += Math.min(0.5, syntax.total * 0.1)
  rawScore += Math.min(0.45, (options.antithesisCount || 0) * 0.12)
  // 並發／節奏類（副詞密、同構、列表、抒情堆砌）
  rawScore += tells.softTriggered ? 0.14 : Math.min(0.08, tells.softCount * 0.02)
  rawScore += Math.min(0.18, ((health.isomorphic?.pairCount || 0) + (health.isomorphic?.tripleCount || 0) * 2) * 0.05)
  rawScore += (health.listPrefix?.runs?.length || 0) * 0.1
  rawScore += Math.min(0.12, tells.lyricCount * 0.025)

  // 節奏單調放大
  if (health.sentCv !== null && health.sentCv < 0.18 && sentCount > 3) {
    rawScore *= 1.35
  }

  // 具體細節錨點 ＋ 口語不完美痕跡抵銷（plainspoken concentration damping）
  const anchorHits = (s.match(CONCRETE_ANCHOR_RE) || []).length
  const imperfectionHits = (s.match(new RegExp(GENUINE_IMPERFECTION_RE.source, 'g')) || []).length
  if ((anchorHits / sentCount) > 0.3) rawScore *= 0.7
  if ((imperfectionHits / sentCount) > 0.25) rawScore *= 0.5

  const modalHits = (s.match(/[啊吧呢嘛喔哦啦耶呀]/g) || []).length
  const modalDensity = Number(((modalHits / Math.max(1, (s.match(/[\u4e00-\u9fff]/g) || []).length)) * 1000).toFixed(1))

  const score = Number(Math.min(2.0, rawScore).toFixed(3))
  const level = score <= 0.3 ? 'low' : score <= 0.6 ? 'mid' : score <= 1.0 ? 'high' : 'severe'
  return { score, level, anchorHits, imperfectionHits, modalDensity }
}

export function detectModelFamily(modelName = '') {
  const m = String(modelName || '').toLowerCase()
  if (/deepseek/.test(m)) {
    return {
      family: 'deepseek',
      dashStrict: true,
      dashLimit: 1.5,
      preGenPrior: '避免開局一口氣堆砌前史科普，讓背景在行動與對話中零星透出；減少破折號與過度規律的插敘。',
    }
  }
  if (/claude|sonnet|opus|haiku/.test(m)) {
    return {
      family: 'claude',
      dashStrict: true,
      dashLimit: 1.5,
      preGenPrior: '打破平滑漸進：壓力點允許節奏驟變；有直白動詞就別硬塞華麗比喻，結尾忌說教尾聲。',
    }
  }
  if (/gemini/.test(m)) {
    return {
      family: 'gemini',
      dashStrict: false,
      dashLimit: 3.5,
      preGenPrior: '減少過於工整的大團圓／收帳感，適度混用間接轉述替代全直引對白；勿強求每個場景都壓抑陰鬱。',
    }
  }
  if (/gpt|o[134]-|chatgpt/.test(m)) {
    return {
      family: 'gpt',
      dashStrict: false,
      dashLimit: 3.5,
      preGenPrior: '讓關鍵資訊透過現場觀察或物件誤會流出，而非依靠「旁人議論／街坊傳言」推進；收束反轉次數。',
    }
  }
  if (/kimi|moonshot/.test(m)) {
    return {
      family: 'kimi',
      dashStrict: false,
      dashLimit: 2.5,
      preGenPrior: '進場節奏可更有變化，不必每幕都硬切中段開局。',
    }
  }
  return { family: 'unknown', dashStrict: false, dashLimit: 2.0, preGenPrior: '' }
}

// ── 22. 同一角色稱謂變體混用監測（來自 novel-skills ai_tells.py dim 40，純本地 0 Token） ──

export function checkAddressConsistency(text, aliasGroups = []) {
  const src = String(text ?? '')
  if (!src || !Array.isArray(aliasGroups) || !aliasGroups.length) return []
  const warnings = []
  for (const grp of aliasGroups) {
    const names = (Array.isArray(grp) ? grp : String(grp || '').split(/[|,，/]+/))
      .map((x) => x.trim())
      .filter((x) => x.length >= 1)
    if (names.length < 2) continue
    // 按長度降序避免子字串雙計
    const sorted = [...new Set(names)].sort((a, b) => b.length - a.length)
    let scan = src
    const counts = {}
    let total = 0
    for (const term of sorted) {
      let c = 0
      let at = 0
      while ((at = scan.indexOf(term, at)) !== -1) {
        c += 1
        scan = scan.slice(0, at) + '\u0001'.repeat(term.length) + scan.slice(at + term.length)
        at += term.length
      }
      if (c > 0) {
        counts[term] = c
        total += c
      }
    }
    if (total < 10) continue
    const major = Object.entries(counts).filter(([, c]) => (c / total) >= 0.15)
    if (major.length >= 2) {
      warnings.push({
        baseName: names[0],
        total,
        counts: Object.fromEntries(major),
      })
    }
  }
  return warnings
}
