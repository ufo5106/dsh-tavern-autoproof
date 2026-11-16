# Changelog

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
