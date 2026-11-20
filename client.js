// dsh-tavern-autoproof v1.35.0 瀏覽器側模組（分區設定面板 + 正面文風整本萃取 + ？功能說明 + 三分區校對報告）
window.__ModuleLoader__.load({
  id: 'dsh-tavern-autoproof',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement

    const TIER_BADGE = {
      local: { text: '純本地 0 Token', bg: 'rgba(16, 185, 129, 0.18)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.35)' },
      hybrid: { text: '本地＋安全分流', bg: 'rgba(245, 158, 11, 0.16)', color: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.35)' },
      online: { text: '線上 Tier 2', bg: 'rgba(59, 130, 246, 0.18)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.35)' },
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
      const paraLens = lines.filter((l) => !CHAPTER_RE.test(l)).map((l) => l.replace(/\s+/g, '').length)
      const avgParaLen = paraLens.length
        ? Math.round(paraLens.reduce((a, b) => a + b, 0) / paraLens.length)
        : 0
      const wanLabel = totalChars >= 10000 ? `約 ${(totalChars / 10000).toFixed(1)} 萬字` : `${totalChars} 字`
      const statsSummary = `【客觀語言指紋（${wanLabel}）】對話行佔比 ${dialogueRatio}%｜平均句長 ${avgSentLen} 字｜短句（<=12字）佔比 ${shortSentRatio}%｜平均段長 ${avgParaLen} 字`

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
            setDraft((prev) => ({ ...prev, styleCardText: res.styleCard, styleCardEnabled: true }))
            setStatusMsg('✓ 已萃取出正面文風卡並開啟注入（請記得點擊下方儲存）')
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
              onClick: () => updateField(field.key, !on),
              style: {
                padding: '4px 12px',
                borderRadius: '999px',
                border: on ? '1px solid #10b981' : '1px solid rgba(148,163,184,0.35)',
                background: on ? 'rgba(16, 185, 129, 0.22)' : 'rgba(15, 23, 42, 0.45)',
                color: on ? '#6ee7b7' : '#94a3b8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                minWidth: '64px',
              },
            },
            on ? '已開啟' : '已關閉'
          )
        }
        if (field.type === 'number') {
          return h('input', {
            type: 'number',
            min: field.min,
            max: field.max,
            step: field.step || 1,
            value: Number(val ?? field.default ?? 8),
            onChange: (e) => updateField(field.key, Number(e.target.value)),
            style: {
              width: '76px',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(148,163,184,0.35)',
              background: 'rgba(15, 23, 42, 0.65)',
              color: 'inherit',
              fontSize: '12px',
              textAlign: 'right',
            },
          })
        }
        if (field.type === 'select') {
          const opts = field.options || []
          return h(
            'select',
            {
              value: String(val ?? field.default ?? ''),
              onChange: (e) => updateField(field.key, e.target.value),
              style: {
                width: '100%',
                maxWidth: '260px',
                minWidth: '150px',
                boxSizing: 'border-box',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(148,163,184,0.35)',
                background: '#0f172a',
                color: '#f8fafc',
                fontSize: '12px',
                cursor: 'pointer',
              },
            },
            ...opts.map((o) => h('option', { key: o.value, value: o.value }, o.label))
          )
        }
        if (field.type === 'textarea') {
          return h('textarea', {
            value: String(val ?? ''),
            rows: field.rows || 3,
            placeholder: field.placeholder || '',
            onChange: (e) => updateField(field.key, e.target.value),
            style: {
              width: '100%',
              minHeight: '78px',
              boxSizing: 'border-box',
              marginTop: '8px',
              padding: '7px 9px',
              borderRadius: '6px',
              border: '1px solid rgba(148,163,184,0.35)',
              background: '#0f172a',
              color: '#f8fafc',
              fontSize: '12px',
              lineHeight: 1.5,
              resize: 'vertical',
              fontFamily: 'inherit',
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
            style: {
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.42)',
              border: '1px solid rgba(148, 163, 184, 0.16)',
              marginBottom: '8px',
            },
          },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' } },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: '1 1 200px', minWidth: 0 } },
              h('span', { style: { fontSize: '13px', fontWeight: 600 } }, field.label),
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
                    border: helpOpen ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.45)',
                    background: helpOpen ? 'rgba(56, 189, 248, 0.22)' : 'transparent',
                    color: helpOpen ? '#7dd3fc' : '#cbd5e1',
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
            ? h(
                'div',
                {
                  style: {
                    marginTop: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'rgba(30, 58, 138, 0.25)',
                    border: '1px solid rgba(96, 165, 250, 0.28)',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-line',
                  },
                },
                field.help
              )
            : null
        )
      }

      return h(
        'div',
        {
          style: {
            display: 'block',
            width: 'min(640px, calc(100vw - 24px))',
            maxWidth: '100%',
            boxSizing: 'border-box',
            margin: '16px auto',
            padding: '16px',
            borderRadius: '12px',
            background: 'var(--gal-ui-surface, #1e293b)',
            color: 'var(--gal-ui-ink, #f8fafc)',
            boxShadow: '0 22px 50px rgba(0,0,0,0.52)',
          },
        },
        h(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '10px' } },
          h('h3', { style: { margin: 0, fontSize: '15px', lineHeight: 1.35 } }, 'AutoProof v1.34 校對設定（點 ? 看說明）'),
          h(
            'button',
            {
              onClick: close,
              style: {
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(148,163,184,0.3)',
                background: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
                flexShrink: 0,
              },
            },
            '✕'
          )
        ),
        h(
          'div',
          { style: { display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' } },
          ...GROUP_TABS.map((t) =>
            h(
              'button',
              {
                key: t.id,
                type: 'button',
                onClick: () => setActiveTab(t.id),
                style: {
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: activeTab === t.id ? '1px solid #38bdf8' : '1px solid rgba(148,163,184,0.25)',
                  background: activeTab === t.id ? 'rgba(56, 189, 248, 0.18)' : 'rgba(15, 23, 42, 0.35)',
                  color: activeTab === t.id ? '#7dd3fc' : '#cbd5e1',
                  fontSize: '12px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                },
              },
              t.label
            )
          )
        ),
        h(
          'div',
          { style: { overflowY: 'auto', maxHeight: '58vh', paddingRight: '2px' } },
          loading
            ? h('div', { style: { padding: '20px', textAlign: 'center', opacity: 0.75, fontSize: '13px' } }, '載入設定中…')
            : h(
                React.Fragment,
                null,
                activeTab === 'style'
                  ? h(
                      'div',
                      {
                        style: {
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: 'rgba(30, 41, 59, 0.72)',
                          border: '1px solid rgba(56, 189, 248, 0.28)',
                          marginBottom: '10px',
                        },
                      },
                      h(
                        'div',
                        { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' } },
                        h('span', { style: { fontSize: '13px', fontWeight: 700, color: '#7dd3fc' } }, '一鍵從小說範文或整本檔案萃取文風卡'),
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
                              style: {
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid rgba(16, 185, 129, 0.55)',
                                background: 'rgba(16, 185, 129, 0.16)',
                                color: '#a7f3d0',
                                fontSize: '12px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                cursor: extracting ? 'wait' : 'pointer',
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
                              style: {
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid rgba(56, 189, 248, 0.55)',
                                background: 'rgba(14, 165, 233, 0.2)',
                                color: '#e0f2fe',
                                fontSize: '12px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                cursor: extracting ? 'wait' : 'pointer',
                              },
                            },
                            extracting ? '萃取中…' : '一鍵萃取文風卡'
                          )
                        )
                      ),
                      uploadedBookMeta
                        ? h(
                            'div',
                            {
                              style: {
                                fontSize: '11px',
                                color: '#93c5fd',
                                marginBottom: '6px',
                                lineHeight: 1.45,
                                wordBreak: 'break-word',
                              },
                            },
                            `已載入：${uploadedBookMeta}`
                          )
                        : null,
                      h('textarea', {
                        value: sampleText,
                        rows: 4,
                        placeholder: '可點「上傳整本小說 (.txt/.md)」自動統計全書節奏並均勻採樣（支援 UTF-8／GBK／Big5），或直接貼上一段範文後按「一鍵萃取文風卡」…',
                        onChange: (e) => setSampleText(e.target.value),
                        style: {
                          width: '100%',
                          minHeight: '86px',
                          boxSizing: 'border-box',
                          padding: '7px 9px',
                          borderRadius: '6px',
                          border: '1px solid rgba(148,163,184,0.35)',
                          background: '#0f172a',
                          color: '#f8fafc',
                          fontSize: '12px',
                          lineHeight: 1.5,
                          resize: 'vertical',
                          fontFamily: 'inherit',
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
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: statusMsg.startsWith('✓')
                    ? 'rgba(16, 185, 129, 0.16)'
                    : /^(?:正在|已讀取)/.test(statusMsg)
                      ? 'rgba(56, 189, 248, 0.16)'
                      : 'rgba(239, 68, 68, 0.16)',
                  color: statusMsg.startsWith('✓')
                    ? '#6ee7b7'
                    : /^(?:正在|已讀取)/.test(statusMsg)
                      ? '#7dd3fc'
                      : '#fca5a5',
                  fontSize: '12px',
                },
              },
              statusMsg
            )
          : null,
        h(
          'div',
          { style: { display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' } },
          h(
            'button',
            {
              type: 'button',
              disabled: saving,
              onClick: handleReset,
              style: {
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(148,163,184,0.3)',
                background: 'transparent',
                color: '#cbd5e1',
                fontSize: '12px',
                cursor: 'pointer',
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
                style: {
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(56, 189, 248, 0.45)',
                  background: 'rgba(56, 189, 248, 0.14)',
                  color: '#7dd3fc',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
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
                style: {
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#10b981',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                },
              },
              '儲存至本角色卡'
            ),
            h(
              'button',
              {
                type: 'button',
                onClick: close,
                style: {
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(148,163,184,0.35)',
                  background: 'transparent',
                  color: 'inherit',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                },
              },
              '關閉'
            )
          )
        )
      )
    }

    // v1.21：点「重新校对」立刻出这个窗口——先显示进度，跑完原地换成报告，失败也显示原因
    function ProofRunner({ ui, gameId, turn, close }) {
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
        return h('div', { style: { padding: 16, minWidth: 260 } },
          h('div', { style: { color: '#f87171', marginBottom: 8 } }, '校對失敗：' + error),
          h('button', { onClick: close, style: { padding: '4px 14px' } }, '關閉'))
      }
      if (report) return renderReportOverlay(ui, gameId, turn, report, close)
      return h('div', { style: { padding: 16, minWidth: 260 } },
        h('div', { style: { marginBottom: 6 } }, `校對中…（第 ${turn} 輪）`),
        h('div', { style: { opacity: 0.7, fontSize: 12, lineHeight: 1.6 } },
          `已等待 ${elapsed} 秒。含模型改寫時通常 1–3 分鐘；可先關掉，跑完再來點「校對」看報告。`),
        h('button', { onClick: close, style: { marginTop: 12, padding: '4px 14px' } }, '關閉'))
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
    }

    const fmtFlags = (arr = []) => arr.map((k) => FLAG_LABELS[k] || k).join('、')

    function renderReportOverlay(ui, gameId, turn, report, close) {
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
              borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
              fontSize: '13px',
            },
          },
          h('span', { style: { opacity: 0.78, flexShrink: 0 } }, label),
          h(
            'strong',
            { style: { textAlign: 'right', wordBreak: 'break-word', color: color || 'inherit' } },
            String(value ?? '-')
          )
        )

      const section = (title) =>
        h(
          'div',
          {
            key: `sec-${title}`,
            style: {
              marginTop: '12px',
              marginBottom: '4px',
              paddingBottom: '4px',
              borderBottom: '1px solid rgba(56, 189, 248, 0.32)',
              fontSize: '12px',
              fontWeight: 700,
              color: '#7dd3fc',
              letterSpacing: '0.03em',
            },
          },
          title
        )

      if (!report) {
        return h(
          'div',
          {
            style: {
              maxWidth: '520px',
              margin: '8vh auto',
              padding: '20px',
              borderRadius: '12px',
              background: 'var(--gal-ui-surface, #1e293b)',
              color: 'var(--gal-ui-ink, #f8fafc)',
              boxShadow: '0 20px 45px rgba(0,0,0,0.45)',
            },
          },
          h('h3', { style: { margin: '0 0 12px', fontSize: '16px' } }, `自動校對報告（第 ${turn} 輪）`),
          h('p', { style: { fontSize: '13px', opacity: 0.8 } }, '尚無本輪校對資料，請點擊下方按鈕執行校對。'),
          h(
            'div',
            { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' } },
            h(
              'button',
              {
                onClick: () => {
                  close()
                  openSettingsModal(ui, gameId)
                },
                style: {
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(56,189,248,0.4)',
                  background: 'transparent',
                  color: '#7dd3fc',
                  cursor: 'pointer',
                },
              },
              '⚙ 設定'
            ),
            h(
              'button',
              {
                onClick: async () => {
                  await ui.callHost('dsh-tavern-autoproof/proof', { gameId, turn }).catch(() => {})
                  close()
                },
                style: {
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#10b981',
                  color: '#fff',
                  cursor: 'pointer',
                },
              },
              '立即校對'
            ),
            h(
              'button',
              {
                onClick: close,
                style: {
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid rgba(148,163,184,0.35)',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
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
        item('是否已寫回正文', writeStatus, report.writeOk ? '#6ee7b7' : undefined),
        item('正文字數 / 段落數', `${m.chars ?? 0} 字 / ${m.paragraphs ?? 0} 段`),
        item('對舉句式 / 每500字密度', `${m.antithesisCount ?? 0} 處（${m.antithesisDensityPer500 ?? 0}/500字）`),
        item('動作拆解 / 疊詞350字峰值', `${m.actionEchoCount ?? 0} 處 / ${m.maxRedupIn350 ?? 0} 處`),
        item('對話伴隨動作比例', m.dialogueActionRatio != null ? `${Math.round(m.dialogueActionRatio * 100)}%` : '-'),
      ]

      if (report.quoteConverted > 0) {
        rows.push(item('雙向引號規範化', `已統一 ${report.quoteConverted} 處引號`))
      }

      if ((report.charFixes || []).length > 0) {
        rows.push(
          item(
            '第一層字級與詞組修復',
            report.charFixes.map(x => `${x.from}→${x.to}×${x.count}`).join('、')
          )
        )
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
        let styleColor = '#94a3b8'
        if (f.styleCardEnabled) {
          if (f.styleCardChars > 0) {
            const apps = []
            if (f.styleCardGenUsed) apps.push('已注入主模型生成')
            if (f.styleCardTier2Used) apps.push('已帶入本輪 Tier 2 修稿')
            if (!apps.length) {
              apps.push(report.tier2?.ran ? '已待命' : '本輪原文免修；下輪／重Roll生成會注入')
            }
            styleVal = `已啟用（${f.styleCardChars} 字）· ${apps.join(' ＋ ')}`
            styleColor = (f.styleCardGenUsed || f.styleCardTier2Used) ? '#6ee7b7' : '#fcd34d'
          } else {
            styleVal = '尚未設定內容（可至「正面文風 ✨」上傳小說萃取）'
            styleColor = '#94a3b8'
          }
        }
        rows.push(item('正面文風錨點（Style Card）', styleVal, styleColor))

        // 2. Verbalized Sampling
        rows.push(
          item(
            'Verbalized Sampling（破套路）',
            f.verbalizedSampling ? '已開啟（於主模型生成前引導思考區多路取樣）' : '未開啟（預設關閉）',
            f.verbalizedSampling ? '#6ee7b7' : '#94a3b8'
          )
        )

        // 3. 實體專有名詞鎖
        let entityVal = '已關閉'
        let entityColor = '#94a3b8'
        if (f.entityLockMode !== 'off') {
          const scope = `監控 ${f.entityLockRuleCount} 條（自訂 ${f.entityLockCustomCount} / 卡面 ${f.entityLockCardCount}）`
          if (f.entityLockTotal > 0) {
            const detail = (f.entityLockDetail || []).map(x => `${x.from}→${x.to}×${x.count}`).join('、')
            entityVal = `已訂正 ${f.entityLockTotal} 處（${detail}）｜${scope}`
            entityColor = '#6ee7b7'
          } else {
            entityVal = `${scope} · 本輪無專名詞錯寫`
          }
        }
        rows.push(item('實體專有名詞鎖', entityVal, entityColor))

        // 4. 知而不言邊界
        const ugLabels = { off: '關閉', report: '僅標記', adaptive: '自適應', always: '每輪注入' }
        let ugVal = '關閉'
        let ugColor = '#94a3b8'
        if (f.utteranceGateMode !== 'off') {
          const modeTxt = ugLabels[f.utteranceGateMode] || f.utteranceGateMode
          const genTxt = f.utteranceGateGenInjected ? '（生成前已注入）' : ''
          if (f.infoDumpCount > 0) {
            const samp = (f.infoDumpSamples || []).slice(0, 1).join('')
            ugVal = `${modeTxt}${genTxt} · 檢出 ${f.infoDumpCount} 處科普${samp ? `（${samp}）` : ''}`
            ugColor = '#fcd34d'
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
        rows.push(item('跨輪高頻動作冷卻池', cdParts.join(' · '), cdInjected ? '#fcd34d' : undefined))

        const turnStruct = fmtFlags(f.turnStructuralFlags || [])
        const recurStruct = fmtFlags(f.structuralRecurring || [])
        const nsMode = f.narrativeSteeringMode === 'off' ? '關閉' : f.narrativeSteeringMode === 'report' ? '僅統計' : '自動糾偏'
        const nsParts = [nsMode]
        nsParts.push(turnStruct ? `本輪檢出：${turnStruct}` : '本輪結構正常')
        if (recurStruct) nsParts.push(`跨輪提醒中：${recurStruct}`)
        rows.push(item('敘事結構指紋（StoryScope）', nsParts.join(' · '), recurStruct ? '#fcd34d' : undefined))
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
        rows.push(item('對話與口癖保護區', pdTxt, (f.dialogueReleasedCount || 0) > 0 ? '#6ee7b7' : undefined))
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
        rows.push(
          item(
            '第二層局部校對狀態',
            report.tier2.error ? `異常：${report.tier2.error}` : `完成（處理 ${report.tier2.segments} 段${guardInfo}${bonInfo}${retryInfo}）`,
            report.tier2.error ? '#fca5a5' : '#6ee7b7'
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

      return h(
        'div',
        {
          style: {
            width: 'min(600px, calc(100vw - 24px))',
            maxWidth: '100%',
            boxSizing: 'border-box',
            margin: '16px auto',
            padding: '16px',
            borderRadius: '12px',
            background: 'var(--gal-ui-surface, #1e293b)',
            color: 'var(--gal-ui-ink, #f8fafc)',
            boxShadow: '0 20px 45px rgba(0,0,0,0.45)',
            maxHeight: '88vh',
            overflowY: 'auto',
          },
        },
        h('h3', { style: { margin: '0 0 8px', fontSize: '16px' } }, `AutoProof v1.35 校對報告（第 ${turn} 輪）`),
        h('div', null, ...rows),
        report.writeError
          ? h(
              'p',
              {
                style: {
                  marginTop: '10px',
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.16)',
                  color: '#fca5a5',
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
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.14)',
                  color: '#fcd34d',
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
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.45)',
              fontSize: '12px',
              lineHeight: 1.6,
            },
          },
          violationText
        ),
        h(
          'div',
          { style: { display: 'flex', gap: '8px', justifyContent: 'space-between', marginTop: '16px' } },
          h(
            'button',
            {
              onClick: () => {
                close()
                openSettingsModal(ui, gameId)
              },
              style: {
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(56,189,248,0.45)',
                background: 'rgba(56,189,248,0.12)',
                color: '#7dd3fc',
                cursor: 'pointer',
              },
            },
            '⚙ 功能設定'
          ),
          h(
            'div',
            { style: { display: 'flex', gap: '8px' } },
            h(
              'button',
              {
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
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#10b981',
                  color: '#fff',
                  cursor: 'pointer',
                },
              },
              '重新校對本輪'
            ),
            h(
              'button',
              {
                onClick: close,
                style: {
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid rgba(148,163,184,0.35)',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
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
