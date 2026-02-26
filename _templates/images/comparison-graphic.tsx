/**
 * Comparison Graphic — Satori-rendered before/after card.
 * Two-column layout with an improvement badge between them.
 * Dimensions: 800x500px (landscape).
 *
 * Used for: before/after optimizations, cost comparisons, migration results.
 */

export interface BrandColors {
  primary: string;
  foreground: string;
  background: string;
  secondary: string;
  darkPrimary: string;
  lightBackground: string;
}

export interface ComparisonGraphicProps {
  title?: string;
  before: { label: string; value: string };
  after: { label: string; value: string };
  improvement: string;    // e.g., "67% reduction"
  brandColors: BrandColors;
}

export function ComparisonGraphic(props: ComparisonGraphicProps) {
  const { title, before, after, improvement, brandColors } = props;

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
        background: brandColors.lightBackground,
        color: brandColors.foreground,
        fontFamily: "Inter",
        position: "relative",
        overflow: "hidden",
        borderRadius: 16,
        border: `2px solid ${brandColors.primary}20`,
      }}
    >
      {/* Title */}
      {title && (
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 32,
            color: brandColors.foreground,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </div>
      )}

      {/* Two-column comparison */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 40,
          width: "100%",
        }}
      >
        {/* BEFORE column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: 32,
            borderRadius: 12,
            backgroundColor: "#FF6B6B18",
            border: "2px solid #FF6B6B40",
            width: 280,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#FF6B6B",
              marginBottom: 12,
            }}
          >
            BEFORE
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              lineHeight: 1.2,
              color: "#FF6B6B",
              marginBottom: 8,
            }}
          >
            {before.value}
          </div>
          <div
            style={{
              fontSize: 14,
              color: brandColors.foreground,
              opacity: 0.7,
              textAlign: "center",
            }}
          >
            {before.label}
          </div>
        </div>

        {/* Arrow + improvement badge */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 28, color: brandColors.primary }}>→</div>
          <div
            style={{
              backgroundColor: "#00C48C",
              color: "#FFFFFF",
              padding: "8px 16px",
              borderRadius: 20,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {improvement}
          </div>
        </div>

        {/* AFTER column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: 32,
            borderRadius: 12,
            backgroundColor: "#00C48C18",
            border: "2px solid #00C48C40",
            width: 280,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#00C48C",
              marginBottom: 12,
            }}
          >
            AFTER
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              lineHeight: 1.2,
              color: "#00C48C",
              marginBottom: 8,
            }}
          >
            {after.value}
          </div>
          <div
            style={{
              fontSize: 14,
              color: brandColors.foreground,
              opacity: 0.7,
              textAlign: "center",
            }}
          >
            {after.label}
          </div>
        </div>
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
