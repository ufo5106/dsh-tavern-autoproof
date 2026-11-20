// dsh-tavern-autoproof v1.32.0 瀏覽器側模組（分區設定面板 + ？功能說明 + 工具調用通道 + 純本地體檢／NSFW 分流報告）
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
    ]

    function SettingsOverlay({ ui, gameId, close }) {
      const [loading, setLoading] = React.useState(true)
      const [schema, setSchema] = React.useState([])
      const [draft, setDraft] = React.useState({})
      const [activeTab, setActiveTab] = React.useState('core')
      const [openHelpKey, setOpenHelpKey] = React.useState(null)
      const [statusMsg, setStatusMsg] = React.useState('')
      const [saving, setSaving] = React.useState(false)

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
        return null
      }

      const renderFieldRow = (field) => {
        const badge = TIER_BADGE[field.tier] || TIER_BADGE.local
        const helpOpen = openHelpKey === field.key
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
            renderControl(field)
          ),
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
          h('h3', { style: { margin: 0, fontSize: '15px', lineHeight: 1.35 } }, 'AutoProof v1.33 校對設定（點 ? 看說明）'),
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
            : tabFields.map(renderFieldRow)
        ),
        statusMsg
          ? h(
              'div',
              {
                style: {
                  marginTop: '8px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: statusMsg.startsWith('✓') ? 'rgba(16, 185, 129, 0.16)' : 'rgba(239, 68, 68, 0.16)',
                  color: statusMsg.startsWith('✓') ? '#6ee7b7' : '#fca5a5',
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

    function renderReportOverlay(ui, gameId, turn, report, close) {
      const item = (label, value) =>
        h(
          'div',
          {
            key: label,
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '6px 0',
              borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
              fontSize: '13px',
            },
          },
          h('span', { style: { opacity: 0.78, flexShrink: 0 } }, label),
          h('strong', { style: { textAlign: 'right' } }, String(value ?? '-'))
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
      const writeStatus = report.writeOk === true
        ? ('是（已寫回正文' + (report.htmlSalvaged ? '，已保護 HTML' : '') + '）')
        : (report.edited ? '否（寫回失敗／僅本地分析）' : '否（原文保留）')

      const nsfwLabel = report.nsfwRouting === 'local_only'
        ? '全篇純本地（0 Token）'
        : report.nsfwRouting === 'send_all'
          ? '全部送交 Tier 2'
          : `智能分流（留守本地 ${report.nsfwBypassedCount || 0} 段）`

      const rows = [
        item('校對模式 / NSFW 分流', `${report.mode === 'conservative' ? '保守' : report.mode === 'aggressive' ? '積極' : '標準'} / ${nsfwLabel}`),
        item('是否已寫回正文', writeStatus),
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
            report.charFixes.map(f => `${f.from}→${f.to}×${f.count}`).join('、')
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

      if (report.dialogueProtectedCount > 0) {
        rows.push(item('對話口癖保護區', `已跳過 ${report.dialogueProtectedCount} 段`))
      }
      if (report.rewriteCandidates != null) rows.push(item('候選類型 / 送校段落', `${report.rewriteCandidates} 項 / ${report.targetSegments ?? 0} 段`))
      if ((report.recurringStyleKeys || []).length) {
        rows.push(item('跨輪重複', report.recurringStyleKeys.join('、')))
      }
      if ((report.localAudit?.cooldownWords || []).length) {
        rows.push(item('高頻動作冷卻池', report.localAudit.cooldownWords.join('、')))
      }
      if ((report.localAudit?.structuralRecurring || []).length) {
        rows.push(item('敘事結構提醒（StoryScope）', report.localAudit.structuralRecurring.join('、')))
      }
      if (report.tier2 && report.tier2.ran) {
        const guardInfo = report.tier2.guardRejected ? `，防幻覺退回 ${report.tier2.guardRejected} 段` : ''
        const bonInfo = report.tier2.bestOfNRuns ? `，Best-of-N 擇優 ${report.tier2.bestOfNRuns} 次（勝出 ${report.tier2.bestOfNWins || 0} 次）` : ''
        rows.push(
          item(
            '第二層局部校對狀態',
            report.tier2.error ? `異常：${report.tier2.error}` : `完成（處理 ${report.tier2.segments} 段${guardInfo}${bonInfo}）`
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
            width: 'min(580px, calc(100vw - 24px))',
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
        h('h3', { style: { margin: '0 0 12px', fontSize: '16px' } }, `AutoProof v1.33 校對報告（第 ${turn} 輪）`),
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
