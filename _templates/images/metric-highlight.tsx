/**
 * Metric Highlight — Satori-rendered multi-metric grid.
 * Displays 2-4 KPIs in a responsive grid with optional trend arrows.
 * Dimensions: 800x500px (landscape).
 *
 * Used for: performance dashboards, cost breakdowns, capability overviews.
 */

export interface BrandColors {
  primary: string;
  foreground: string;
  background: string;
  secondary: string;
  darkPrimary: string;
  lightBackground: string;
}

export interface MetricItem {
  label: string;
  value: string;
  trend?: "up" | "down";
}

export interface MetricHighlightProps {
  title?: string;
  metrics: MetricItem[];
  brandColors: BrandColors;
}

export function MetricHighlight(props: MetricHighlightProps) {
  const { title, metrics, brandColors } = props;
  const displayMetrics = metrics.slice(0, 4); // max 4

  return (
    <div
      style={{
        width: 800,
        height: 500,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 48,
        background: "#FFFFFF",
        color: brandColors.foreground,
        fontFamily: "Inter",
        position: "relative",
        overflow: "hidden",
        borderRadius: 16,
        border: `2px solid ${brandColors.primary}20`,
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 5,
          height: "100%",
          backgroundColor: brandColors.primary,
        }}
      />

      {/* Title */}
      {title && (
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 36,
            color: brandColors.foreground,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </div>
      )}

      {/* Metrics grid (2x2 or 1xN) */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 24,
          width: "100%",
        }}
      >
        {displayMetrics.map((metric, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: 28,
              borderRadius: 12,
              backgroundColor: brandColors.lightBackground,
              width: displayMetrics.length <= 2 ? 320 : 320,
              minWidth: 280,
            }}
          >
            {/* Value + trend arrow */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: brandColors.primary,
                }}
              >
                {metric.value}
              </div>
              {metric.trend && (
                <div
                  style={{
                    fontSize: 24,
                    color: metric.trend === "up" ? "#00C48C" : "#FF6B6B",
                    fontWeight: 700,
                  }}
                >
                  {metric.trend === "up" ? "↑" : "↓"}
                </div>
              )}
            </div>
            <div
              style={{
                fontSize: 14,
                color: brandColors.foreground,
                opacity: 0.65,
                textAlign: "center",
              }}
            >
              {metric.label}
            </div>
          </div>
        ))}
      </div>

      {/* Footer branding */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          right: 48,
          fontSize: 14,
          opacity: 0.35,
          color: brandColors.foreground,
        }}
      >
        zopdev
      </div>
    </div>
  );
}
