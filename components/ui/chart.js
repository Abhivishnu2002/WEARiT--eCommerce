import Chart from "chart.js/auto"

export { Chart }

export function ChartContainer({ children, config, className }) {
  return (
    <div
      className={`chart-container ${className || ""}`}
      style={{
        "--color-revenue": config?.revenue?.color || "hsl(215, 100%, 50%)",
        "--color-discount": config?.discount?.color || "hsl(45, 100%, 50%)",
        "--color-count": config?.count?.color || "hsl(142, 76%, 36%)",
      }}
    >
      {children}
    </div>
  )
}

export function ChartTooltip({ children }) {
  return <div className="chart-tooltip">{children}</div>
}

export function ChartTooltipContent({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip-content">
        <p className="chart-tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}
