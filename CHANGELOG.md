# Changelog

## 1.39.0

### Flash 級輕量模型精準化與風格衝突仲裁（借鑑 `writing-dna-skill` 方法論）
- **L1 客觀量化語言指紋 (`computeL1StyleFingerprint`)**：
  - 於 [lib/local-rules.mjs](lib/local-rules.mjs) 與瀏覽器採樣端補齊統計：`<=15` 字短句與 `>=50` 字長句佔比、段落平均句數，以及破折號／省略號／括號千字密度；一鍵萃取文風時要求同時保留一句可執行【量化節奏基準】，提升 Flash 級模型對文字呼吸感的遵循度。
- **文風 DNA 優先於一般去 AI 味規則（衝突仲裁 ＋ 動態閾值覆蓋，`deriveStyleDnaOverrides`）**：
  - `buildRewriteSystem` 與 `turnSection` 確立明確 4 階優先級（`劇情事實 ＞ 本卡文風基準／角色基因 ＞ 已確診 P0 病灶 ＞ 從寬保留`）。
  - 當目標文風基準明確屬高破折號、極短句成段（如短句 `>=55%` 或段均 `<=1.3` 句）或高留白省略號流派時，自動調升 `dashLimit` 下限或豁免 `telegraph_short_paras`／「一句一段」告警，並在報告中標註 `DNA 優先` 狀態。
- **場景感知寫作範例輪轉 (`classifyAnchorScene` / `extractStyleAnchorsFromText` / `rotateSampleAnchors`)**：
  - 提取寫作範例時自動標記 `[對白交鋒]`、`[動作緊張]`、`[心理張力]`、`[日常過場]`；下一輪 `turnSection` 依上一輪場景類型（0 Token）優先輪轉最匹配的 2 段範例注入，報告頁同步顯示當前對齊場景。

## 1.38.0

### 品牌標題升級
- 正式升級展示標題為 **「澄文-AutoProof-自適應敘事精修與去AI味引擎」**（底層 `package.json` ID `dsh-tavern-autoproof` 與資料通道完全維持不變，確保老用戶覆蓋更新零設定與零歷史遺失）。

### 核心功能升級與效能革新
- **Tier 2 批次合併重寫 ＋ 單段兜底 (`tier2BatchMode`)**：
  - 預設啟用 `batch` 模式（可切回 `single`）：每 5 段合併為一組請求重寫，搭配 `[N]` / `<<<SEG_N>>>` 雙格式標記解析 (`parseBatchOutput`)；凡解析缺段、守門退回或命中 `targetSnippets` 照抄時，自動落入 `fallbackQueue` 改走單段重寫 (`runSingleSegment`)。
- **低訊號空轉過濾 (`skippedLowSignal`)**：
  - 預篩無簡繁修改需求、`locatedSpans.length === 0`、無 `P0_PRIORITY_KEYS` 命中且本輪 AI 味綜合濃度 `< 0.12` 之段落，直接免送線上 Tier 2（報告標記 `low-signal-filtered`）。
- **報告內段落級 Diff 檢視 ＋ 一鍵還原原文鎖定 (`dsh-tavern-autoproof/undo`)**：
  - `proofTurn` 計算改前／改後段落差異 (`buildSegmentDiffs`) 並保存 `snapshot`（`originalRaw`、`diffs`、`reverted`）；報告介面 (`ReportOverlay`) 支援摺疊展開 Diff 明細，並對超過 `15` 種或 `25` 次的 Tier 1 字級修復自動摺疊。
  - 新增報告底部 **「↩ 一鍵還原原文」** 按鈕，經 `editTurn` 退回改前全文並寫入 `revertedTurns` 鎖定，非手動「重新校對本輪」不重複自動覆寫。
- **修辭骨架分群冷卻 ＋ 指數衰減 (`0.72^age`)**：
  - 以 `extractRhetoricalSkeletons` 與 `computeDecayedCooldown` 取代字面 N-gram 動態意象，專抓比喻架、量詞感官情緒架、微表情與光影動詞架，杜絕將一般名詞（如「地圖」「隊友」）誤納冷卻池並自動清洗舊版雜訊緩存。
- **純文字近 3 輪行為自適應（取代依後台模型名猜測前台）**：
  - 新增 `classifyTurnOpening`、`analyzeTurnBehavioralMetrics`、`deriveBehavioralAdaptation`，依最近 2～3 輪實測的 `dashPer1k`、`frontLoadChars`、`directSpeechRatio`、`embodiedHits` 與連 3 輪開場同質度 (`openingMonotony`) 動態調節 `dashLimit` 與 `turnSection` 提醒，將 `modelFamilyAdapt` 預設由 `'auto'` 升級為 `'behavioral'`；同步擴充 `detectModelFamily` 診斷支援 `qwen` / `grok` / `glm` / `minimax` / `doubao`。
- **網文後設／系統元資料清理與截斷告警 (`metaLeakGuard` / `scanAndCleanMetaLeakage`)**：
  - 純本地 0-Token 移除引號外與白名單外之獨立出戲行（如 `（未完待續）`、`【本節重點】`、`（字數統計：…）`、`[OOC: ...]`），並對缺句末標點或引號未閉合發出 `truncatedEnding` 告警。
- **全皮膚自適應高定介面升級（相容 `dsh-tavern-skin-engine` 與深淺皮膚）**：
  - 透過 `--dsh-tavern-*` → `--dsw-alias-*` → `--gal-ui-*` 變數鏈即時連動酒館主題包底色、強調色、文字、字體與圓角（含 `body[data-ds-dark-theme]` 深淺高對比切換），並將設定與報告頁首換為極簡盾牌打勾 SVG 徽章。
  - 報告頂部新增 **環形 SVG AI 味綜合濃度儀表**，搭配滑動開關 `.ap-switch` 與微抬升流光按鈕 `.ap-btn`；「重新校對」執行視窗升級為漸層彗星弧線連續 360° 旋轉動效（每秒計時不重設旋轉進度）。

## 1.37.0

### 新增功能（多專案深度借鑑與本地 0-Token 升級）

- **AI 味綜合濃度評分與真實細節抵銷 (`calcAiConcentration`)**：
  - 依「根因類（翻譯腔／對舉／模板）」「並發／節奏類（弱副詞聚簇／同構句／列表開頭／抒情堆砌）」加權計分，並針對句長單調進行放大；若段落內帶有具體時間／數值細節錨點或真人口語猶豫痕跡，會自動給予折扣，避免寫得紮實卻因偶爾帶到副詞而被誤判重寫。
  - 新增「200 字局部滑窗聚簇偵測 (`scanWindowClusters`)」，解決長回合全文均值稀釋局部爆表的問題，並統計語氣詞（啊、吧、呢、嘛、喔、啦、耶）千字密度與 RLHF 七虛詞密度（`的著着了把被將在`）。
- **無損清理敘事廢話起手 (`preCleanFillers` / `preCleanNarrativeFillers`)**：
  - 純本地 0 Token，僅作用於非對白敘事且自動避開文風白名單；直接移除句首零資訊廢話殼（如 `不可否認的是，`、`顯而易見的是，`、`值得一提的是，`、`不難看出，`、`眾所周知，` 等）並修復殘留雙逗號與孤立標點。
- **敘事級句法翻譯腔、同構句拍、列表感與刻意換詞偵測 (`local-rules.mjs` / `index.mjs`)**：
  - 新增 `scanSyntaxAndTranslationese`：抓取 `當…時`（自動排除口語「的時候」）、`對於…來說／就…而言`、`在…的過程中／情況下`、`以一種…的方式`、三連「的」鏈、`進行討論／加以說明／做出決定` 雙音節膨脹動詞殼與非對白短引號自造金句 (`countNonDialogueScareQuotes`)，同步接入 `locateParagraphIssues` 精準定位與動態對照範例。
  - 新增 `calcSentenceIsomorphism`（逗號數＋長度桶兩連／三連同構節拍檢測）、`detectListLikePrefixRun`（連續 `>= 3` 句同前 2 字開頭列表感）、`estimateBigramMtld`（雙字偽詞 MTLD 估計）與 `detectSynonymSwaps`（同段同義詞刻意輪換檢測）。
- **依模型家族指紋自適應先驗 (`modelFamilyAdapt` / `detectModelFamily`) ＋ StoryScope+**：
  - 辨識後台／生成模型家族（`deepseek` / `claude` / `gpt` / `gemini` / `kimi`），自動調整引號外破折號觀察線（DeepSeek/Claude `1.5/千字`、Gemini/GPT `3.5/千字`）並在生成前與 Tier 2 系統提示注入簡要慣癖防範。
  - 擴充 `analyzeTurnNarrativeFingerprint` 與 `buildTurnConstraintHint`：納入 `detectEmbodiedOverload`（防止只靠心跳／冷汗／氣味表演情緒而缺乏直接情緒命名）與 `countParagraphCohesionChain`（偵測連續 `>= 6` 段平滑承接，適時提醒硬切呼吸感）。
- **同角色稱謂變體混用監測 (`checkAddressConsistency`)**：
  - 搭配 `characterVoices` 人物表純本地統計多變體稱謂混亂（總出現 `>= 10` 次且多個變體各佔 `>= 15%` 時於報告提醒，不做暴力替換）。

### 原有功能修復與核心改進

- **冷卻池專名防誤抓修復 (`extractCardProperNouns` / `detectLikelyProperNouns` / `isCooldownExcludedTerm`)**：
  - 修復動態意象抽取將角色卡、世界書（`character_book` keys／設定名詞）及正文內的遊戲角色、戰隊、帳號卡名稱（如 `微草`、`木恩`、`獨活`）誤收進冷卻池的問題；採「按標點分段切詞 ＋ 卡面／世界書／白名單／名詞鎖／基因卡自動排除 ＋ 正文語境動態識別 ＋ 舊歷史緩存自動清洗」四層防護，且預設意象門檻調高為 `>= 3` 次。
- **防幻覺、承諾強度保真與整輪防退化護欄 (`validateTier2Rewrite` / `scoreRewriteCandidate` / `index.mjs`)**：
  - `extractNormalizedNumbers` 豁免 `1900–2100` 年份與「一九九九」類讀法，避免年份格式轉換被誤攔；`scoreRewriteCandidate` 納入 **節奏方差改善比** 與 **雙字以上實詞重疊率**。
  - 新增 **承諾強度保真 (`commitment-drift`)**：原文帶 `可能／也許／似乎` 且無強肯定詞時，拒收改寫成 `必然／絕對／肯定會`；保護 `hasGenuineImperfection` 真人口語猶豫與自我修正段落不被磨平。
  - 新增 **防電報體退化 (`telegraph-regression`)**、**跨段「替換不複用」去重 (`dedupReverted`)**（防止多段同時新塞進同一批套詞如 `垂下眼`）與 **最大刪減比例護欄 (`deletionGuardTripped`)**（保守 `15%` / 標準 `25%` / 積極 `35%`），並在 `buildRewriteSystem` 加入 C 級反誤傷豁免條款。
- **修正 `dunhaoTriples` 與詞庫重複鍵名**：
  - 修正 [index.mjs](index.mjs) 中 `analyze().metrics.dunhaoTriples` 原先要求 4 項才觸發的漏檢問題，調整為正確的 3 項頓號並列；清理 [lib/local-rules.mjs](lib/local-rules.mjs) 中 `EXEMPLAR_BANK_SIMP` 的重複鍵名。

## 1.36.0

- **文風白名單等長掩碼 (`styleWhitelist` / `maskWhitelistSpans`)**：純本地在掃描輸入端進行等長 `\u0000` 掩碼（原創卡與同人卡皆適用），絕不改動正文原文，保護角色招牌句法與專有寫法免被誤報。
- **一鍵同時萃取文風卡 ＋ 寫作範例輪轉庫 ＋ 多角色語言基因卡 (`extract-style`)**：
  - 介面明確標註「正面文風萃取與寫作範例輪轉」主要推薦用於 **同人卡／小說改編卡**（找不到參考原作的原創卡可完全留白略過）。
  - 執行「一鍵萃取文風與基因」或上傳 `.txt`/`.md` 小說檔時，同一輪可同時萃出 **正面文風錨點**、**寫作範例輪轉庫**（最多 6 段敘事／對白平衡段落，每輪確定性輪轉 2 段並附嚴禁照抄人名劇情邊界），以及 **多角色語言基因卡**（角色名｜語氣｜口頭禪｜絕不說，自動對齊繁簡字形）。
- **多角色語言基因卡 (`characterVoices`) ＋ 碎句稀釋體檢 ＋ 形近字／低相似度／言說語病守門**：
  - 新增 `parseCharacterVoices`、`clauseHits`（僅匹配引號與子句邊界，不誤判詞中子字串如「坐在下手」）與 `checkVoiceConsistency` 巡檢台詞禁忌詞。
  - 補充 `oneSentenceParas`（「一句一段」碎句比例 `>= 45%` 觸發 `telegraph_short_paras`）、純敘事 `dilution`（每句「的」字與 bigram 重複率）、`CONFUSABLE_CHARS` 形近錯字攔截、`calcBigramJaccard < 0.18` 離題重寫攔截與 `findSpeechObjDefects` 言說動詞賓語頂替語病偵測。

## 1.35.0

### 新增功能（無需模型微調的生成前後品質強化）

- **正面文風錨點（Style Card）與整本小說檔案一鍵萃取 (`styleCardEnabled` / `styleCardText` / `正面文風 ✨` 分頁)**：
  - 新增「正面文風 ✨」設定分頁，除可直接貼上範文外，也支援直接點擊 **「上傳整本小說 (.txt/.md)」** 進行全書分析萃取。
  - 瀏覽器端實作 `decodeNovelBuffer`（自動識別 UTF-8、UTF-16 LE/BE、GB18030/GBK 與 Big5 編碼）與 `analyzeAndSampleNovel`：先在本地計算全書語言指紋（總字數、對話行佔比、平均句長、短句 `<=12` 字佔比、平均段長；大於 12 萬字自動抽樣加速），並避開章節標題與作者公告，於全書約 `8%～88%` 的前／中／後期均勻分層採樣 6 段後交由後台模型萃取 130～240 字純文風指南。
  - 萃取邏輯 (`dsh-tavern-autoproof/extract-style`) 會自動對齊該角色卡的目標字形（`applyCharFixes`＋`normalizeQuotes`），抽離原作人名、地名、劇情物件與死板數字公式，避免生成「每句微動作」模板並寫入 `proof.log`；生成前由 `turnSection` 注入，Tier 2 改寫時亦同步作為 `【本卡文風基準】` 參照。
- **Verbalized Sampling（思考期破除套路，`verbalizedSampling`）**：
  - 可選開關（預設關閉，便於對照前後體感差異）；開啟後於每輪生成前引導主模型在思考區比較兩種截然不同的對話接法或切入角度並評估典型度，刻意捨棄最俗套的第一直覺高機率模板。
- **實體專有名詞鎖（Canonical Entity Lock，純本地 0 Token，`entityLockMode` / `customEntityFixes`）**：
  - 結合自動漏字防錯（掃描 `card.name`、世界書 `keys` 與設定集括號內 4～6 字高可信專有名詞，排除設定集內原有相近詞以免誤傷）與自訂多行對照表（支援 `=`、`->`、`=>`、`→`）。
  - `applyEntityLocks` 內建目標全稱上下文檢查，防止前／後綴錯詞誤將正確全稱重複補字；於 Tier 1 最先執行，阻斷長對話錯字遺傳進後續歷史記憶。
- **知而不言邊界（Utterance Gate，跨題材防角色念設定集，`utteranceGate`）**：
  - 純本地 `detectInfoDumpDialogue` 偵測對白內的百科式設定複誦（涵蓋奇幻／歷史／校園／都市／競技等題材的紀元年代沿革與「正如你所知／按照這裡的規矩只有…」說教口吻），支援 `off` / `report` / `adaptive`（預設自適應提醒 2 輪） / `always`。

### 原有功能修復與核心改進

- **智能對白口癖保護 (`protectDialogue`) 與隱性 AI 對白偵測（跨題材通用）**：
  - 將原本布林「對話保護區」升級為三檔模式（`smart` 智能放行預設／`strict` 嚴格跳過／`off` 關閉，自動向下相容舊版 `true`/`false` 設定）：僅跳過簡短自然口癖（`<= 42` 漢字且無 AI 腔），一旦對白出現翻譯腔、設定科普、三明治插動作或隱性 AI 金句對仗即自動放行送交 Tier 2。
  - 新增 `analyzeDialogueAiFlavor` 與 `dialogue_ai_tone`，並在 `isProtectedLine` 與 `semanticHits` 補齊放行與偵測規則，涵蓋：**無「而是」的隱性格言對舉**（`不X了。我Y。`、`V的是A。V的是B。`、`沒錯，錯在…`、`今天才明白`）、**行中連環三明治短插語**、**機械數字遞進**（`N個…第N+1個`、`第X跟第Y`）、**精確尺度癖**（`看了三遍／推了半尺`）以及 **無意義逆向複位動作**（`摘下來，又套回去`、`立了又壓`等）。
- **Tier 2 防偷懶照抄自動重試（Anti-Lazy-Copy Retry）與系統提示對齊**：
  - 修正 `buildRewriteSystem` 原本對白保護措辭與 User Prompt 衝突、導致輕量模型（如 Flash 級模型）對已確診對白返回原句的問題；改寫後若檢查先前標註的病灶片段仍被照抄，會自動觸發 1 次強制點名重試並驗證優劣。
- **校對報告面板三分區重構與日誌強化 (`client.js` / `index.mjs`)**：
  - 報告面板改為「一、基本寫回與正文指標」「二、新功能與主動防護應用狀態」「三、局部精編與 Tier 2 執行明細」三大區塊，補全正面文風、Verbalized Sampling、實體鎖明細、知而不言、冷卻池／StoryScope 中文標籤、`智能放行`統計與 **`病灶定位 X 處（已實質消除 Y 處）`／`照抄糾偏重試`** 透明度，未啟動 Tier 2 時亦顯示具體原因。
  - 擴充 `COOLDOWN_MICRO_ACTIONS` 常見高頻動作（如 `挑了挑眉`、`抿了抿唇`、`眸色一暗`、`垂下眼簾` 等），補齊 `proof.log` 全欄位記錄並以 `_disableLog` 隔離測試環境避免污染線上日誌。

## 1.34.0

- **手機版介面適配修復 (`client.js`)**：將設定與報告彈窗改為區塊流式響應式排版（`min(640px, calc(100vw - 24px))`），修復手機窄螢幕下設定視窗被橫向擠壓、清單區摺疊成細線與底部按鈕文字直排的問題。
- **三明治對話模板與動詞三連排比偵測 (`lib/local-rules.mjs` / `index.mjs`)**：純本地新增 `dialogue_sandwich`（「台詞」＋插入微動作＋「台詞」連續出現）與 `verb_triple_parallel`（動詞三連排比）偵測，並將跨輪觸發門檻調降為累計 2 輪即於 `turnSection` 生成前精準提醒主模型。
- **簡繁詞組與標點補強 (`index.mjs`)**：
  - 補齊 `团→團`、`一分鍾→一分鐘`、`分鍾→分鐘`，並自動將夾在兩個中文字之間的英文半形逗號 `,` 轉為全形 `，`。
  - 擴充 30 餘組常見「名詞＋里」詞組（`嘴裡／喉嚨裡／耳朵裡／杯裡／隊裡／腦子裡／鏡子裡／通道裡／訓練室裡／賽場裡／比賽裡` 等）與常見動作持續體（`帶著／壓著／翻著／含著／貼著／順著`），同時移除 `"吃":"吃"`、`"床":"床"` 無效映射與寫死的古風作品例句。

## 1.33.0

- **精準病灶定位反饋 (`targetedFeedback`)**：送交 Tier 2 前先由純本地定位器抽出該段實際命中的模板詞、對舉、頂真或名詞化冗餘殼，引導模型只動刀局部；對話保護區啟用時自動跳過引號內台詞。
- **動態正／反面極簡對照範例 (`contrastiveExemplars`)**：依段落命中類型按需附帶 1～2 組極簡「反例 → 真人好寫法」對照，取代冗長死板禁令，避免提示詞超載。
- **Best-of-N 局部候補擇優 (`bestOfN`)**：支援 `關閉`、`智能雙候補（僅重災段跑 2 選 1）`、`全部雙候補`、`全部三候補`，以本地確定性評分器（模板詞數、句長 CV 與數字防幻覺守門）挑出最佳改寫版本。
- **跨輪高頻動作／意象冷卻池 (`cooldownPool`)**：純本地 0 Token 統計最近多輪高頻微動作與意象（如「喉結滾動」「呼吸一滯」「嘴角勾起」），達門檻後於下一輪生成前動態提示避開（上限 5 個）。
- **敘事結構級主動糾偏 (`narrativeSteering`)**：參考 StoryScope（`arXiv:2604.03136`）結構指紋，純本地偵測連續頓悟收尾、節奏扁平或情緒直寫過多等傾向，於下一輪注入輕量結構建議。

## 1.32.0

- **新增 Tier 2 工具調用通道 (`tier2Route`)**：
  - 支援 `一般文字（預設）`、`工具調用 submit_proofread` 與 `工具調用（失敗時退回一般文字）` 三種輸出方式，經實測可讓 NSFW 段落通過工具參數 `content` 完成局部校對而不觸發一般文字輸出審查。
- **報告與日誌增強**：
  - 校對報告 (`client.js`) 新增顯示 `Tier 2 輸出方式`（含退回次數）、`改寫成功 / 有改動 / 失敗段數`、`含露骨詞段落改寫成功段數` 與 `NSFW 改寫預覽`（前後對照）。
  - `proof.log` 補齊記錄 `tier2Route`、`routeFallbacks`、`nsfwRouting`、`nsfwBypassed`、`nsfwRewritten`、`dialogueProtected`、`quoteConverted` 與 `guardRejected`，方便精準追蹤每輪運行狀態。
- **介面清理**：移除開發測試用的「工具調用實驗」按鈕，保留正式的 `校對設定` 與 `重新校對`。

## 1.31.0

- **NSFW 安全分流防截斷 (`nsfwRouting`)**：新增三檔安全分流策略（`智能分流` / `全篇純本地` / `全部送交 Tier 2`）。預設「智能分流」會在本地預先掃描含露骨成人描寫的段落並留守本地處理，僅將安全敘事段送交雲端 Tier 2，徹底避免整輪觸發 `400 data_inspection_failed` 審查截斷。
- **純本地 0-Token 去 AI 味與小說體檢 (`lib/local-rules.mjs`)**：
  - **網文／小說模板詞庫與千字密度門檻 (`aiLexiconLevel`)**：整合一級網文模板詞、弱化／對沖副詞千字密度與名詞化冗餘殼，支援 `off` / `report` / `strict` / `balanced` / `relaxed` 五檔可調，避免誤殺單次自然描寫。
  - **雙向引號規範化 (`quoteNormalize`)**：冪等純函數自動統一繁體直角引號 `「」『』` 或簡體彎引號 `“”‘’`，不破壞 HTML 與程式碼區塊。
  - **小說節奏／升華尾句／六感平衡體檢 (`localRhythmAudit`)**：純本地計算段落與句長變異係數 CV、結尾說教升華腔、公式轉折重複、視／聽／嗅／味／觸／溫體感六感佔比及 8-gram 撞場率。
- **改寫後本地防幻覺守門 (`hallucinationGuard`) 與對話保護區 (`protectDialogue`)**：支援中文數字（「三百」「一萬兩千」）與阿拉伯數字等價核對，嚴格檔禁止 Tier 2 改寫引入新 AI 模板詞；保護純對白與角色口癖不被磨平。
- **進階小說美學編修紀律 (`aestheticPrompt`)**：`buildRewriteSystem` 新增「替換不複用」「動作後少解釋一句」「停早一拍刪升華」紀律。
- **全新分項設定 UI 與 `?` 功能說明 (`client.js`)**：輸入列新增 `校對設定` 按鈕（報告視窗亦可一鍵切換），提供三大分頁獨立開關／檔位調整、運行層級徽章（純本地 0 Token／本地＋安全分流／線上 Tier 2）與每項專屬 `?` 說明氣泡，支援儲存至本角色卡或設為全域預設。

## 1.29.0

- **對齊宿主 HTML/標記切分口徑 (`editableParts` / `diffProtected`)**：移植 `dsh-tavern` 的 `fencedSegments`、`HTML_ELEMENTS`、行內反引號跳過、`isNarrativeTag` 與 `script`/`style`/`textarea` 邊界規則，解決 `editTurn` 報「正文里的 HTML 块要保持原样，只能改文字」的問題。
- **瀏覽器側 `client.js` 修復**：報告彈窗明確區分 `writeOk` 與僅分析狀態，透出 `writeError` 與 `note`；移除多餘的頁面載入自動 `tick` 輪詢，避免與宿主 `onTurnSettled` 重複觸發。
- **人物卡字形跟隨與【文風基準】對接**：`script: 'auto'` 實作 `detectCardScript` 讀取人物卡判斷繁簡；`buildRewriteSystem` 依目標字形動態切換繁/簡指令；支援讀取世界書 `【文風基準】` 條目的 JSON 閾值覆蓋與文風提示。
- **宿主契約對齊與持久化**：宣告可選依賴 `llm`；`callHostModel` 綁定 `ctx.tavern.versionSignal`（回退/重生成立即中止請求）與 `reasoningEffort`；使用 `saveTurnData`/`readTurnData` 與 `savePluginData`/`readPluginData` 持久化報告與跨輪文體記憶。
- **字表與正則微調**：將易誤傷人名／地支的 `于/范/丑` 移出單字表改走詞組白名單；泛化 `isProtectedLine`、收緊 `action_inflation` 與 `comma_chain` 誤報，並加入單輪送審段數上限與 `proof.log` 自動輪轉。

## 1.20.0

- **新增莫家莊古井回歸測試集 (`tests/regression-mo-manor.test.mjs`)**：將實際酒館生成的小說片段納入自動化回歸驗證。
- **P0 語義對舉與省略反轉檢測 (`omitted_antithesis` + 500字滑動窗口密度)**：支援辨識「不是A，是B」省略形式，並區分關鍵懸念揭示與解釋性慣性對舉。
- **P0 動作描寫膨脹與頂真拆解檢測 (`action_inflation`)**：辨識「點了點頭，點頭的幅度極小」「擰了兩下，擰出的水珠」「記了幾筆，記到一半抬頭」等機械式微動作拆分。
- **P0 第一層語文校對強化 (`applyCharFixes`)**：新增上下文安全的簡繁詞組修正（`里→裡`、`后→後`、`只→隻`、`并→並`、`松→鬆`、`点→點`、`别→別`）、單字修正（`飘/尸/坠/槛/胆/辈/节/递/墻`）、中英夾雜清除（`pull→吸力`）及漏字修復（`淤沒到底→淤泥沒到底`）。
- **P1 局部疊詞與量詞骨架密度控制 (`reduplication_cluster`)**：追蹤 350 字窗口內的 `一X一X` 疊詞密度。
- **P1 對話伴隨肢體動作比例統計 (`dialogueActionRatio` / `soft_dialogue_stage`)**。
- **P2 跨 6～10 輪敘事習慣追蹤與生成前 `turnSection` 輕量提醒**：支援保守／標準／積極三檔模式配置。
- **正面保護規則 (`isProtectedLine`)**：明確保護角色辨識度對話、人物關係互動及有效懸疑短句（「井底沒有底。」「都別下去。」「她在水下站著，站得很直。」）。

## 1.19.0

- 將模型改寫範圍從所有可見文字段縮小為命中候選的局部段落。
- 新增較高可信的候選：明確否定轉折對舉、情感帳本化、自問自答式賣關子、神情分類標籤、自我標榜式元陳述、道具揭底式收尾、三段式平行結構。
- 新增弱訊號跨輪觀察：程度副詞、沉默補白及套語須在最近六輪中至少三輪出現才進入複核。
- 使用 DSH `watchTurnState(gameId, listener)`，修復舊版錯誤呼叫 `getTurnState()` 導致的輪詢錯誤。
- 修正簡繁字級修復報告中替換字顯示錯誤。
