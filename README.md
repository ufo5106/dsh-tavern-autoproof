# dsh-tavern-autoproof

給 [DSH Tavern](https://github.com/flizzywine/dsh-tavern) 使用的中文小說自動校對與去 AI 文體插件（**v1.35.0**）。  
針對長篇互動小說、同人／原創劇情與 NSFW 劇本的痛點設計：**生成前正面文風牽引（Style Card＋整本小說自動萃取）＋思考期去套路（Verbalized Sampling）＋純本地 0-Token 實體名詞鎖與知而不言邊界＋智能對白去 AI 味與 NSFW 安全分流＋Tier 2 防偷懶照抄精編與三分區可視化報告**，在不觸發雲端審查截斷與不微調模型的前提下穩定拉齊真人小說語感。

---

## v1.35.0 核心亮點

### 一、無需微調的前端引導與一致性防護（跨題材通用）

1. **正面文風錨點（Style Card）＋ 整本小說上傳一鍵萃取（`正面文風 ✨` 分頁）**
   - 除了貼上短篇範文外，可直接點擊 **「上傳整本小說 (.txt/.md)」** 進行全書分析萃取：
     - 自動識別 UTF-8、UTF-16、GB18030／GBK 與 Big5 編碼，避免中文小說檔亂碼。
     - 先於本地計算全書**對話行佔比、平均句長、短句（`<=12` 字）佔比、平均段長**等客觀指紋，並避開章節標題與作者公告，於全書前／中／後期均勻分層採樣 6 段交給後台模型濃縮成 130～240 字純文風指南（不帶原作人名與劇情名詞）。
     - 自動對齊角色卡目標繁簡字形，並同時套用於「下一輪／重 Roll 生成前注入」與「Tier 2 局部修稿基準」。
2. **Verbalized Sampling（思考期破除套路，可選開啟）**
   - 預設關閉方便對照前後差異；開啟後於主模型動筆前，要求先在思考區比較兩種截然不同的對話切入點與典型度，主動捨棄最高機率的第一直覺套路。
3. **實體專有名詞鎖（Canonical Entity Lock，🟢 純本地 0 Token）**
   - 結合自動漏字防錯（從角色卡名稱、世界書 `keys` 與設定集抽出 4～6 字專有名詞並排除原有相近詞，避免誤傷雙名）＋自訂對照表（每行 `錯詞=正詞`，支援 `=`、`->`、`=>`、`→`），內建前後綴檢查不重複補字，於 Tier 1 最先執行以阻斷長對話錯名漂移。
4. **知而不言邊界（Utterance Gate，🟢 純本地 0 Token）**
   - 偵測對白裡強行念世界觀或已知履歷的百科腔（涵蓋奇幻、歷史、校園、都市、競技等多題材），支援 `關閉` / `僅標記` / `自適應（命中時自動提醒 2 輪，推薦）` / `每輪注入`。

---

### 二、智能對白去 AI 味、NSFW 分流與局部精編

1. **智能對白口癖保護區（`smart` 推薦 / `strict` / `off`）＋ 防偷懶照抄重試**
   - **護短口癖，放行 AI 腔**：像 `「我不擦！」「嗯。」` 這類簡短自然口癖仍跳過保留；一旦偵測到長段說教、翻譯腔（`別無選擇`、`你必須明白`）、隱性格言對舉（`不X了。我Y。`、`V的是A。V的是B。`、`沒錯，錯在…`）、機械數字遞進（`N個…第N+1個`、`第X跟第Y`）、行中三明治插動作或無意義複位動作（`摘下來，又套回去`、`立了又壓`），立即放行進 Tier 2 並以 `[對白AI腔]` 精準定位。
   - **Anti-Lazy-Copy Retry（防偷懶照抄自動糾偏）**：若背景模型首次回傳仍原文照搬已確診的 AI 片段，將自動補跑 1 次強制點名糾偏重試並經過防幻覺守門驗證。
2. **Tier 2 品質強化與工具調用通道（`submit_proofread`）**
   - **精準病灶定位 (`targetedFeedback`) ＋ 動態對照範例 (`contrastiveExemplars`)**：僅針對實際踩中的毛病提供定位與 1～2 組極簡對照，不製造冗長提示過載。
   - **Best-of-N 局部候補擇優 (`bestOfN`)**：支援 `智能雙候補`（僅重災段 2 選 1）、`全部雙候補`、`全部三候補`，以純本地確定性評分器擇優。
   - **Tier 2 工具調用 (`tier2Route`) ＋ NSFW 安全分流 (`nsfwRouting`)**：支援 `智能分流`（露骨段留本地處理、其餘安全段上雲）、`全篇純本地（0 Token）` 與 `全部送交 Tier 2`（搭配工具調用參數輸出，避開部分文字輸出審查）。
3. **純本地 0-Token 淨化、冷卻池與敘事結構糾偏**
   - **跨輪高頻動作冷卻池 (`cooldownPool`)** 與 **敘事結構指紋 (`narrativeSteering` / StoryScope)**：純本地追蹤重複身體反應、三明治對話模板、三連排比、心理頓悟收尾與扁平節奏，於生成前輕量提醒換寫法。
   - **網文模板詞庫、雙向引號規範化 (`quoteNormalize`) 與六感／CV 體檢**；改寫回傳經 **中文／阿拉伯數字等價防幻覺守門 (`hallucinationGuard`)** 驗收後才寫回正文。
4. **獨立分項設定 UI ＋ 三分區可視化報告（桌面／手機響應式適配）**
   - 輸入列 **`校對設定`** 支援四大分頁、各選項 **`?`** 說明氣泡，以及 **「儲存至本角色卡」**／**「設為全域預設」**（推薦將文風卡與專屬名詞對照儲存至個別角色卡，避免跨卡互串）。
   - 每輪 **`校對`** 報告分為 **一、基本寫回與正文指標**、**二、新功能與主動防護應用狀態**、**三、局部精編與 Tier 2 執行明細** 三大區塊，清楚列出各功能生效與否、實體訂正明細、實際消除病灶數與糾偏重試次數。

---

## 核心處理架構

插件採用 **生成前牽引（`turnSection`）＋ Tier 1（純本地確定性修復與體檢）＋ 安全分流閘道 ＋ Tier 2（可選背景模型局部精編）＋ 防幻覺驗收寫回** 架構：

1. **HTML 與程式碼區塊隔離 (`editableParts` / `diffProtected` / `diffTags`)**
   - 狀態欄 HTML（`<div>`、`<style>` 等）、行內反引號與 Markdown 程式碼圍欄位元組級保護；`<now_plot>`、`<story>` 等敘事容器標籤僅校對內部正文，寫回前雙重校驗防止破壞版面。
2. **Tier 1 純本地確定性修復（🟢 0 Token）**
   - 依序執行 **實體專有名詞鎖** → **字級／簡繁詞組／漏字修復 (`applyCharFixes`)** → **雙向引號規範 (`normalizeQuotes`)** → **本地 AI 味與節奏／六感／對白 AI 腔掃描**。
3. **Tier 2 局部精編（🟡／🔵 可選）**
   - 支援 `保守` / `標準（推薦）` / `積極` 三檔力道；對接人物卡世界書 `【文風基準】` 與設定頁萃取的正面文風卡；透過 `versionSignal` 在玩家重 Roll 或回退時立即中止過時背景請求。

---

## 安裝與使用

### 安裝方式
1. **推薦（DSH Tavern 一鍵安裝）**：打開 DSH Tavern「設定 → 酒館插件」，將本專案 GitHub 地址直接貼入「給酒館加功能：貼上插件作者的 GitHub 地址，或上傳 ZIP 安裝包」欄位即可完成安裝：
   ```text
   https://github.com/ufo5106/dsh-tavern-autoproof
   ```
   亦可從 [Releases](https://github.com/ufo5106/dsh-tavern-autoproof/releases) 下載 ZIP 安裝包上傳，或手動放入 `data/plugins/dsh-tavern-autoproof` 目錄（從舊版更新後請於插件管理重載或重啟酒館）。

### 使用方式
1. 在對話輸入列上方點擊 **`校對設定`**：
   - **「純本地淨化 🟢」**：確認「實體專有名詞鎖」、「知而不言邊界」與「高頻動作冷卻池／StoryScope」。
   - **「線上改寫與保護 🟡」**：確認「對話與角色口癖保護區（推薦選 `智能放行`）」與 NSFW 分流／輸出路由。
   - **「正面文風 ✨」**：可上傳 `.txt`／`.md` 小說檔自動全書萃取正面文風錨點（建議點 **「儲存至本角色卡」**），並可按需開啟 `Verbalized Sampling`。
2. 點擊訊息下方 **`校對`** 或輸入列 **`重新校對`**，即可檢視三分區完整報告；剛調整正面文風或 Verbalized Sampling 後，對該輪按 **重新生成（Re-roll）** 或開下一輪更能直接體驗生成前引導差異。

---

## 測試與診斷

在插件目錄執行語法檢查與單元測試：

```bash
node --check lib/local-rules.mjs
node --check index.mjs
node --check client.js
node --test tests/*.test.mjs
```

運行日誌寫入目錄下的 `proof.log`（超過 256 KB 自動截斷保留最近 100 KB；單元測試透過 `_disableLog` 隔離，不會寫入線上 `proof.log`）。

---

## 參考資料與致謝

- [lieflat-less-ai-tone](https://github.com/larashero3-dotcom/lieflat-less-ai-tone)：核心中文敘事對舉、動作膨脹與量詞密度規則參考來源。
- [huangziyuan-general/dsh-novel-forge](https://github.com/huangziyuan-general/dsh-novel-forge)：純函數去 AI 味評分、雙向引號規範與保守合併架構參考。
- [aeopress/novel-skills](https://github.com/aeopress/novel-skills)：零依賴中文 `ai_tells`、段落 CV 與六感平衡指標參考。
- [wei125775-lab/deai](https://github.com/wei125775-lab/deai)：網文模板詞分級詞表、「替換不複用」「動作後少解釋一句」編修紀律參考。
- [taxueseek/plainspoken-writing](https://github.com/taxueseek/plainspoken-writing)：中文／阿拉伯數字等價核對與防幻覺守門邏輯參考。
- [Nanako0129/sepia](https://github.com/Nanako0129/sepia)：台灣繁體標點規範與去 AI 敘事學收尾原則參考。
- **無微調品質強化論文與方法參考**：`RoleRAG`（實體規範化錨定）、`PersonaForge`（角色認知與台詞邊界分離）、`Verbalized Sampling`（ICML 2026 免訓練去模式坍塌）、`StoryScope`（敘事結構指紋）。
- [DSH Tavern](https://github.com/flizzywine/dsh-tavern)：酒館宿主環境與插件生命週期 API。
