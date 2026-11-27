// dsh-tavern-autoproof v1.39.0 瀏覽器側模組（澄文 · AutoProof：L1 量化風格指紋 + 文風 DNA 優先仲裁 + 場景感知輪轉 + 全皮膚自適應高定 UI）
window.__ModuleLoader__.load({
  id: 'dsh-tavern-autoproof',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement

    function ensureAutoProofStyles() {
      if (typeof document === 'undefined' || !document.head) return
      const existing = document.getElementById('dsh-autoproof-ui-style')
      if (existing && existing.dataset.ver === '1.39-adaptive') return
      if (existing) existing.remove()
      const style = document.createElement('style')
      style.id = 'dsh-autoproof-ui-style'
      style.dataset.ver = '1.39-adaptive'
      style.textContent = `
        @keyframes ap-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ap-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ap-sheen {
          from { transform: translateX(-130%) skewX(-18deg); }
          to { transform: translateX(240%) skewX(-18deg); }
        }
        .ap-modal {
          --ap-surface: var(--dsh-tavern-accent-surface, var(--dsw-alias-bg-layer-1, var(--gal-ui-surface, #1e293b)));
          --ap-bg: var(--dsh-tavern-accent-cream, var(--dsw-alias-bg-base, #0f172a));
          --ap-accent: var(--dsh-tavern-accent, var(--dsw-alias-brand-primary, var(--gal-ui-accent, #38bdf8)));
          --ap-accent-ink: var(--dsw-alias-brand-text, var(--gal-ui-accent-ink, #ffffff));
          --ap-accent-soft: var(--dsh-tavern-accent-soft, color-mix(in srgb, var(--ap-accent) 14%, transparent));
          --ap-accent-border: var(--dsh-tavern-accent-border, color-mix(in srgb, var(--ap-accent) 42%, transparent));
          --ap-ink: var(--dsh-tavern-accent-ink, var(--dsw-alias-label-primary, var(--gal-ui-ink, #f8fafc)));
          --ap-muted: var(--dsh-tavern-accent-muted, var(--dsw-alias-label-secondary, #94a3b8));
          --ap-border: var(--dsh-tavern-accent-hairline, var(--dsw-alias-border-l1, rgba(148, 163, 184, 0.24)));
          --ap-panel: color-mix(in srgb, var(--ap-bg) 46%, var(--ap-surface) 54%);
          --ap-panel-soft: color-mix(in srgb, var(--ap-bg) 74%, var(--ap-surface) 26%);
          --ap-good: #059669;
          --ap-good-soft: color-mix(in srgb, #10b981 13%, transparent);
          --ap-good-border: color-mix(in srgb, #10b981 36%, transparent);
          --ap-warn: #b45309;
          --ap-warn-soft: color-mix(in srgb, #f59e0b 14%, transparent);
          --ap-warn-border: color-mix(in srgb, #f59e0b 40%, transparent);
          --ap-bad: var(--dsh-tavern-accent-error, #dc2626);
          --ap-bad-soft: color-mix(in srgb, var(--ap-bad) 13%, transparent);
          --ap-bad-border: color-mix(in srgb, var(--ap-bad) 36%, transparent);
          --ap-radius: var(--dsh-tavern-radius-lg, 14px);
          --ap-radius-md: var(--dsh-tavern-radius-md, 9px);
          --ap-radius-sm: var(--dsh-tavern-radius-sm, 6px);
          --ap-font: var(--dsh-tavern-font-sans, system-ui, -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif);
          --ap-display-font: var(--dsh-tavern-font-display, var(--ap-font));
          --ap-shadow: 0 22px 54px rgba(15, 23, 42, 0.28);
          display: block;
          box-sizing: border-box;
          font-family: var(--ap-font);
          background: var(--ap-surface);
          color: var(--ap-ink);
          border: 1px solid var(--ap-border);
          border-radius: var(--ap-radius);
          box-shadow: var(--ap-shadow);
          animation: ap-fade-in 0.22s ease-out both;
        }
        body[data-ds-dark-theme] .ap-modal {
          --ap-good: #34d399;
          --ap-warn: #fbbf24;
          --ap-bad: var(--dsh-tavern-accent-error, #f87171);
          --ap-shadow: 0 26px 62px rgba(0, 0, 0, 0.58);
        }
        .ap-modal * { box-sizing: border-box; }
        .ap-modal .ap-title {
          margin: 0;
          font-family: var(--ap-display-font);
          font-size: 15px;
          font-weight: 700;
          line-height: 1.35;
          color: var(--ap-ink);
        }
        .ap-modal .ap-sub {
          font-size: 11px;
          color: var(--ap-muted);
          margin-top: 2px;
        }
        .ap-modal .ap-btn {
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: var(--ap-radius-sm);
          font-size: 12px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.15s ease, filter 0.15s ease, background 0.18s ease, border-color 0.18s ease;
          white-space: nowrap;
        }
        .ap-modal .ap-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.06);
        }
        .ap-modal .ap-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.985);
        }
        .ap-modal .ap-btn:disabled {
          opacity: 0.6;
          cursor: wait;
        }
        .ap-modal .ap-btn-primary::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 45%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.24), transparent);
          transform: translateX(-140%) skewX(-18deg);
          pointer-events: none;
        }
        .ap-modal .ap-btn-primary:hover:not(:disabled)::after {
          animation: ap-sheen 0.65s ease;
        }
        .ap-modal .ap-tab-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 4px;
          border-radius: var(--ap-radius-md);
          background: var(--ap-panel-soft);
          border: 1px solid var(--ap-border);
          margin-bottom: 12px;
        }
        .ap-modal .ap-tab {
          flex: 1 1 auto;
          padding: 6px 10px;
          border-radius: var(--ap-radius-sm);
          border: none;
          font-size: 12px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.18s ease, color 0.18s ease;
        }
        .ap-modal .ap-field {
          padding: 10px 12px;
          border-radius: var(--ap-radius-md);
          background: var(--ap-panel);
          border: 1px solid var(--ap-border);
          margin-bottom: 8px;
          transition: border-color 0.18s ease;
        }
        .ap-modal .ap-field:hover {
          border-color: var(--ap-accent-border);
        }
        .ap-modal .ap-switch {
          position: relative;
          width: 40px;
          height: 22px;
          border-radius: 999px;
          padding: 0;
          border: 1px solid var(--ap-border);
          background: var(--ap-panel-soft);
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .ap-modal .ap-switch[data-on="true"] {
          background: var(--ap-accent);
          border-color: var(--ap-accent);
        }
        .ap-modal .ap-switch-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: var(--ap-ink);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.28);
          transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease;
        }
        .ap-modal .ap-switch[data-on="true"] .ap-switch-thumb {
          transform: translateX(18px);
          background: var(--ap-accent-ink);
        }
        .ap-modal .ap-input,
        .ap-modal .ap-select,
        .ap-modal .ap-textarea {
          border-radius: var(--ap-radius-sm);
          border: 1px solid var(--ap-border);
          background: var(--ap-panel-soft);
          color: var(--ap-ink);
          font-size: 12px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.16s ease;
        }
        .ap-modal .ap-input:focus,
        .ap-modal .ap-select:focus,
        .ap-modal .ap-textarea:focus {
          border-color: var(--ap-accent);
        }
        .ap-modal .ap-help-box {
          margin-top: 8px;
          padding: 8px 10px;
          border-radius: var(--ap-radius-sm);
          background: var(--ap-accent-soft);
          border-left: 3px solid var(--ap-accent);
          color: var(--ap-ink);
          font-size: 12px;
          line-height: 1.55;
          white-space: pre-line;
          animation: ap-fade-in 0.18s ease-out both;
        }
        .ap-modal .ap-spinner-ring {
          animation: ap-spin 1.05s linear infinite;
          transform-origin: 50% 50%;
          will-change: transform;
        }
        .ap-modal .ap-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .ap-modal .ap-scroll::-webkit-scrollbar-track { background: transparent; }
        .ap-modal .ap-scroll::-webkit-scrollbar-thumb {
          background: color-mix(in srgb, var(--ap-muted) 35%, transparent);
          border-radius: 999px;
        }
      `
      document.head.appendChild(style)
    }

    function renderBrandLogo(boxSize = 36) {
      const iconSize = Math.round(boxSize * 0.56)
      return h(
        'div',
        {
          style: {
            width: `${boxSize}px`,
            height: `${boxSize}px`,
            borderRadius: 'var(--ap-radius-md)',
            background: 'var(--ap-accent-soft)',
            border: '1px solid var(--ap-accent-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          },
        },
        h(
          'svg',
          { width: iconSize, height: iconSize, viewBox: '0 0 24 24', fill: 'none' },
          h('path', {
            d: 'M12 3L4 7V12C4 16.97 7.42 21.5 12 22.5C16.58 21.5 20 16.97 20 12V7L12 3Z',
            stroke: 'var(--ap-accent)',
            strokeWidth: 1.8,
            strokeLinejoin: 'round',
          }),
          h('path', {
            d: 'M9 12.2L11.2 14.4L15.5 9.8',
            stroke: 'var(--ap-accent)',
            strokeWidth: 1.9,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          })
        )
      )
    }

    const TIER_BADGE = {
      local: { text: '純本地 0 Token', bg: 'var(--ap-good-soft)', color: 'var(--ap-good)', border: '1px solid var(--ap-good-border)' },
      hybrid: { text: '本地＋安全分流', bg: 'var(--ap-warn-soft)', color: 'var(--ap-warn)', border: '1px solid var(--ap-warn-border)' },
      online: { text: '線上 Tier 2', bg: 'var(--ap-accent-soft)', color: 'var(--ap-accent)', border: '1px solid var(--ap-accent-border)' },
    }

    const GROUP_TABS = [
      { id: 'core', label: '總控與安全分流' },
      { id: 'local', label: '純本地淨化 🟢' },
      { id: 'tier2', label: '線上改寫與保護 🟡' },
      { id: 'style', label: '正面文風 ✨' },
    ]

    function decodeNovelBuffer(buf) {
      const bytes = new Uint8Array(buf)
      if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
        return new TextDecoder('utf-16le').decode(bytes.subarray(2))
      }
      if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
        return new TextDecoder('utf-16be').decode(bytes.subarray(2))
      }
      if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        return new TextDecoder('utf-8').decode(bytes.subarray(3))
      }
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      } catch {
        // 常見繁簡小說檔案使用 GB18030 / GBK 或 Big5 編碼
        let bestText = ''
        let bestScore = -Infinity
        for (const enc of ['gb18030', 'big5', 'utf-8']) {
          try {
            const decoded = new TextDecoder(enc).decode(bytes)
            const probe = decoded.slice(0, 6000)
            const bad = (probe.match(/\uFFFD/g) || []).length
            const cjk = (probe.match(/[\u4e00-\u9fff]/g) || []).length
            const score = cjk - bad * 40
            if (score > bestScore) {
              bestScore = score
              bestText = decoded
            }
          } catch {
            // 瀏覽器不支援該編碼時略過
          }
        }
        return bestText || new TextDecoder('utf-8').decode(bytes)
      }
    }

    function sampleNovelInBrowser(rawText) {
      const CHAPTER_RE = /^(?:第[一二三四五六七八九十百千萬\d]+[章回節卷部集篇]|Chapter\s+\d+|序章|楔子|尾聲|後記|番外)[^\n]{0,40}$/i
      const src = String(rawText || '').replace(/\r\n?/g, '\n').trim()
      if (!src) return { totalChars: 0, statsSummary: '', previewText: '' }
      const totalChars = src.replace(/\s+/g, '').length
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
      const bodyLines = scanText.split('\n').map((l) => l.trim()).filter(Boolean).filter((l) => !CHAPTER_RE.test(l))
      const dialogueLines = bodyLines.filter((l) => /^[「『“"‘']/.test(l) || /[」』”"]\s*$/.test(l))
      const dialogueRatio = bodyLines.length ? Math.round((dialogueLines.length / bodyLines.length) * 100) : 0
      const sentLens = scanText
        .split(/[。！？!?\n]+/)
        .map((s) => s.replace(/[\s「」『』“”"（）()《》…—，、；：,.]/g, '').length)
        .filter((n) => n >= 2)
      const sentCount = sentLens.length
      const avgSentLen = sentCount
        ? Math.round((sentLens.reduce((a, b) => a + b, 0) / sentCount) * 10) / 10
        : 0
      const shortSentRatio = sentCount
        ? Math.round((sentLens.filter((n) => n <= 15).length / sentCount) * 100)
        : 0
      const longSentRatio = sentCount
        ? Math.round((sentLens.filter((n) => n >= 50).length / sentCount) * 100)
        : 0
      const paraLens = bodyLines.map((l) => l.replace(/\s+/g, '').length).filter((n) => n > 0)
      const avgParaLen = paraLens.length
        ? Math.round(paraLens.reduce((a, b) => a + b, 0) / paraLens.length)
        : 0
      const avgParaSents = bodyLines.length
        ? Math.round((sentCount / bodyLines.length) * 10) / 10
        : 0
      const scanChars = Math.max(1, scanText.replace(/\s+/g, '').length / 1000)
      const dashPer1k = Math.round((((scanText.match(/——|──/g) || []).length) / scanChars) * 10) / 10
      const ellipsisPer1k = Math.round((((scanText.match(/……|\.{3,}/g) || []).length) / scanChars) * 10) / 10
      const parensPer1k = Math.round((((scanText.match(/[（(][^）)\n]{1,40}[）)]/g) || []).length) / scanChars) * 10) / 10
      const wanLabel = totalChars >= 10000 ? `約 ${(totalChars / 10000).toFixed(1)} 萬字` : `${totalChars} 字`
      const statsSummary = `【客觀語言指紋（${wanLabel}）】對話行佔比 ${dialogueRatio}%｜平均句長 ${avgSentLen} 字｜短句(<=15字) ${shortSentRatio}%｜長句(>=50字) ${longSentRatio}%｜段均 ${avgParaSents} 句(${avgParaLen}字)｜破折號 ${dashPer1k}/千字｜省略號 ${ellipsisPer1k}/千字｜括號 ${parensPer1k}/千字`

      if (src.length <= 4600) {
        return { totalChars, statsSummary, previewText: `${statsSummary}\n\n${src}` }
      }
      const sliceCount = 6
      const perSlice = 680
      const anchors = Array.from({ length: sliceCount }, (_, i) => 0.08 + (0.8 / (sliceCount - 1)) * i)
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
        while (cursor < src.length && collected < perSlice) {
          const nextNl = src.indexOf('\n', cursor)
          const end = nextNl >= 0 ? nextNl : src.length
          const line = src.slice(cursor, end).trim()
          cursor = end + 1
          if (!line || CHAPTER_RE.test(line)) continue
          if (/(?:求月票|求推薦|加更|作者的話|第.{1,6}章\s+\S+$)/.test(line) && line.length < 36) continue
          chunkLines.push(line)
          collected += line.length + 1
        }
        prevEnd = cursor
        if (chunkLines.length) {
          excerpts.push(`--- 採樣片段 ${excerpts.length + 1}（約 ${pct}% 處）---\n${chunkLines.join('\n')}`)
        }
      }
      const previewText = `${statsSummary}\n\n${excerpts.join('\n\n') || src.slice(0, 4500)}`
      return { totalChars, statsSummary, previewText }
    }

    function SettingsOverlay({ ui, gameId, close }) {
      ensureAutoProofStyles()
      const [loading, setLoading] = React.useState(true)
      const [schema, setSchema] = React.useState([])
      const [draft, setDraft] = React.useState({})
      const [activeTab, setActiveTab] = React.useState('core')
      const [openHelpKey, setOpenHelpKey] = React.useState(null)
      const [statusMsg, setStatusMsg] = React.useState('')
      const [saving, setSaving] = React.useState(false)
      const [sampleText, setSampleText] = React.useState('')
      const [uploadedBookMeta, setUploadedBookMeta] = React.useState('')
      const [extracting, setExtracting] = React.useState(false)
      const fileInputRef = React.useRef(null)

      const runExtractStyle = async (textOverride, meta = {}) => {
        const target = String(textOverride ?? sampleText ?? '').trim()
        if (!target) {
          setStatusMsg('請先上傳小說檔案（.txt / .md），或直接貼上一段原作範文')
          return
        }
        setExtracting(true)
        setStatusMsg(meta.preMsg || '')
        try {
          const res = await ui.callHost('dsh-tavern-autoproof/extract-style', {
            gameId: gameId || '',
            sampleText: target,
            bookStatsSummary: meta.statsSummary || '',
            fileName: meta.fileName || '',
          })
          if (res?.ok && res.styleCard) {
            setDraft((prev) => ({
              ...prev,
              styleCardText: res.styleCard,
              styleCardEnabled: true,
              ...(res.anchorsText ? { sampleAnchorsText: res.anchorsText, sampleAnchorsEnabled: true } : {}),
              ...(res.characterVoicesText ? { characterVoices: res.characterVoicesText } : {}),
            }))
            const extras = []
            if (res.anchorsCount) extras.push(`${res.anchorsCount} 段輪轉寫作範例`)
            if (res.characterVoicesCount) extras.push(`${res.characterVoicesCount} 位角色語言基因`)
            const extraNote = extras.length ? `（同時收錄 ${extras.join('、')}）` : ''
            setStatusMsg(`✓ 已萃取出正面文風卡${extraNote}，請記得點擊下方「儲存至本角色卡」`)
          } else {
            setStatusMsg(`萃取失敗：${res?.error || '未回傳有效文風卡'}`)
          }
        } catch (err) {
          setStatusMsg(`萃取失敗：${err?.message || String(err)}`)
        } finally {
          setExtracting(false)
        }
      }

      const handleExtractStyle = () => runExtractStyle()

      const handleNovelFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (e.target) e.target.value = ''
        if (!file) return
        const lowerName = (file.name || '').toLowerCase()
        if (!/\.(txt|md|markdown)$/i.test(lowerName) && file.type && !file.type.startsWith('text/')) {
          setStatusMsg('僅支援純文字小說檔（.txt / .md）；若為 .epub 或 .pdf 請先轉存為 .txt 再上傳')
          return
        }
        try {
          setExtracting(true)
          setStatusMsg(`正在讀取《${file.name}》並進行全書統計與均勻採樣…`)
          const buf = await file.arrayBuffer()
          const decoded = decodeNovelBuffer(buf)
          const sampled = sampleNovelInBrowser(decoded)
          if (sampled.totalChars < 60) {
            setExtracting(false)
            setStatusMsg('檔案內容過短或無法解碼（請確認為有效 .txt / .md 純文字檔）')
            return
          }
          setSampleText(sampled.previewText)
          setUploadedBookMeta(`${file.name}｜${sampled.statsSummary.replace(/^【客觀語言指紋（|）】/g, (m) => (m === '）】' ? '：' : ''))}`)
          await runExtractStyle(sampled.previewText, {
            fileName: file.name,
            statsSummary: sampled.statsSummary,
            preMsg: `已讀取《${file.name}》完成全書均勻採樣，正在調用後台模型萃取文風卡…`,
          })
        } catch (err) {
          setExtracting(false)
          setStatusMsg(`讀取檔案失敗：${err?.message || String(err)}`)
        }
      }

      React.useEffect(() => {
        let alive = true
        ;(async () => {
          try {
            const res = await ui.callHost('dsh-tavern-autoproof/get-settings', { gameId })
            if (!alive) return
            setSchema(Array.isArray(res?.schema) ? res.schema : [])
            setDraft(res?.settings && typeof res.settings === 'object' ? res.settings : {})
          } catch (e) {
            if (alive) setStatusMsg('讀取設定失敗：' + String(e?.message || e).slice(0, 120))
          } finally {
            if (alive) setLoading(false)
          }
        })()
        return () => { alive = false }
      }, [])

      const updateField = (key, value) => {
        setDraft((prev) => ({ ...prev, [key]: value }))
        setStatusMsg('')
      }

      const handleSave = async (scope) => {
        setSaving(true)
        setStatusMsg('')
        try {
          const res = await ui.callHost('dsh-tavern-autoproof/save-settings', {
            gameId,
            settings: draft,
            scope,
          })
          if (res?.settings) setDraft(res.settings)
          setStatusMsg(scope === 'global' ? '✓ 已設為全域預設（所有角色卡共用）' : '✓ 已儲存至本角色卡')
        } catch (e) {
          setStatusMsg('儲存失敗：' + String(e?.message || e).slice(0, 120))
        } finally {
          setSaving(false)
        }
      }

      const handleReset = async () => {
        setSaving(true)
        setStatusMsg('')
        try {
          const res = await ui.callHost('dsh-tavern-autoproof/reset-settings', { gameId, scope: 'game' })
          if (res?.settings) setDraft(res.settings)
          setStatusMsg('✓ 已恢復為預設設定')
        } catch (e) {
          setStatusMsg('重設失敗：' + String(e?.message || e).slice(0, 120))
        } finally {
          setSaving(false)
        }
      }

      const tabFields = schema.filter((f) => (f.group || 'core') === activeTab)

      const renderControl = (field) => {
        const val = draft[field.key] ?? field.default
        if (field.type === 'boolean') {
          const on = Boolean(val)
          return h(
            'button',
            {
              type: 'button',
              role: 'switch',
              'aria-checked': on,
              'aria-label': field.label,
              'data-on': on ? 'true' : 'false',
              className: 'ap-switch',
              onClick: () => updateField(field.key, !on),
              title: on ? '已開啟（點擊關閉）' : '已關閉（點擊開啟）',
            },
            h('span', { className: 'ap-switch-thumb' })
          )
        }
        if (field.type === 'number') {
          return h('input', {
            type: 'number',
            className: 'ap-input',
            min: field.min,
            max: field.max,
            step: field.step || 1,
            value: Number(val ?? field.default ?? 8),
            onChange: (e) => updateField(field.key, Number(e.target.value)),
            style: {
              width: '76px',
              padding: '5px 8px',
              textAlign: 'right',
            },
          })
        }
        if (field.type === 'select') {
          const opts = field.options || []
          return h(
            'select',
            {
              className: 'ap-select',
              value: String(val ?? field.default ?? ''),
              onChange: (e) => updateField(field.key, e.target.value),
              style: {
                width: '100%',
                maxWidth: '260px',
                minWidth: '150px',
                padding: '6px 8px',
                cursor: 'pointer',
              },
            },
            ...opts.map((o) => h('option', { key: o.value, value: o.value }, o.label))
          )
        }
        if (field.type === 'textarea') {
          return h('textarea', {
            className: 'ap-textarea',
            value: String(val ?? ''),
            rows: field.rows || 3,
            placeholder: field.placeholder || '',
            onChange: (e) => updateField(field.key, e.target.value),
            style: {
              width: '100%',
              minHeight: '78px',
              marginTop: '8px',
              padding: '7px 9px',
              lineHeight: 1.5,
              resize: 'vertical',
            },
          })
        }
        return null
      }

      const renderFieldRow = (field) => {
        const badge = TIER_BADGE[field.tier] || TIER_BADGE.local
        const helpOpen = openHelpKey === field.key
        const isTextarea = field.type === 'textarea'
        return h(
          'div',
          {
            key: field.key,
            className: 'ap-field',
          },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' } },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: '1 1 200px', minWidth: 0 } },
              h('span', { style: { fontSize: '13px', fontWeight: 600, color: 'var(--ap-ink)' } }, field.label),
              h(
                'button',
                {
                  type: 'button',
                  title: field.help || '',
                  onClick: () => setOpenHelpKey(helpOpen ? null : field.key),
                  style: {
                    width: '18px',
                    height: '18px',
                    borderRadius: '999px',
                    border: helpOpen ? '1px solid var(--ap-accent)' : '1px solid var(--ap-border)',
                    background: helpOpen ? 'var(--ap-accent-soft)' : 'transparent',
                    color: helpOpen ? 'var(--ap-accent)' : 'var(--ap-muted)',
                    fontSize: '11px',
                    fontWeight: 700,
                    lineHeight: '16px',
                    padding: 0,
                    cursor: 'pointer',
                    flexShrink: 0,
                  },
                },
                '?'
              ),
              h(
                'span',
                {
                  style: {
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: badge.bg,
                    color: badge.color,
                    border: badge.border,
                    whiteSpace: 'nowrap',
                  },
                },
                badge.text
              )
            ),
            isTextarea ? null : renderControl(field)
          ),
          isTextarea ? renderControl(field) : null,
          helpOpen && field.help
            ? h('div', { className: 'ap-help-box' }, field.help)
            : null
        )
      }

      return h(
        'div',
        {
          className: 'ap-modal',
          style: {
            width: 'min(640px, calc(100vw - 24px))',
            maxWidth: '100%',
            margin: '16px auto',
            padding: '16px',
          },
        },
        h(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', paddingBottom: '12px', marginBottom: '12px', borderBottom: '1px solid var(--ap-border)' } },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 } },
            renderBrandLogo(36),
            h(
              'div',
              { style: { minWidth: 0 } },
              h('h3', { className: 'ap-title' }, '澄文 · AutoProof v1.39 設定'),
              h('div', { className: 'ap-sub' }, '點擊各項目 ? 查看細節 · 配色自動跟隨酒館皮膚')
            )
          ),
          h(
            'button',
            {
              type: 'button',
              onClick: close,
              className: 'ap-btn',
              style: {
                padding: '5px 10px',
                border: '1px solid var(--ap-border)',
                background: 'transparent',
                color: 'var(--ap-muted)',
                flexShrink: 0,
              },
            },
            '✕'
          )
        ),
        h(
          'div',
          { className: 'ap-tab-bar' },
          ...GROUP_TABS.map((t) =>
            h(
              'button',
              {
                key: t.id,
                type: 'button',
                onClick: () => setActiveTab(t.id),
                className: 'ap-tab',
                style: {
                  background: activeTab === t.id ? 'var(--ap-accent)' : 'transparent',
                  color: activeTab === t.id ? 'var(--ap-accent-ink)' : 'var(--ap-muted)',
                },
              },
              t.label
            )
          )
        ),
        h(
          'div',
          { className: 'ap-scroll', style: { overflowY: 'auto', maxHeight: '58vh', paddingRight: '2px' } },
          loading
            ? h('div', { style: { padding: '24px', textAlign: 'center', color: 'var(--ap-muted)', fontSize: '13px' } }, '載入設定中…')
            : h(
                React.Fragment,
                null,
                activeTab === 'style'
                  ? h(
                      'div',
                      {
                        style: {
                          padding: '12px',
                          borderRadius: 'var(--ap-radius-md)',
                          background: 'linear-gradient(135deg, var(--ap-accent-soft), var(--ap-panel))',
                          border: '1px solid var(--ap-accent-border)',
                          marginBottom: '10px',
                        },
                      },
                      h(
                        'div',
                        { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' } },
                        h('span', { style: { fontSize: '13px', fontWeight: 700, color: 'var(--ap-accent)' } }, '一鍵從範文／整本小說萃取（同人卡／小說卡適用）'),
                        h(
                          'div',
                          { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                          h('input', {
                            ref: fileInputRef,
                            type: 'file',
                            accept: '.txt,.md,text/plain,text/markdown',
                            onChange: handleNovelFileChange,
                            style: { display: 'none' },
                          }),
                          h(
                            'button',
                            {
                              type: 'button',
                              disabled: extracting,
                              onClick: () => fileInputRef.current?.click(),
                              className: 'ap-btn',
                              style: {
                                border: '1px solid var(--ap-good-border)',
                                background: 'var(--ap-good-soft)',
                                color: 'var(--ap-good)',
                              },
                            },
                            '上傳整本小說 (.txt/.md)'
                          ),
                          h(
                            'button',
                            {
                              type: 'button',
                              disabled: extracting,
                              onClick: handleExtractStyle,
                              className: 'ap-btn ap-btn-primary',
                              style: {
                                border: '1px solid var(--ap-accent)',
                                background: 'var(--ap-accent)',
                                color: 'var(--ap-accent-ink)',
                              },
                            },
                            extracting ? '萃取中…' : '✦ 一鍵萃取文風與基因'
                          )
                        )
                      ),
                      h(
                        'div',
                        {
                          style: {
                            fontSize: '11px',
                            color: 'var(--ap-muted)',
                            background: 'var(--ap-panel-soft)',
                            border: '1px solid var(--ap-border)',
                            borderRadius: 'var(--ap-radius-sm)',
                            padding: '7px 9px',
                            marginBottom: '8px',
                            lineHeight: 1.5,
                          },
                        },
                        '📌 適用說明：文風萃取與寫作範例輪轉主要推薦用於「同人卡／小說改編卡」；一鍵萃取會同步填入「正面文風卡」「寫作範例輪轉庫」與「多角色語言基因卡」。純原創卡或找不到參考文本時可略過本區留白，直接手動填寫下方「多角色語言基因卡」並搭配「純本地淨化」即可發揮完整效果。'
                      ),
                      uploadedBookMeta
                        ? h(
                            'div',
                            {
                              style: {
                                fontSize: '11px',
                                color: 'var(--ap-accent)',
                                marginBottom: '6px',
                                lineHeight: 1.45,
                                wordBreak: 'break-word',
                              },
                            },
                            `已載入：${uploadedBookMeta}`
                          )
                        : null,
                      h('textarea', {
                        className: 'ap-textarea',
                        value: sampleText,
                        rows: 4,
                        placeholder: '可點「上傳整本小說 (.txt/.md)」自動統計全書節奏並均勻採樣（支援 UTF-8／GBK／Big5），或直接貼上一段範文後按「一鍵萃取文風卡」…',
                        onChange: (e) => setSampleText(e.target.value),
                        style: {
                          width: '100%',
                          minHeight: '86px',
                          padding: '7px 9px',
                          lineHeight: 1.5,
                          resize: 'vertical',
                        },
                      })
                    )
                  : null,
                ...tabFields.map(renderFieldRow)
              )
        ),
        statusMsg
          ? h(
              'div',
              {
                style: {
                  marginTop: '8px',
                  padding: '7px 10px',
                  borderRadius: 'var(--ap-radius-sm)',
                  background: statusMsg.startsWith('✓')
                    ? 'var(--ap-good-soft)'
                    : /^(?:正在|已讀取)/.test(statusMsg)
                      ? 'var(--ap-accent-soft)'
                      : 'var(--ap-bad-soft)',
                  border: statusMsg.startsWith('✓')
                    ? '1px solid var(--ap-good-border)'
                    : /^(?:正在|已讀取)/.test(statusMsg)
                      ? '1px solid var(--ap-accent-border)'
                      : '1px solid var(--ap-bad-border)',
                  color: statusMsg.startsWith('✓')
                    ? 'var(--ap-good)'
                    : /^(?:正在|已讀取)/.test(statusMsg)
                      ? 'var(--ap-accent)'
                      : 'var(--ap-bad)',
                  fontSize: '12px',
                },
              },
              statusMsg
            )
          : null,
        h(
          'div',
          { style: { display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--ap-border)', flexWrap: 'wrap' } },
          h(
            'button',
            {
              type: 'button',
              disabled: saving,
              onClick: handleReset,
              className: 'ap-btn',
              style: {
                border: '1px solid var(--ap-border)',
                background: 'transparent',
                color: 'var(--ap-muted)',
              },
            },
            '恢復預設'
          ),
          h(
            'div',
            { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' } },
            h(
              'button',
              {
                type: 'button',
                disabled: saving,
                onClick: () => handleSave('global'),
                className: 'ap-btn',
                style: {
                  border: '1px solid var(--ap-accent-border)',
                  background: 'var(--ap-accent-soft)',
                  color: 'var(--ap-accent)',
                },
              },
              '設為全域預設'
            ),
            h(
              'button',
              {
                type: 'button',
                disabled: saving,
                onClick: () => handleSave('game'),
                className: 'ap-btn ap-btn-primary',
                style: {
                  border: '1px solid var(--ap-accent)',
                  background: 'var(--ap-accent)',
                  color: 'var(--ap-accent-ink)',
                },
              },
              '儲存至本角色卡'
            ),
            h(
              'button',
              {
                type: 'button',
                onClick: close,
                className: 'ap-btn',
                style: {
                  border: '1px solid var(--ap-border)',
                  background: 'transparent',
                  color: 'var(--ap-ink)',
                },
              },
              '關閉'
            )
          )
        )
      )
    }

    // v1.21：點「重新校對」立刻出這個窗口——先顯示連續旋轉進度，跑完原地換成報告，失敗也顯示原因
    function ProofRunner({ ui, gameId, turn, close }) {
      ensureAutoProofStyles()
      const [report, setReport] = React.useState(null)
      const [error, setError] = React.useState('')
      const [elapsed, setElapsed] = React.useState(0)
      React.useEffect(() => {
        let alive = true
        const timer = setInterval(() => { if (alive) setElapsed(v => v + 1) }, 1000)
        ;(async () => {
          try {
            const r = await ui.callHost('dsh-tavern-autoproof/proof', { gameId, turn })
            if (alive) setReport(r || { turn, metrics: {}, violations: [], edited: false })
          } catch (e) {
            if (alive) setError(String((e && e.message) || e).slice(0, 220))
          }
        })()
        return () => { alive = false; clearInterval(timer) }
      }, [])
      if (error) {
        return h(
          'div',
          { className: 'ap-modal', style: { width: 'min(420px, calc(100vw - 24px))', margin: '10vh auto', padding: '18px' } },
          h('div', { style: { color: 'var(--ap-bad)', fontWeight: 600, fontSize: '13px', marginBottom: '12px', lineHeight: 1.55 } }, '校對失敗：' + error),
          h('button', { type: 'button', onClick: close, className: 'ap-btn', style: { border: '1px solid var(--ap-border)', background: 'transparent', color: 'var(--ap-ink)' } }, '關閉')
        )
      }
      if (report) return renderReportOverlay(ui, gameId, turn, report, close)

      const gradId = 'ap-spin-grad'
      return h(
        'div',
        {
          className: 'ap-modal',
          style: {
            width: 'min(440px, calc(100vw - 24px))',
            margin: '8vh auto',
            padding: '22px 20px',
            textAlign: 'center',
          },
        },
        h(
          'div',
          { style: { position: 'relative', width: '76px', height: '76px', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          h(
            'svg',
            { className: 'ap-spinner-ring', width: 76, height: 76, viewBox: '0 0 76 76', style: { position: 'absolute', inset: 0 } },
            h(
              'defs',
              null,
              h(
                'linearGradient',
                { id: gradId, x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
                h('stop', { offset: '0%', stopColor: 'var(--ap-accent)', stopOpacity: 1 }),
                h('stop', { offset: '70%', stopColor: 'var(--ap-accent)', stopOpacity: 0.45 }),
                h('stop', { offset: '100%', stopColor: 'var(--ap-accent)', stopOpacity: 0.06 })
              )
            ),
            h('circle', {
              cx: 38,
              cy: 38,
              r: 31,
              fill: 'none',
              stroke: 'var(--ap-border)',
              strokeWidth: 4.5,
            }),
            h('circle', {
              cx: 38,
              cy: 38,
              r: 31,
              fill: 'none',
              stroke: `url(#${gradId})`,
              strokeWidth: 4.5,
              strokeDasharray: '146 50',
              strokeLinecap: 'round',
            })
          ),
          renderBrandLogo(38)
        ),
        h('div', { className: 'ap-title', style: { fontSize: '15px' } }, `澄文 · AutoProof 校對中（第 ${turn} 輪）`),
        h('div', { className: 'ap-sub', style: { fontSize: '12px', marginTop: '6px', lineHeight: 1.6 } }, `已執行 ${elapsed} 秒 · 採用 5 段批次精編與低訊號過濾`),
        h(
          'div',
          {
            style: {
              marginTop: '12px',
              padding: '10px 12px',
              borderRadius: 'var(--ap-radius-md)',
              background: 'var(--ap-panel)',
              border: '1px solid var(--ap-border)',
              fontSize: '11px',
              color: 'var(--ap-muted)',
              lineHeight: 1.55,
              textAlign: 'left',
            },
          },
          '處理流程：Tier 1 本地 0-Token 淨化與濃度掃描 → 低訊號段落跳過 → Tier 2 批次精修寫回。含模型改寫時約需 15 秒～2 分鐘，可先關掉視窗，跑完後點訊息下方「校對」查看結果。'
        ),
        h(
          'div',
          { style: { marginTop: '14px', display: 'flex', justifyContent: 'center' } },
          h('button', { type: 'button', onClick: close, className: 'ap-btn', style: { border: '1px solid var(--ap-border)', background: 'transparent', color: 'var(--ap-ink)', padding: '6px 16px' } }, '背景運行並關閉')
        )
      )
    }

    function openSettingsModal(ui, gameId) {
      if (typeof ui.openOverlay !== 'function') return
      ui.openOverlay({
        gameId,
        dismissible: true,
        render: ({ close }) => h(SettingsOverlay, { ui, gameId, close }),
      })
    }

    const FLAG_LABELS = {
      paired_reversal: '對舉否定揭示',
      omitted_antithesis: '密集對舉句式',
      action_inflation: '動作拆解／頂真',
      soft_dialogue_stage: '對話舞台動作偏高',
      reduplication_cluster: '疊詞量詞群聚',
      soft_suspense_escalation: '懸念加碼模板',
      tidy_ending: '心理頓悟／說教收尾',
      flat_pacing: '句長／段長扁平',
      telling_heavy: '心理直寫偏多',
      dialogue_sandwich: '三明治對話模板',
      verb_triple_parallel: '動詞三連排比',
      info_dump_dialogue: '台詞設定百科科普',
      dialogue_ai_tone: '對白書面／AI 腔',
      telegraph_short_paras: '一句一段碎句過高',
      speech_obj_defect: '言說賓語頂替語病',
      syntax_translationese: '敘事句法翻譯腔殼',
      padding_verb_chain: '雙音節膨脹動詞殼',
      isomorphic_rhythm: '相鄰句節拍同構',
      list_prefix_run: '連續同開頭列表感',
      embodied_overload: '生理反應連發過度',
      cohesion_chain: '段落過度平滑承接',
      iso_rhythm: '句拍同構重複',
      opening_monotony: '連續三輪相同開場',
    }

    const fmtFlags = (arr = []) => arr.map((k) => FLAG_LABELS[k] || k).join('、')

    function renderReportOverlay(ui, gameId, turn, report, close) {
      return h(ReportOverlay, { ui, gameId, turn, initialReport: report, close })
    }

    function ReportOverlay({ ui, gameId, turn, initialReport, close }) {
      ensureAutoProofStyles()
      const [report, setReport] = React.useState(initialReport)
      const [undoBusy, setUndoBusy] = React.useState(false)
      const [undoError, setUndoError] = React.useState('')

      const item = (label, value, color) =>
        h(
          'div',
          {
            key: label + String(value),
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '6px 0',
              borderBottom: '1px solid var(--ap-border)',
              fontSize: '13px',
            },
          },
          h('span', { style: { color: 'var(--ap-muted)', flexShrink: 0 } }, label),
          h(
            'strong',
            { style: { textAlign: 'right', wordBreak: 'break-word', color: color || 'var(--ap-ink)' } },
            String(value ?? '-')
          )
        )

      const section = (title) =>
        h(
          'div',
          {
            key: `sec-${title}`,
            style: {
              marginTop: '14px',
              marginBottom: '4px',
              paddingBottom: '4px',
              borderBottom: '1px solid var(--ap-accent-border)',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'var(--ap-display-font)',
              color: 'var(--ap-accent)',
              letterSpacing: '0.03em',
            },
          },
          title
        )

      if (!report) {
        return h(
          'div',
          {
            className: 'ap-modal',
            style: {
              width: 'min(520px, calc(100vw - 24px))',
              margin: '8vh auto',
              padding: '20px',
            },
          },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' } },
            renderBrandLogo(36),
            h('h3', { className: 'ap-title', style: { fontSize: '16px' } }, `澄文 · AutoProof 報告（第 ${turn} 輪）`)
          ),
          h('p', { style: { fontSize: '13px', color: 'var(--ap-muted)', margin: 0 } }, '尚無本輪校對資料，請點擊下方按鈕執行校對。'),
          h(
            'div',
            { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', flexWrap: 'wrap' } },
            h(
              'button',
              {
                type: 'button',
                onClick: () => {
                  close()
                  openSettingsModal(ui, gameId)
                },
                className: 'ap-btn',
                style: {
                  border: '1px solid var(--ap-accent-border)',
                  background: 'var(--ap-accent-soft)',
                  color: 'var(--ap-accent)',
                },
              },
              '⚙ 設定'
            ),
            h(
              'button',
              {
                type: 'button',
                onClick: async () => {
                  await ui.callHost('dsh-tavern-autoproof/proof', { gameId, turn }).catch(() => {})
                  close()
                },
                className: 'ap-btn ap-btn-primary',
                style: {
                  border: '1px solid var(--ap-accent)',
                  background: 'var(--ap-accent)',
                  color: 'var(--ap-accent-ink)',
                },
              },
              '立即校對'
            ),
            h(
              'button',
              {
                type: 'button',
                onClick: close,
                className: 'ap-btn',
                style: {
                  border: '1px solid var(--ap-border)',
                  background: 'transparent',
                  color: 'var(--ap-ink)',
                },
              },
              '關閉'
            )
          )
        )
      }

      const m = report.metrics || {}
      const f = report.features || null
      const writeStatus = report.writeOk === true
        ? ('是（已寫回正文' + (report.htmlSalvaged ? '，已保護 HTML' : '') + '）')
        : (report.edited ? '否（寫回失敗／僅本地分析）' : '否（原文保留）')

      const nsfwLabel = report.nsfwRouting === 'local_only'
        ? '全篇純本地（0 Token）'
        : report.nsfwRouting === 'send_all'
          ? '全部送交 Tier 2'
          : `智能分流（留守本地 ${report.nsfwBypassedCount || 0} 段）`

      const rows = [
        section('一、基本寫回與正文指標'),
        item('校對模式 / NSFW 分流', `${report.mode === 'conservative' ? '保守' : report.mode === 'aggressive' ? '積極' : '標準'} / ${nsfwLabel}`),
        item('是否已寫回正文', writeStatus, report.reverted ? 'var(--ap-warn)' : report.writeOk ? 'var(--ap-good)' : undefined),
        item('正文字數 / 段落數', `${m.chars ?? 0} 字 / ${m.paragraphs ?? 0} 段`),
        item('對舉句式 / 每500字密度', `${m.antithesisCount ?? 0} 處（${m.antithesisDensityPer500 ?? 0}/500字）`),
        item('動作拆解 / 疊詞350字峰值', `${m.actionEchoCount ?? 0} 處 / ${m.maxRedupIn350 ?? 0} 處`),
        item('對話伴隨動作比例', m.dialogueActionRatio != null ? `${Math.round(m.dialogueActionRatio * 100)}%` : '-'),
      ]

      if (report.quoteConverted > 0) {
        rows.push(item('雙向引號規範化', `已統一 ${report.quoteConverted} 處引號`))
      }

      const fixes = report.charFixes || []
      const totalFixCount = fixes.reduce((sum, x) => sum + (Number(x.count) || 0), 0)
      if (fixes.length > 0) {
        const fixesSummary = fixes.map(x => `${x.from}→${x.to}×${x.count}`).join('、')
        if (fixes.length > 15 || totalFixCount > 25) {
          rows.push(
            h(
              'details',
              {
                key: 'char-fixes-fold',
                style: {
                  padding: '6px 0',
                  borderBottom: '1px solid var(--ap-border)',
                  fontSize: '13px',
                },
              },
              h(
                'summary',
                { style: { cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--ap-muted)' } },
                h('span', null, '第一層字級與詞組修復'),
                h('span', { style: { color: 'var(--ap-good)', fontSize: '12px', fontWeight: 600 } }, `共 ${fixes.length} 種 / ${totalFixCount} 次（展開明細 ▾）`)
              ),
              h(
                'div',
                {
                  style: {
                    marginTop: '6px',
                    padding: '8px',
                    borderRadius: 'var(--ap-radius-sm)',
                    background: 'var(--ap-panel-soft)',
                    border: '1px solid var(--ap-border)',
                    fontSize: '12px',
                    lineHeight: 1.55,
                    color: 'var(--ap-ink)',
                    wordBreak: 'break-all',
                  },
                },
                fixesSummary
              )
            )
          )
        } else {
          rows.push(item('第一層字級與詞組修復', fixesSummary))
        }
      }
      if (f && (f.preCleanedCount || 0) > 0) {
        rows.push(
          item(
            '無損廢話起手預清理（0 Token）',
            `已清 ${f.preCleanedCount} 處（${(f.preCleanedRemoved || []).slice(0, 3).join('、')}）`,
            'var(--ap-good)'
          )
        )
      }
      if (f && ((f.metaLeakRemovedCount || 0) > 0 || (f.metaLeakDetectedCount || 0) > 0 || f.truncatedEnding)) {
        const mlParts = []
        if (f.metaLeakRemovedCount > 0) {
          mlParts.push(`已清理 ${f.metaLeakRemovedCount} 條系統／字數殘留`)
        } else if (f.metaLeakDetectedCount > 0) {
          mlParts.push(`檢出 ${f.metaLeakDetectedCount} 條殘留（僅標記）`)
        }
        if (f.truncatedEnding) {
          mlParts.push(`疑似截斷／未閉合引號（${f.truncatedSample || '結尾異常'}）`)
        }
        rows.push(
          item(
            '後設／系統元資料與截斷防護',
            mlParts.join(' · '),
            f.truncatedEnding ? 'var(--ap-bad)' : 'var(--ap-good)'
          )
        )
      }
      if (f && f.concentration) {
        const lvlMap = { low: '低（自然）', mid: '中（有痕跡）', high: '高（明顯 AI 味）', severe: '極高' }
        const c = f.concentration
        const dampNote = (c.anchorHits > 0 || c.imperfectionHits > 0)
          ? ` · 具體細節/口語抵銷(${c.anchorHits}/${c.imperfectionHits})`
          : ''
        rows.push(
          item(
            'AI 味綜合濃度評分',
            `${c.score} · ${lvlMap[c.level] || c.level}${dampNote} · 語氣詞 ${c.modalDensity}/千字`,
            c.level === 'low' ? 'var(--ap-good)' : c.level === 'mid' ? 'var(--ap-warn)' : 'var(--ap-bad)'
          )
        )
      }
      if (f && (f.behaviorAdaptActive || (f.modelFamily && f.modelFamily !== 'unknown') || f.dashLimitApplied != null)) {
        const bgNote = (f.modelFamily && f.modelFamily !== 'unknown') ? ` · 後台 ${f.modelFamily}` : ''
        const adaptVal = f.behaviorAdaptActive
          ? `近 3 輪自適應調整（${f.behaviorAdaptSummary || '已平衡'} · 破折號門檻 ${f.dashLimitApplied}/千字）`
          : `基準監測中（破折號門檻 ${f.dashLimitApplied ?? 2}/千字${bgNote}）`
        rows.push(item('純文字行為自適應', adaptVal, f.behaviorAdaptActive ? 'var(--ap-warn)' : undefined))
      }

      const lex = report.localAudit?.lexicon
      if (lex && lex.enabled) {
        rows.push(
          item(
            '網文 AI 模板詞 / 弱化副詞',
            `模板 ${lex.t1Count || 0} 處 · 弱副詞 ${lex.softPerK || 0}/千字`
          )
        )
      }
      const rhy = report.localAudit?.rhythm
      if (rhy && rhy.enabled) {
        const cvStr = `段CV ${rhy.paraCv ?? '-'} / 句CV ${rhy.sentCv ?? '-'}`
        rows.push(item('純本地節奏變異係數', cvStr))
        if (rhy.sensory && rhy.sensory.ratios) {
          const summary = Object.entries(rhy.sensory.ratios)
            .filter(([, v]) => v > 0)
            .map(([k, v]) => `${k}${Math.round(v * 100)}%`)
            .join(' · ')
          if (summary) rows.push(item('六感分佈（純本地）', summary))
        }
      }

      rows.push(section('二、新功能與主動防護應用狀態'))

      if (f) {
        // 1. 正面文風卡
        let styleVal = '未啟用'
        let styleColor = 'var(--ap-muted)'
        if (f.styleCardEnabled) {
          if (f.styleCardChars > 0) {
            const apps = []
            if (f.styleCardGenUsed) apps.push('已注入主模型生成')
            if (f.styleCardTier2Used) apps.push('已帶入本輪 Tier 2 修稿')
            if (!apps.length) {
              apps.push(report.tier2?.ran ? '已待命' : '本輪原文免修；下輪／重Roll生成會注入')
            }
            styleVal = `已啟用（${f.styleCardChars} 字）· ${apps.join(' ＋ ')}`
            if (f.styleDnaOverrideActive && (f.styleDnaOverrideNotes || []).length > 0) {
              styleVal += ` · DNA 優先（${f.styleDnaOverrideNotes.join('／')}）`
            }
            styleColor = (f.styleCardGenUsed || f.styleCardTier2Used) ? 'var(--ap-good)' : 'var(--ap-warn)'
          } else {
            styleVal = '尚未設定內容（可至「正面文風 ✨」上傳小說萃取）'
            styleColor = 'var(--ap-muted)'
          }
        }
        rows.push(item('正面文風錨點（Style Card）', styleVal, styleColor))

        // 1b. 寫作範例確定性輪轉（含場景感知對齊）
        let anchorVal = '未啟用'
        let anchorColor = 'var(--ap-muted)'
        const sceneLabels = { dialogue: '對白交鋒', action: '動作緊張', tension: '心理張力', daily: '日常過場' }
        if (f.sampleAnchorsEnabled) {
          if ((f.sampleAnchorsTotal || 0) > 0) {
            const sceneNote = f.sampleAnchorsScene
              ? ` · 場景對齊「${sceneLabels[f.sampleAnchorsScene] || f.sampleAnchorsScene}」`
              : ''
            anchorVal = `已收錄 ${f.sampleAnchorsTotal} 段 · ${f.sampleAnchorsGenUsed > 0 ? `生成前輪轉注入 ${f.sampleAnchorsGenUsed} 段` : '下輪／重Roll起輪轉注入'}${sceneNote}`
            anchorColor = f.sampleAnchorsGenUsed > 0 ? 'var(--ap-good)' : 'var(--ap-warn)'
          } else {
            anchorVal = '尚未設定（同人／小說卡上傳範文會自動挑段，原創卡可留白）'
          }
        }
        rows.push(item('寫作範例輪轉', anchorVal, anchorColor))

        // 1c. 多角色語言基因卡
        let voiceVal = '未設定'
        let voiceColor = 'var(--ap-muted)'
        if ((f.voiceProfileCount || 0) > 0) {
          const vParts = [`監控 ${f.voiceProfileCount} 位角色`]
          if (f.voiceGenUsed > 0) vParts.push('生成前已注入')
          if ((f.voiceTabooHits || []).length > 0) {
            vParts.push(`誤觸禁忌：${f.voiceTabooHits.map(x => `${x.name}(${x.phrase})`).join('、')}`)
            voiceColor = 'var(--ap-bad)'
          } else {
            vParts.push('未誤觸禁忌詞')
            voiceColor = 'var(--ap-good)'
          }
          if ((f.voiceTicsMissing || []).length > 0) {
            vParts.push(`口癖提醒：${f.voiceTicsMissing.join('、')}`)
          }
          voiceVal = vParts.join(' · ')
        }
        rows.push(item('多角色語言基因卡', voiceVal, voiceColor))

        // 1d. 文風白名單掩碼
        rows.push(
          item(
            '文風白名單豁免',
            (f.whitelistRuleCount || 0) > 0
              ? `已登記 ${f.whitelistRuleCount} 條（本輪掃描豁免 ${f.whitelistMaskedChars || 0} 字）`
              : '未登記（所有寫法皆參與掃描）',
            (f.whitelistMaskedChars || 0) > 0 ? 'var(--ap-good)' : 'var(--ap-muted)'
          )
        )

        // 2. Verbalized Sampling
        rows.push(
          item(
            'Verbalized Sampling（破套路）',
            f.verbalizedSampling ? '已開啟（於主模型生成前引導思考區多路取樣）' : '未開啟（預設關閉）',
            f.verbalizedSampling ? 'var(--ap-good)' : 'var(--ap-muted)'
          )
        )

        // 3. 實體專有名詞鎖
        let entityVal = '已關閉'
        let entityColor = 'var(--ap-muted)'
        if (f.entityLockMode !== 'off') {
          const scope = `監控 ${f.entityLockRuleCount} 條（自訂 ${f.entityLockCustomCount} / 卡面 ${f.entityLockCardCount}）`
          if (f.entityLockTotal > 0) {
            const detail = (f.entityLockDetail || []).map(x => `${x.from}→${x.to}×${x.count}`).join('、')
            entityVal = `已訂正 ${f.entityLockTotal} 處（${detail}）｜${scope}`
            entityColor = 'var(--ap-good)'
          } else {
            entityVal = `${scope} · 本輪無專名詞錯寫`
          }
        }
        rows.push(item('實體專有名詞鎖', entityVal, entityColor))

        // 4. 知而不言邊界
        const ugLabels = { off: '關閉', report: '僅標記', adaptive: '自適應', always: '每輪注入' }
        let ugVal = '關閉'
        let ugColor = 'var(--ap-muted)'
        if (f.utteranceGateMode !== 'off') {
          const modeTxt = ugLabels[f.utteranceGateMode] || f.utteranceGateMode
          const genTxt = f.utteranceGateGenInjected ? '（生成前已注入）' : ''
          if (f.infoDumpCount > 0) {
            const samp = (f.infoDumpSamples || []).slice(0, 1).join('')
            ugVal = `${modeTxt}${genTxt} · 檢出 ${f.infoDumpCount} 處科普${samp ? `（${samp}）` : ''}`
            ugColor = 'var(--ap-warn)'
          } else {
            ugVal = `${modeTxt}${genTxt} · 本輪台詞自然（未見設定科普）`
          }
        }
        rows.push(item('知而不言邊界（防念設定集）', ugVal, ugColor))

        // 5. 高頻動作冷卻池 & StoryScope 敘事結構
        const turnActions = (f.turnMicroActions || []).map(x => `${x.word}×${x.count}`).join('、')
        const cdInjected = (f.cooldownInjected || []).join('、')
        const cdMode = f.cooldownMode === 'off' ? '關閉' : f.cooldownMode === 'report' ? '僅統計' : '自動冷卻'
        const cdParts = [cdMode]
        cdParts.push(turnActions ? `本輪命中：${turnActions}` : '本輪未見高頻動作套詞')
        if (cdInjected) cdParts.push(`冷卻中：${cdInjected}`)
        rows.push(item('跨輪高頻動作冷卻池', cdParts.join(' · '), cdInjected ? 'var(--ap-warn)' : undefined))

        const turnStruct = fmtFlags(f.turnStructuralFlags || [])
        const recurStruct = fmtFlags(f.structuralRecurring || [])
        const nsMode = f.narrativeSteeringMode === 'off' ? '關閉' : f.narrativeSteeringMode === 'report' ? '僅統計' : '自動糾偏'
        const nsParts = [nsMode]
        nsParts.push(turnStruct ? `本輪檢出：${turnStruct}` : '本輪結構正常')
        if (recurStruct) nsParts.push(`跨輪提醒中：${recurStruct}`)
        rows.push(item('敘事結構指紋（StoryScope）', nsParts.join(' · '), recurStruct ? 'var(--ap-warn)' : undefined))

        if (f.openingKind) {
          const openMap = { dialogue: '對白破題', weather_time: '景物／時間起手', character_micro: '人物微動作起手', action: '動作切入', other: '一般敘事' }
          const openTxt = f.openingMonotony
            ? `${openMap[f.openingKind] || f.openingKind} · ⚠️ 連 3 輪相同開場`
            : (openMap[f.openingKind] || f.openingKind)
          rows.push(item('本輪開場類型', openTxt, f.openingMonotony ? 'var(--ap-warn)' : undefined))
        }

        // 6. 碎句／稀釋／語病補充掃描
        const deepNotes = []
        if (f.oneSentenceParas && f.oneSentenceParas.total >= 12) {
          deepNotes.push(`一句一段 ${Math.round((f.oneSentenceParas.ratio || 0) * 100)}%`)
        }
        if (f.dilution) {
          deepNotes.push(`的字 ${f.dilution.dePerSent}/句 · bigram重複 ${Math.round((f.dilution.bigramRate || 0) * 100)}%`)
        }
        if ((f.speechObjDefectsCount || 0) > 0) {
          deepNotes.push(`言說賓語語病 ${f.speechObjDefectsCount} 處`)
        }
        if (deepNotes.length > 0) {
          rows.push(item('深度稀釋與語病掃描', deepNotes.join(' · '), (f.speechObjDefectsCount || 0) > 0 ? 'var(--ap-warn)' : undefined))
        }
        const extraDiag = []
        if ((f.isomorphicPairs || 0) > 0 || (f.isomorphicTriples || 0) > 0) {
          extraDiag.push(`句構同構 ${f.isomorphicPairs} 組(三連 ${f.isomorphicTriples})`)
        }
        if ((f.listPrefixRuns || 0) > 0) extraDiag.push(`列表同字開頭 ${f.listPrefixRuns} 組`)
        if ((f.translationeseCount || 0) > 0) extraDiag.push(`句法翻譯腔／膨脹詞 ${f.translationeseCount} 處`)
        if ((f.synonymSwapWindows || 0) > 0) extraDiag.push(`刻意換詞窗 ${f.synonymSwapWindows}`)
        if (f.mtldEstimate != null) extraDiag.push(`MTLD ${f.mtldEstimate}`)
        if ((f.maxCohesionChain || 0) >= 6) extraDiag.push(`過渡連環 ${f.maxCohesionChain} 段`)
        if (f.embodiedOverload) extraDiag.push(`生理詞連發 ${f.embodiedHits} 處`)
        if (extraDiag.length > 0) {
          rows.push(item('句拍／翻譯腔／StoryScope+', extraDiag.join(' · ')))
        }
        if ((f.addressWarnings || []).length > 0) {
          const aw = f.addressWarnings.map(w => `${w.baseName}（${Object.entries(w.counts).map(([k, v]) => `${k}×${v}`).join('/')}）`).join('；')
          rows.push(item('稱謂變體混用提醒', aw, 'var(--ap-warn)'))
        }
      } else {
        // 兼容舊版歷史報告
        if (report.entityLockFixes > 0) {
          rows.push(item('實體專有名詞鎖訂正', `自動修正 ${report.entityLockFixes} 處`))
        }
        if (report.localAudit?.infoDump?.count > 0) {
          const samples = (report.localAudit.infoDump.samples || []).slice(0, 2).join('｜')
          rows.push(item('台詞設定科普警示', `${report.localAudit.infoDump.count} 處${samples ? `（${samples}）` : ''}`))
        }
        if ((report.localAudit?.cooldownWords || []).length) {
          rows.push(item('高頻動作冷卻池', report.localAudit.cooldownWords.join('、')))
        }
        if ((report.localAudit?.structuralRecurring || []).length) {
          rows.push(item('敘事結構提醒（StoryScope）', fmtFlags(report.localAudit.structuralRecurring)))
        }
      }

      if ((report.recurringStyleKeys || []).length) {
        rows.push(item('跨輪重複句式習慣', fmtFlags(report.recurringStyleKeys)))
      }

      rows.push(section('三、局部精編與 Tier 2 執行明細'))
      if (f) {
        const pdMode = f.protectDialogueMode || 'smart'
        const pdTxt = pdMode === 'off'
          ? `關閉（對白皆交由 Tier 2 檢查 · 本輪送校 ${f.dialogueReleasedCount || 0} 段）`
          : pdMode === 'strict'
            ? `嚴格跳過（已完全保護 ${report.dialogueProtectedCount || 0} 段對白）`
            : `智能放行（已護短口癖 ${report.dialogueProtectedCount || 0} 段 · 放行 AI 腔對白送修 ${f.dialogueReleasedCount || 0} 段）`
        rows.push(item('對話與口癖保護區', pdTxt, (f.dialogueReleasedCount || 0) > 0 ? 'var(--ap-good)' : undefined))
      } else if (report.dialogueProtectedCount > 0) {
        rows.push(item('對話口癖保護區', `已跳過 ${report.dialogueProtectedCount} 段`))
      }
      if (report.rewriteCandidates != null) {
        rows.push(item('候選問題 / 送校段落', `${report.rewriteCandidates} 項 / ${report.targetSegments ?? 0} 段`))
      }
      if (report.tier2 && report.tier2.ran) {
        const guardInfo = report.tier2.guardRejected ? `，防幻覺退回 ${report.tier2.guardRejected} 段` : ''
        const bonInfo = report.tier2.bestOfNRuns ? `，Best-of-N 擇優 ${report.tier2.bestOfNRuns} 次（勝出 ${report.tier2.bestOfNWins || 0} 次）` : ''
        const retryInfo = report.tier2.lazyRetries ? `，照抄糾偏重試 ${report.tier2.lazyRetries} 次` : ''
        const extraGuardInfo = [
          report.tier2.dedupReverted ? `跨段去重退回 ${report.tier2.dedupReverted} 段` : '',
          report.tier2.deletionGuardTripped ? '已觸發刪減比例護欄' : '',
          (report.tier2.batchCalls || 0) > 0 ? `批次合併 ${report.tier2.batchCalls} 次` : '',
          (report.tier2.fallbackSingles || 0) > 0 ? `單段兜底 ${report.tier2.fallbackSingles} 段` : '',
          (report.tier2.skippedLowSignal || 0) > 0 ? `略過低訊號 ${report.tier2.skippedLowSignal} 段` : '',
        ].filter(Boolean).join('、')
        rows.push(
          item(
            '第二層局部校對狀態',
            report.tier2.error
              ? `異常：${report.tier2.error}`
              : `完成（處理 ${report.tier2.segments} 段${guardInfo}${bonInfo}${retryInfo}${extraGuardInfo ? `，${extraGuardInfo}` : ''}）`,
            report.tier2.error ? 'var(--ap-bad)' : 'var(--ap-good)'
          )
        )
        rows.push(
          item(
            'Tier 2 精編增強策略',
            [
              report.tier2.targetedSpans > 0
                ? `病灶定位 ${report.tier2.targetedSpans} 處（已實質消除 ${report.tier2.spansFixed ?? 0} 處）`
                : '精準定位待命',
              report.tier2.contrastiveExemplarsUsed ? '對照範例已按需附帶' : '未開對照範例',
              report.tier2.styleCardUsed ? '已參照正面文風卡' : '未帶正面文風卡',
            ].join(' · ')
          )
        )
        if (report.tier2.route) {
          const routeName = report.tier2.route === 'tool' ? '工具調用' : report.tier2.route === 'tool_then_text' ? '工具調用（失敗退回文字）' : '一般文字'
          const fb = report.tier2.routeFallbacks ? `，退回文字 ${report.tier2.routeFallbacks} 次` : ''
          rows.push(item('Tier 2 輸出方式', routeName + fb))
          rows.push(item('改寫成功 / 有改動 / 失敗', `${report.tier2.applied ?? 0} / ${report.tier2.changed ?? 0} / ${(report.tier2.failedSegments || []).length} 段`))
        }
        if (report.tier2.nsfwRewritten != null) {
          rows.push(item('含露骨詞段落改寫成功', `${report.tier2.nsfwRewritten} 段`))
        }
      } else {
        const skipMap = {
          'no-issues': '未觸發（本輪未命中需改寫問題，保留原文）',
          'too-short': '未觸發（本輪正文過短，不送交改寫）',
          'local-only': '純本地模式（僅執行本地確定性微修）',
          'low-signal-filtered': `略過 ${report.tier2?.skippedLowSignal || 0} 段低訊號段（無確診病灶，節省 100% Tier 2 Token）`,
          'all-filtered': '全部命中段均受對話保護或留守本地，未送線上模型',
        }
        rows.push(item('第二層局部校對狀態', skipMap[report.tier2?.skipReason] || '本輪未啟動 Tier 2'))
      }
      if (report.tier2 && (report.tier2.nsfwPreview || []).length) {
        report.tier2.nsfwPreview.forEach((p, i) => {
          rows.push(item(`NSFW 改寫預覽 ${i + 1}（前）`, p.before))
          rows.push(item(`NSFW 改寫預覽 ${i + 1}（後）`, p.after))
        })
      }

      const violationText = (report.violations || []).length
        ? '觀察到的候選／指標（不代表每項都會改寫）：' + report.violations.map(v => v.label).join('；')
        : '沒有觀察到候選問題。'

      const renderConcentrationCard = () => {
        const c = f?.concentration || null
        const score = c ? Math.max(0, Math.min(1, Number(c.score) || 0)) : 0
        const lvl = c?.level || 'low'
        const lvlMap = { low: '低（自然真人筆感）', mid: '中（有模板痕跡）', high: '高（明顯 AI 味）', severe: '極高（建議重校）' }
        const ringColor = lvl === 'low' ? 'var(--ap-good)' : lvl === 'mid' ? 'var(--ap-warn)' : 'var(--ap-bad)'
        const radius = 24
        const circ = 2 * Math.PI * radius
        const dashOffset = circ * (1 - score)
        const subDesc = c
          ? `具體細節/口語抵銷 (${c.anchorHits || 0}/${c.imperfectionHits || 0}) · 語氣詞 ${c.modalDensity ?? 0}/千字`
          : `第 ${turn} 輪校對完成 · ${report.writeOk ? '已寫回正文' : '保留原文'}`
        const pills = []
        if ((report.tier2?.batchCalls || 0) > 0) pills.push(`${report.tier2.batchCalls} 批合併`)
        if ((report.tier2?.skippedLowSignal || 0) > 0) pills.push(`略過空轉 ${report.tier2.skippedLowSignal} 段`)
        if ((f?.metaLeakRemovedCount || 0) > 0) pills.push(`清理出戲行 ${f.metaLeakRemovedCount}`)
        if (report.reverted) pills.push('已還原鎖定')
        else if (report.canUndo) pills.push('可一鍵還原')

        return h(
          'div',
          {
            style: {
              padding: '12px 14px',
              borderRadius: 'var(--ap-radius-md)',
              background: 'var(--ap-panel)',
              border: '1px solid var(--ap-border)',
              marginBottom: '10px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            },
          },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 240px' } },
            c
              ? h(
                  'div',
                  { style: { position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } },
                  h(
                    'svg',
                    { width: 56, height: 56, viewBox: '0 0 56 56', style: { transform: 'rotate(-90deg)' } },
                    h('circle', { cx: 28, cy: 28, r: radius, fill: 'none', stroke: 'var(--ap-border)', strokeWidth: 5 }),
                    h('circle', {
                      cx: 28,
                      cy: 28,
                      r: radius,
                      fill: 'none',
                      stroke: ringColor,
                      strokeWidth: 5,
                      strokeLinecap: 'round',
                      strokeDasharray: circ.toFixed(1),
                      strokeDashoffset: dashOffset.toFixed(1),
                      style: { transition: 'stroke-dashoffset 0.55s ease-out' },
                    })
                  ),
                  h(
                    'span',
                    { style: { position: 'absolute', fontSize: '12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: ringColor } },
                    score.toFixed(2)
                  )
                )
              : null,
            h(
              'div',
              { style: { minWidth: 0 } },
              h(
                'div',
                { style: { fontSize: '13px', fontWeight: 700, color: c ? ringColor : 'var(--ap-ink)' } },
                c ? `AI 味綜合濃度：${lvlMap[lvl] || lvl}` : '校對摘要'
              ),
              h('div', { style: { fontSize: '11px', color: 'var(--ap-muted)', marginTop: '3px', lineHeight: 1.45 } }, subDesc)
            )
          ),
          pills.length
            ? h(
                'div',
                { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
                ...pills.map((txt, idx) =>
                  h(
                    'span',
                    {
                      key: `pill-${idx}`,
                      style: {
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        background: idx === pills.length - 1 && report.reverted ? 'var(--ap-warn-soft)' : 'var(--ap-accent-soft)',
                        color: idx === pills.length - 1 && report.reverted ? 'var(--ap-warn)' : 'var(--ap-accent)',
                        border: idx === pills.length - 1 && report.reverted ? '1px solid var(--ap-warn-border)' : '1px solid var(--ap-accent-border)',
                      },
                    },
                    txt
                  )
                )
              )
            : null
        )
      }

      const statusPillText = report.reverted
        ? '已還原原文並鎖定'
        : report.writeOk
          ? '已精修寫回'
          : report.edited
            ? '未寫回／僅分析'
            : '原文保留'
      const statusPillColor = report.reverted ? 'var(--ap-warn)' : report.writeOk ? 'var(--ap-good)' : 'var(--ap-muted)'
      const statusPillBg = report.reverted ? 'var(--ap-warn-soft)' : report.writeOk ? 'var(--ap-good-soft)' : 'var(--ap-panel)'
      const statusPillBorder = report.reverted ? 'var(--ap-warn-border)' : report.writeOk ? 'var(--ap-good-border)' : 'var(--ap-border)'

      return h(
        'div',
        {
          className: 'ap-modal ap-scroll',
          style: {
            width: 'min(620px, calc(100vw - 24px))',
            maxWidth: '100%',
            margin: '16px auto',
            padding: '16px',
            maxHeight: '88vh',
            overflowY: 'auto',
          },
        },
        h(
          'div',
          { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', paddingBottom: '12px', marginBottom: '12px', borderBottom: '1px solid var(--ap-border)' } },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 } },
            renderBrandLogo(36),
            h(
              'div',
              { style: { minWidth: 0 } },
              h('h3', { className: 'ap-title', style: { fontSize: '15px' } }, `澄文 · AutoProof v1.39 校對報告`),
              h('div', { className: 'ap-sub' }, `第 ${turn} 輪 · 配色與字體自動跟隨酒館皮膚`)
            )
          ),
          h(
            'span',
            {
              style: {
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 9px',
                borderRadius: '999px',
                background: statusPillBg,
                color: statusPillColor,
                border: `1px solid ${statusPillBorder}`,
                whiteSpace: 'nowrap',
              },
            },
            `第 ${turn} 輪 · ${statusPillText}`
          )
        ),
        renderConcentrationCard(),
        h('div', null, ...rows),
        Array.isArray(report.diffs) && report.diffs.length > 0
          ? h(
              'details',
              {
                style: {
                  marginTop: '12px',
                  borderRadius: 'var(--ap-radius-md)',
                  background: 'var(--ap-panel-soft)',
                  border: '1px solid var(--ap-accent-border)',
                  overflow: 'hidden',
                  fontSize: '12px',
                },
              },
              h(
                'summary',
                {
                  style: {
                    cursor: 'pointer',
                    padding: '9px 12px',
                    background: 'var(--ap-accent-soft)',
                    color: 'var(--ap-accent)',
                    fontWeight: 600,
                  },
                },
                `📝 本輪實質改動明細（共 ${report.diffs.length} 段，點擊展開改前／改後對比）`
              ),
              h(
                'div',
                { className: 'ap-scroll', style: { padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' } },
                ...report.diffs.map((d, dIdx) =>
                  h(
                    'div',
                    {
                      key: `diff-${dIdx}-${d.index}`,
                      style: {
                        padding: '8px 10px',
                        borderRadius: 'var(--ap-radius-sm)',
                        background: 'var(--ap-panel)',
                        border: '1px solid var(--ap-border)',
                        lineHeight: 1.5,
                      },
                    },
                    h(
                      'div',
                      { style: { color: 'var(--ap-muted)', marginBottom: '5px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' } },
                      h('span', { style: { fontWeight: 600 } }, `第 ${Number(d.index) + 1} 行`),
                      Array.isArray(d.reasons) && d.reasons.length
                        ? h('span', { style: { color: 'var(--ap-accent)' } }, d.reasons.join(' / '))
                        : null
                    ),
                    h(
                      'div',
                      { style: { padding: '5px 7px', borderRadius: 'var(--ap-radius-sm)', background: 'var(--ap-bad-soft)', border: '1px solid var(--ap-bad-border)', color: 'var(--ap-bad)', marginBottom: '4px', whiteSpace: 'pre-wrap' } },
                      `改前：${d.before || '（空）'}`
                    ),
                    h(
                      'div',
                      { style: { padding: '5px 7px', borderRadius: 'var(--ap-radius-sm)', background: 'var(--ap-good-soft)', border: '1px solid var(--ap-good-border)', color: 'var(--ap-good)', whiteSpace: 'pre-wrap' } },
                      `改後：${d.after || '（已整行清理）'}`
                    )
                  )
                )
              )
            )
          : null,
        undoError
          ? h(
              'p',
              {
                style: {
                  marginTop: '10px',
                  padding: '9px 10px',
                  borderRadius: 'var(--ap-radius-sm)',
                  background: 'var(--ap-bad-soft)',
                  border: '1px solid var(--ap-bad-border)',
                  color: 'var(--ap-bad)',
                  fontSize: '12px',
                  lineHeight: 1.5,
                },
              },
              '還原失敗：' + undoError
            )
          : null,
        report.writeError
          ? h(
              'p',
              {
                style: {
                  marginTop: '10px',
                  padding: '9px 10px',
                  borderRadius: 'var(--ap-radius-sm)',
                  background: 'var(--ap-bad-soft)',
                  border: '1px solid var(--ap-bad-border)',
                  color: 'var(--ap-bad)',
                  fontSize: '12px',
                  lineHeight: 1.5,
                },
              },
              '寫回失敗：' + report.writeError
            )
          : null,
        report.note
          ? h(
              'p',
              {
                style: {
                  marginTop: '10px',
                  padding: '9px 10px',
                  borderRadius: 'var(--ap-radius-sm)',
                  background: 'var(--ap-warn-soft)',
                  border: '1px solid var(--ap-warn-border)',
                  color: 'var(--ap-warn)',
                  fontSize: '12px',
                  lineHeight: 1.5,
                },
              },
              '提示：' + report.note
            )
          : null,
        h(
          'p',
          {
            style: {
              marginTop: '12px',
              padding: '10px',
              borderRadius: 'var(--ap-radius-sm)',
              background: 'var(--ap-panel-soft)',
              border: '1px solid var(--ap-border)',
              color: 'var(--ap-muted)',
              fontSize: '12px',
              lineHeight: 1.6,
            },
          },
          violationText
        ),
        h(
          'div',
          { style: { display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--ap-border)', flexWrap: 'wrap' } },
          h(
            'button',
            {
              type: 'button',
              onClick: () => {
                close()
                openSettingsModal(ui, gameId)
              },
              className: 'ap-btn',
              style: {
                border: '1px solid var(--ap-accent-border)',
                background: 'var(--ap-accent-soft)',
                color: 'var(--ap-accent)',
              },
            },
            '⚙ 功能設定'
          ),
          h(
            'div',
            { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
            (report.canUndo && !report.reverted)
              ? h(
                  'button',
                  {
                    type: 'button',
                    disabled: undoBusy,
                    className: 'ap-btn',
                    onClick: async () => {
                      if (undoBusy) return
                      setUndoBusy(true)
                      setUndoError('')
                      try {
                        const res = await ui.callHost('dsh-tavern-autoproof/undo', { gameId, turn })
                        if (res && res.ok && res.report) {
                          setReport({ ...res.report })
                        } else if (res && res.ok) {
                          setReport(prev => ({ ...prev, reverted: true, canUndo: false, note: '已手動一鍵還原原文（已鎖定，非手動「重新校對」不再自動改寫）' }))
                        } else {
                          setUndoError((res && res.error) || '還原失敗')
                        }
                      } catch (e) {
                        setUndoError(String((e && e.message) || e).slice(0, 140))
                      } finally {
                        setUndoBusy(false)
                      }
                    },
                    style: {
                      border: '1px solid var(--ap-warn-border)',
                      background: 'var(--ap-warn-soft)',
                      color: 'var(--ap-warn)',
                    },
                  },
                  undoBusy ? '還原中…' : '↩ 一鍵還原原文'
                )
              : null,
            h(
              'button',
              {
                type: 'button',
                className: 'ap-btn ap-btn-primary',
                onClick: async () => {
                  try {
                    close()
                    ui.openOverlay({
                      gameId,
                      dismissible: true,
                      render: ({ close: close2 }) => h(ProofRunner, { ui, gameId, turn, close: close2 }),
                    })
                  } catch (e) {
                    ui.callHost('dsh-tavern-autoproof/clientlog', { rerunError: String((e && e.message) || e).slice(0, 120) }).catch(() => {})
                  }
                },
                style: {
                  border: '1px solid var(--ap-accent)',
                  background: 'var(--ap-accent)',
                  color: 'var(--ap-accent-ink)',
                },
              },
              '重新校對本輪'
            ),
            h(
              'button',
              {
                type: 'button',
                onClick: close,
                className: 'ap-btn',
                style: {
                  border: '1px solid var(--ap-border)',
                  background: 'transparent',
                  color: 'var(--ap-ink)',
                },
              },
              '關閉'
            )
          )
        )
      )
    }

    return {
      name: 'dsh-tavern-autoproof',
      inject: ['tavernUi'],
      apply(ctx) {
        try {
          if (!ctx || !ctx.tavernUi) return
          ensureAutoProofStyles()
          const ui = ctx.tavernUi

          try {
            ui.callHost('dsh-tavern-autoproof/clientlog', {
              boot: true,
              apiVersion: ui.apiVersion,
              hasWatchTurnState: typeof ui.watchTurnState,
              hasGetTurnState: typeof ui.getTurnState,
            }).catch(() => {})
          } catch {}

          ui.registerMessageAction({
            id: 'proof',
            label: '校對',
            when: ({ settled }) => settled,
            run: async ({ gameId, turn }) => {
              const report = await ui.callHost('dsh-tavern-autoproof/report', { gameId, turn }).catch(() => null)
              if (typeof ui.openOverlay === 'function') {
                ui.openOverlay({
                  gameId,
                  dismissible: true,
                  render: ({ close }) => renderReportOverlay(ui, gameId, turn, report, close),
                })
              }
            },
          })

          ui.registerComposerAction({
            id: 'rerun-proof',
            label: '重新校對',
            when: ({ busy }) => !busy,
            run: async ({ gameId, turn }) => {
              if (typeof ui.openOverlay === 'function') {
                ui.openOverlay({
                  gameId,
                  dismissible: true,
                  render: ({ close }) => h(ProofRunner, { ui, gameId, turn, close }),
                })
                return
              }
              await ui.callHost('dsh-tavern-autoproof/proof', { gameId, turn }).catch(() => null)
            },
          })

          ui.registerComposerAction({
            id: 'proof-settings',
            label: '校對設定',
            when: () => true,
            run: async ({ gameId }) => {
              openSettingsModal(ui, gameId)
            },
          })
        } catch {
          // 瀏覽器側拋錯會拖垮整個頁面，吞掉並放棄功能
        }
      },
    }
  },
})
