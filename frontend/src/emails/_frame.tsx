import {
  Body,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

/**
 * Shared visual frame for all OSSCAR emails — mirrors the dark theme of the
 * website (see frontend/src/app/globals.css :90-123). All colors are inline
 * hex; oklch values from the site are converted to their sRGB equivalents
 * so legacy email clients render correctly.
 *
 * No remote <Img> for the wordmark: many clients (Gmail web, Apple Mail)
 * block externally-hosted SVGs, and our /osscar-icon.svg is ~760KB besides.
 * A pure-CSS mark is bulletproof.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://osscar.dev";

// These are converted from the site's oklch tokens for dark mode.
export const COLORS = {
  bg: "#121212", // --background
  card: "#262626", // --card  (oklch 0.205)
  cardInner: "#1c1c1c", // slightly darker for nested cards
  border: "rgba(255,255,255,0.10)", // --border
  borderStrong: "rgba(255,255,255,0.20)",
  borderSoft: "rgba(255,255,255,0.05)",
  fg: "#f4f4f4", // --foreground (oklch 0.973)
  fgStrong: "#fafafa",
  fgMuted: "#a1a1a1", // --muted-foreground (oklch 0.708)
  fgSubtle: "rgba(255,255,255,0.40)",
  fgFaint: "rgba(255,255,255,0.25)",
  white4: "rgba(255,255,255,0.04)",
  brand: "#3ECF8E", // --brand / --green
  brandFg: "#052a1b",
  brandDim: "rgba(62,207,142,0.10)",
  brandBorder: "rgba(62,207,142,0.30)",
  brandPillBg: "rgba(62,207,142,0.15)",
  danger: "#F87171",
  dangerDim: "rgba(248,113,113,0.14)",
  gold: "#F4C430",
  bronze: "#E8A020",
  blue: "#60A5FA",
  orange: "#FB923C",
} as const;

export const FONT_STACK =
  "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";
export const MONO_STACK =
  "'Source Code Pro', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const bodyStyle: React.CSSProperties = {
  backgroundColor: COLORS.bg,
  margin: 0,
  padding: "32px 16px",
  fontFamily: FONT_STACK,
  color: COLORS.fg,
  WebkitFontSmoothing: "antialiased",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
  backgroundColor: COLORS.bg,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 14,
  padding: 28,
};

const footerLinkStyle: React.CSSProperties = {
  color: COLORS.fgMuted,
  textDecoration: "underline",
  fontSize: 11,
};

function BrandMark() {
  // Logo is attached inline via CID in /api/request-score (sendEmail). The
  // `cid:osscar-logo` src is resolved by email clients to the MIME part with
  // `contentId: "osscar-logo"`. This is the standard, reliable way to include
  // images in transactional email — no external hosting required.
  //
  // In react-email's dev preview (`npm run email:dev`) there is no MIME
  // attachment, so the image renders as broken there. That's expected; the
  // actual sent email renders correctly.
  return (
    <Img
      src="cid:osscar-logo"
      width={20}
      height={26}
      alt="OSSCAR"
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        marginRight: 10,
      }}
    />
  );
}

type Props = {
  preview: string;
  quarterLabel: string;
  children: React.ReactNode;
};

export function EmailFrame({ preview, quarterLabel, children }: Props) {
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2",
            format: "woff2",
          }}
          fontWeight={700}
          fontStyle="normal"
        />
        {/* Mobile-responsive overrides. Gmail, Apple Mail, iOS Mail and
            Outlook web honor these media queries; Outlook desktop ignores
            them (and keeps the desktop layout, which is fine). */}
        <style>{`
          @media only screen and (max-width: 520px) {
            .osscar-container { padding: 20px !important; }
            .osscar-hero-cell {
              display: block !important;
              width: 100% !important;
              padding: 0 !important;
              border-left: 0 !important;
              text-align: left !important;
            }
            .osscar-hero-rank {
              margin-top: 20px !important;
              padding-top: 18px !important;
              border-top: 1px solid rgba(255,255,255,0.10) !important;
            }
            .osscar-hero-rank-num { font-size: 36px !important; }
            .osscar-hero-name { font-size: 20px !important; line-height: 26px !important; }
            .osscar-metric-row { border-spacing: 0 !important; }
            .osscar-metric-card {
              display: block !important;
              width: 100% !important;
              box-sizing: border-box !important;
              margin-bottom: 10px !important;
            }
            .osscar-header-right { display: none !important; }
          }
        `}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle} className="osscar-container">
          {/* Header row: wordmark + quarter caption (mirrors site-header) */}
          <Section
            style={{
              paddingBottom: 20,
              borderBottom: `1px solid ${COLORS.border}`,
              marginBottom: 28,
            }}
          >
            <table
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              role="presentation"
            >
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "middle" }}>
                    <Link
                      href={SITE_URL}
                      style={{
                        color: COLORS.fg,
                        textDecoration: "none",
                        fontSize: 17,
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      <BrandMark />
                      <span style={{ verticalAlign: "middle" }}>OSSCAR</span>
                    </Link>
                    <span
                      style={{
                        color: COLORS.fgFaint,
                        margin: "0 10px",
                        verticalAlign: "middle",
                      }}
                    >
                      |
                    </span>
                    <span
                      style={{
                        fontFamily: MONO_STACK,
                        fontSize: 10,
                        fontWeight: 400,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: COLORS.fgMuted,
                        verticalAlign: "middle",
                      }}
                    >
                      {quarterLabel}
                    </span>
                  </td>
                  <td
                    className="osscar-header-right"
                    style={{
                      textAlign: "right",
                      verticalAlign: "middle",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Link
                      href="https://supabase.com"
                      style={{ textDecoration: "none" }}
                    >
                      <Img
                        src="cid:supabase-logo"
                        alt="Supabase"
                        height={16}
                        style={{
                          display: "inline-block",
                          verticalAlign: "middle",
                          height: 16,
                          width: "auto",
                          opacity: 0.85,
                        }}
                      />
                    </Link>
                    <span
                      style={{
                        color: COLORS.fgFaint,
                        margin: "0 8px",
                        verticalAlign: "middle",
                        fontSize: 11,
                      }}
                    >
                      ×
                    </span>
                    <Link
                      href="https://commit.fund"
                      style={{ textDecoration: "none" }}
                    >
                      <Img
                        src="cid:commit-logo"
                        alt=">commit"
                        height={16}
                        style={{
                          display: "inline-block",
                          verticalAlign: "middle",
                          height: 16,
                          width: "auto",
                          opacity: 0.85,
                        }}
                      />
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {children}

          <Hr style={{ borderColor: COLORS.border, margin: "32px 0 20px" }} />

          <Section>
            <Text
              style={{
                margin: 0,
                fontSize: 11,
                lineHeight: "18px",
                color: COLORS.fgSubtle,
              }}
            >
              OSSCAR ranks open-source organizations by composite growth across
              GitHub stars, contributors, and package downloads.
            </Text>
            <Text
              style={{
                margin: "10px 0 0",
                fontSize: 11,
                lineHeight: "18px",
                color: COLORS.fgSubtle,
              }}
            >
              <Link href={`${SITE_URL}/methodology`} style={footerLinkStyle}>
                Methodology
              </Link>
              {" · "}
              <Link
                href="mailto:unsubscribe@osscar.dev?subject=Unsubscribe"
                style={footerLinkStyle}
              >
                Unsubscribe
              </Link>
              {" · "}
              <Link href={SITE_URL} style={footerLinkStyle}>
                osscar.dev
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export { SITE_URL };
