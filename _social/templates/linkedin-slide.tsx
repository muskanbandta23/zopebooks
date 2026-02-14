/**
 * LinkedIn carousel slide template for Satori.
 * Dimensions: 1080x1080px
 */

export interface LinkedInSlideProps {
  heading: string;
  body: string;
  slideNumber: number;
  totalSlides: number;
  brandColors: {
    primary: string;
    foreground: string;
    background: string;
    secondary: string;
  };
  isFirst: boolean;
  isLast: boolean;
}

export function LinkedInSlide(props: LinkedInSlideProps) {
  const { heading, body, slideNumber, totalSlides, brandColors, isFirst, isLast } = props;

  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
        backgroundColor: isFirst || isLast ? brandColors.primary : brandColors.background,
        color: isFirst || isLast ? "#FFFFFF" : brandColors.foreground,
        fontFamily: "Inter",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          backgroundColor: isFirst || isLast ? "#FFFFFF" : brandColors.primary,
          opacity: 0.8,
        }}
      />

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 24,
          maxWidth: 900,
        }}
      >
        <h1
          style={{
            fontSize: isFirst ? 64 : 52,
            fontWeight: 700,
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {heading}
        </h1>
        <p
          style={{
            fontSize: 28,
            lineHeight: 1.6,
            margin: 0,
            opacity: 0.9,
          }}
        >
          {body}
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
          fontSize: 20,
          opacity: 0.6,
        }}
      >
        <span>zopdev</span>
        <span>
          {slideNumber} / {totalSlides}
        </span>
      </div>
    </div>
  );
}
