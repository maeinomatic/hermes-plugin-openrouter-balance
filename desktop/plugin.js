/**
 * OpenRouter Balance — desktop half of the unified plugin.
 * Chip: "OR $X.XX left". Pane: total/used/remaining. Data comes from the
 * plugin's Python half, which reads the profile's own OPENROUTER_API_KEY —
 * nothing to paste. Refetches ~8s after each chat turn; idle poll every 5 min.
 */
import { cn, haptic, host, queryClient, Tip, useQuery } from '@hermes/plugin-sdk'
import { jsx } from 'react/jsx-runtime'

const ID = 'openrouter-balance'
let _ctx = null
let _refetchTimer = null

function onTurnComplete() {
  clearTimeout(_refetchTimer)
  _refetchTimer = setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ['or-credits'] })
  }, 8000)
}

async function fetchCredits() {
  const res = await _ctx.rest('/credits', { timeoutMs: 20000 })
  if (res && res.ok === false) throw new Error(res.error || 'unknown')
  if (!res || typeof res.total !== 'number') throw Object.assign(new Error('no-data'), { detail: 'unexpected response shape' })
  return res
}

function useCredits() {
  return useQuery({
    queryKey: ['or-credits'],
    queryFn: fetchCredits,
    refetchInterval: q => (q.state.error && q.state.error.message === 'offline' ? 120000 : 300000),
    retry: 1
  })
}

const fmt = n => `$${n.toFixed(2)}`

function describe(err) {
  const m = String((err && err.message) || '')
  if (m === 'no-key') return { label: 'OR: no key', tip: 'No OPENROUTER_API_KEY in this profile .env' }
  if (m === 'bad-key') return { label: 'OR: bad key', tip: 'OpenRouter rejected the API key (401/403)' }
  if (m === 'offline' || m === 'Failed to fetch' || m === 'NetworkError when attempting to fetch resource.')
    return { label: 'OR: offline', tip: 'Could not reach openrouter.ai — will retry every 2 min', offline: true }
  if (m === 'no-data') return { label: 'OR: —', tip: `No balance data: ${err.detail || 'unexpected response shape'}` }
  if (m.startsWith('http-')) return { label: 'OR: error', tip: `OpenRouter API returned ${m.slice(5)}` }
  return { label: 'OR: error', tip: m }
}

function Chip() {
  const q = useCredits()
  let d = { label: 'OR …', tip: 'OpenRouter balance', cls: 'text-(--ui-text-tertiary)' }
  if (q.isError) {
    d = describe(q.error)
    d.cls = d.offline ? 'text-(--ui-text-tertiary)' : 'text-(--ui-danger, var(--ui-accent))'
  } else if (q.data && q.data.ok) {
    const pct = q.data.total > 0 ? (q.data.remaining / q.data.total) * 100 : null
    let cls = 'text-(--ui-text-tertiary)'
    if (pct !== null && pct < 15) cls = 'text-(--ui-accent)'
    d = {
      label: `OR ${fmt(q.data.remaining)}`,
      tip: `${fmt(q.data.remaining)} left of ${fmt(q.data.total)} · used ${fmt(q.data.used)}${pct !== null ? ` · ${pct.toFixed(0)}% remaining` : ''}`,
      cls
    }
  }
  const tip = d.tip || 'OpenRouter balance'

  return jsx(Tip, {
    label: tip,
    children: jsx('button', {
      className: cn(
        'inline-flex h-full items-center gap-1 px-1.5 text-[0.6875rem] transition-colors',
        'hover:bg-(--chrome-action-hover) hover:text-foreground',
        d.cls
      ),
      type: 'button',
      onClick: () => {
        haptic('tap')
        q.refetch()
      },
      children: d.label
    })
  })
}

export default {
  id: ID,
  name: 'OpenRouter Balance',
  register(ctx) {
    _ctx = ctx
    ctx.onEvent('message.complete', onTurnComplete)
    ctx.register({ id: 'chip', area: 'statusBar.right', order: 125, render: () => jsx(Chip, {}) })
  }
}
