// dsh-tavern-autoproof v1.29.0 瀏覽器側模組
window.__ModuleLoader__.load({
  id: 'dsh-tavern-autoproof',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement

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
          h('div', { style: { color: '#f87171', marginBottom: 8 } }, '校对失败：' + error),
          h('button', { onClick: close, style: { padding: '4px 14px' } }, '关闭'))
      }
      if (report) return renderReportOverlay(ui, gameId, turn, report, close)
      return h('div', { style: { padding: 16, minWidth: 260 } },
        h('div', { style: { marginBottom: 6 } }, `校对中…（第 ${turn} 轮）`),
        h('div', { style: { opacity: 0.7, fontSize: 12, lineHeight: 1.6 } },
          `已等待 ${elapsed} 秒。含模型改写时通常 1–3 分钟；可先关掉，跑完再来点「校对」看报告。`),
        h('button', { onClick: close, style: { marginTop: 12, padding: '4px 14px' } }, '关闭'))
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
              padding: '6px 0',
              borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
              fontSize: '13px',
            },
          },
          h('span', { style: { opacity: 0.78 } }, label),
          h('strong', null, String(value ?? '-'))
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
      const rows = [
        item('校對模式', report.mode === 'conservative' ? '保守模式' : report.mode === 'aggressive' ? '積極模式' : '標準模式'),
        item('是否已寫回正文', writeStatus),
        item('正文字數 / 段落數', `${m.chars ?? 0} 字 / ${m.paragraphs ?? 0} 段`),
        item('對舉句式 / 每500字密度', `${m.antithesisCount ?? 0} 處（${m.antithesisDensityPer500 ?? 0}/500字）`),
        item('動作拆解 / 疊詞350字峰值', `${m.actionEchoCount ?? 0} 處 / ${m.maxRedupIn350 ?? 0} 處`),
        item('對話伴隨動作比例', m.dialogueActionRatio != null ? `${Math.round(m.dialogueActionRatio * 100)}%` : '-'),
      ]

      if ((report.charFixes || []).length > 0) {
        rows.push(
          item(
            '第一層字級與詞組修復',
            report.charFixes.map(f => `${f.from}→${f.to}×${f.count}`).join('、')
          )
        )
      }
      if (report.rewriteCandidates != null) rows.push(item('候選類型', report.rewriteCandidates))
      if (report.targetSegments != null) rows.push(item('送交校對段落', report.targetSegments))
      if ((report.recurringStyleKeys || []).length) {
        rows.push(item('跨輪重複', report.recurringStyleKeys.join('、')))
      }
      if (report.tier2 && report.tier2.ran) {
        rows.push(
          item(
            '第二層局部校對狀態',
            report.tier2.error ? `異常：${report.tier2.error}` : `完成（處理 ${report.tier2.segments} 段）`
          )
        )
      }

      const violationText = (report.violations || []).length
        ? '觀察到的候選／指標（不代表每項都會改寫）：' + report.violations.map(v => v.label).join('；')
        : '沒有觀察到候選問題。'

      return h(
        'div',
        {
          style: {
            maxWidth: '560px',
            margin: '6vh auto',
            padding: '20px',
            borderRadius: '12px',
            background: 'var(--gal-ui-surface, #1e293b)',
            color: 'var(--gal-ui-ink, #f8fafc)',
            boxShadow: '0 20px 45px rgba(0,0,0,0.45)',
          },
        },
        h('h3', { style: { margin: '0 0 12px', fontSize: '16px' } }, `AutoProof v1.29 校對報告（第 ${turn} 輪）`),
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
          { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' } },
          h(
            'button',
            {
              onClick: async () => {
                // v1.24：改走带进度的窗口，跑完原地换成新报告；失败也显示原因
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
    }

    return {
      name: 'dsh-tavern-autoproof',
      inject: ['tavernUi'],
      apply(ctx) {
        try {
          if (!ctx || !ctx.tavernUi) return
          const ui = ctx.tavernUi

          // v1.20：把瀏覽器側 API 能力報給宿主，便於驗證狀態訂閱
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
            label: '校对',
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
            label: '重新校对',
            when: ({ busy }) => !busy,
            run: async ({ gameId, turn }) => {
              // v1.21：点下去立刻有反馈，跑完把同一个窗口换成报告
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
        } catch {
          // 瀏覽器側拋錯會拖垮整個頁面，吞掉並放棄功能
        }
      },
    }
  },
})
