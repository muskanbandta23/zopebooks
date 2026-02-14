/**
 * Open Graph image template for Satori.
 * Dimensions: 1200x630px
 */

export interface OgImageProps {
  title: string;
  subtitle: string;
  brandColors: {
    primary: string;
    foreground: string;
    background: string;
    secondary: string;
  };
}

export function OgImage(props: OgImageProps) {
  const { title, subtitle, brandColors } = props;

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        backgroundColor: brandColors.primary,
        color: "#FFFFFF",
        fontFamily: "Inter",
      }}
    >
      {/* Decorative corner element */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 300,
          height: 300,
          backgroundColor: "rgba(255,255,255,0.08)",
          borderRadius: "0 0 0 100%",
        }}
      />

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 900,
        }}
      >
        <h1
          style={{
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: 28,
            lineHeight: 1.5,
            margin: 0,
            opacity: 0.85,
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 24,
            fontWeight: 700,
            opacity: 0.8,
          }}
        >
          zopdev
        </span>
        <span
          style={{
            fontSize: 18,
            opacity: 0.6,
          }}
        >
          Free Ebook
        </span>
      </div>
    </div>
  );
}
