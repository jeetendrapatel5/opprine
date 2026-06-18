// components/StatsCard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// A single stat display card for the dashboard summary row.
//
// Design decisions:
// - The large number uses font-display (Fraunces) — big numbers in a serif font
//   look expensive and intentional, like a financial report or a revenue metric.
//   Compare: Stripe's dashboard, Linear's stats — they use distinctive type for
//   numbers because numbers ARE the message.
// - The accent-colored top border is a thin stripe (2px) — it uses color to
//   categorize cards without being loud. The color is muted (fp-accent/30)
//   not full-saturation, so all 3 cards can sit together without visual noise.
// - bg-fp-surface lifts the card one level above the bg-fp-base page background,
//   creating depth without box-shadow tricks.
// - No hover state — stats are read-only displays. Interactable elements have
//   hovers. Non-interactable elements should not mislead with hover effects.
// ─────────────────────────────────────────────────────────────────────────────

// variantStyles maps the "color" prop to a specific visual treatment.
// Each stat card has a slightly different accent color so at a glance the
// user can distinguish them without reading the labels.
const variantStyles = {
  default:  {
    bar:   'bg-fp-accent',
    value: 'text-fp-text-primary',
  },
  success: {
    bar:   'bg-fp-success',
    value: 'text-fp-success',
  },
  complete: {
    bar:   'bg-fp-text-secondary',
    value: 'text-fp-text-secondary',
  },
}

export default function StatsCard({ label, value, variant = 'default' }) {
  const styles = variantStyles[variant] ?? variantStyles.default

  return (
    <div className="bg-fp-surface rounded-lg lg:p-5 px-3 py-2 relative overflow-hidden">
      {/* Label — small, secondary, uppercase with tracking */}
      {/* Uppercase + letter-spacing = labels feel like labels, not body text */}
      <p className="lg:text-xs text-[10px] font-semibold text-fp-text-secondary uppercase tracking-widest mb-3">
        {label}
      </p>

      {/* Value — Fraunces serif, large, distinctive */}
      {/* The "leading-none" removes default line-height so the number sits flush */}
      <p className={`font-display font-sans text-4xl font-semibold leading-none ${styles.value}`}>
        {value}
      </p>

    </div>
  )
}