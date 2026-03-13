'use client'

import styles from './PercentageSlider.module.css'

export const PRESETS = {
  relevance: [50, 60, 70, 80, 90],
  fine: [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100],
  coarse: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
} as const

interface PercentageSliderProps {
  value: number
  onChange: (value: number) => void
  steps?: readonly number[]
  label?: string
  unit?: string
}

export default function PercentageSlider({
  value,
  onChange,
  steps = PRESETS.relevance,
  label = 'Minimum match',
  unit = '%',
}: PercentageSliderProps) {
  const stepsPct = [...new Set(steps)].sort((a, b) => a - b)

  const snapToNearest = (p: number) => {
    let nearest = stepsPct[0]
    let minDist = Math.abs(p - nearest)
    for (const s of stepsPct) {
      const d = Math.abs(p - s)
      if (d < minDist) {
        minDist = d
        nearest = s
      }
    }
    return nearest / 100
  }

  const handleRailClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.round((x / rect.width) * 100)
    const snapped = snapToNearest(Math.max(0, Math.min(100, pct)))
    onChange(snapped)
  }

  const handleKeyDown = (e: React.KeyboardEvent, dir: number) => {
    e.preventDefault()
    const idx = stepsPct.indexOf(Math.round(value * 100))
    const next = Math.max(0, Math.min(stepsPct.length - 1, idx + dir))
    onChange(stepsPct[next] / 100)
  }

  return (
    <div className={styles.slider}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>
          {Math.round(value * 100)}
          {unit}
        </span>
      </div>
      <div
        className={styles.rail}
        onClick={handleRailClick}
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-label={`${label}: ${Math.round(value * 100)}${unit}`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') handleKeyDown(e, -1)
          if (e.key === 'ArrowRight') handleKeyDown(e, 1)
        }}
      >
        <div
          className={styles.fill}
          style={{ width: `${value * 100}%` }}
        />
        {stepsPct.map((s) => (
          <button
            key={s}
            type="button"
            className={`${styles.tick} ${Math.round(value * 100) === s ? styles.tickActive : ''}`}
            style={{ left: `${s}%` }}
            onClick={(e) => {
              e.stopPropagation()
              onChange(s / 100)
            }}
            aria-label={`Set to ${s}%`}
          >
            <span className={styles.tickDot} />
          </button>
        ))}
        <div
          className={styles.thumb}
          style={{ left: `${value * 100}%` }}
          tabIndex={-1}
        />
      </div>
    </div>
  )
}
