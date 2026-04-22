import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { COLORS, EmailFrame, SITE_URL } from "./_frame";

/**
 * Sent when we can't find the submitted org in the current quarter's dataset.
 *
 * Tone: friendly, not apologetic. Tells them what OSSCAR tracks and points
 * at the public index so they can browse.
 */

export type NotFoundEmailProps = {
  quarterLabel: string;
  /** What the visitor typed — shown verbatim (escaped by React). */
  orgInput: string;
};

export default function NotFoundEmail({
  quarterLabel,
  orgInput,
}: NotFoundEmailProps) {
  return (
    <EmailFrame
      preview={`We couldn't find ${orgInput} in the OSSCAR ${quarterLabel} index`}
      quarterLabel={quarterLabel}
    >
      <Section style={{ marginBottom: 8 }}>
        <Text
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: COLORS.fg,
            lineHeight: "28px",
            letterSpacing: "-0.01em",
          }}
        >
          We couldn&apos;t find that organization
        </Text>
      </Section>

      <Section style={{ marginBottom: 20 }}>
        <Text
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: "22px",
            color: COLORS.fgMuted,
          }}
        >
          Thanks for trying OSSCAR. We searched for{" "}
          <span
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              color: COLORS.fg,
              backgroundColor: COLORS.cardInner,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 4,
              padding: "2px 6px",
            }}
          >
            {orgInput}
          </span>{" "}
          in our {quarterLabel} dataset and didn&apos;t find a match.
        </Text>
      </Section>

      <Section
        style={{
          backgroundColor: COLORS.cardInner,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: 18,
          marginBottom: 24,
        }}
      >
        <Text
          style={{
            margin: 0,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 10,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: COLORS.fgSubtle,
          }}
        >
          Who we include
        </Text>
        <Text
          style={{
            margin: "8px 0 0",
            fontSize: 13,
            lineHeight: "20px",
            color: COLORS.fgMuted,
          }}
        >
          OSSCAR ranks GitHub organizations (not personal accounts) that meet
          all of the following:
        </Text>
        <Text
          style={{
            margin: "8px 0 0",
            fontSize: 13,
            lineHeight: "22px",
            color: COLORS.fgMuted,
          }}
        >
          · at least one repository with{" "}
          <span style={{ color: COLORS.fg, fontWeight: 600 }}>100+ stars</span>
          <br />· the organization was{" "}
          <span style={{ color: COLORS.fg, fontWeight: 600 }}>
            created after 2015
          </span>
          <br />· observable activity this quarter on GitHub and/or package
          registries (npm · PyPI · Cargo)
        </Text>
        <Text
          style={{
            margin: "12px 0 0",
            fontSize: 13,
            lineHeight: "20px",
            color: COLORS.fgMuted,
          }}
        >
          A few reasons we might have missed this one:
        </Text>
        <Text
          style={{
            margin: "6px 0 0",
            fontSize: 13,
            lineHeight: "22px",
            color: COLORS.fgMuted,
          }}
        >
          · it&apos;s a personal user account rather than an organization
          <br />· no repo has crossed the 100-star threshold yet
          <br />· the org was created on or before 2015
          <br />· the org was created or renamed this quarter and our snapshot
          is one quarter behind
        </Text>
      </Section>

      <Section style={{ textAlign: "center", marginTop: 28, marginBottom: 4 }}>
        <Button
          href={`${SITE_URL}/`}
          style={{
            backgroundColor: COLORS.brand,
            color: "#052a1b",
            fontSize: 13,
            fontWeight: 600,
            padding: "11px 20px",
            borderRadius: 8,
            textDecoration: "none",
            display: "inline-block",
            letterSpacing: "0.01em",
          }}
        >
          Go to the ranking →
        </Button>
      </Section>

      <Text
        style={{
          margin: "16px 0 0",
          fontSize: 11,
          lineHeight: "18px",
          color: COLORS.fgSubtle,
          textAlign: "center",
        }}
      >
        We&apos;ll re-check every quarter. If you think this is a bug, reply to
        this email and we&apos;ll take a look.
      </Text>
    </EmailFrame>
  );
}

NotFoundEmail.PreviewProps = {
  quarterLabel: "Q1 2026",
  orgInput: "acme-widgets",
} satisfies NotFoundEmailProps;
