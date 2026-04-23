/**
 * Send a test email via Resend using the react-email templates.
 *
 * Usage (from frontend/):
 *   npm run email:send -- --to you@example.com --template score
 *   npm run email:send -- --to you@example.com --template not-found
 *
 * Env (frontend/.env.local):
 *   RESEND_API_KEY        secret API key from resend.com/api-keys
 *   RESEND_FROM           e.g.  "OSSCAR <hello@osscar.dev>"
 *                         (defaults to "OSSCAR <onboarding@resend.dev>"
 *                          so you can test before DNS is verified)
 *   NEXT_PUBLIC_SITE_URL  used for absolute image URLs in the email
 */
import { render } from "@react-email/render";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { Resend } from "resend";
import { createElement } from "react";

import NotFoundEmail from "../src/emails/not-found";
import ScoreReportEmail from "../src/emails/score-report";

// Load .env.local first (Next convention), then .env as a fallback.
for (const file of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), file);
  if (existsSync(path)) loadEnv({ path });
}

const { values } = parseArgs({
  options: {
    to: { type: "string" },
    template: { type: "string", default: "score" },
    subject: { type: "string" },
  },
});

if (!values.to) {
  console.error("ERROR: pass --to you@example.com");
  process.exit(1);
}
const to: string = values.to;

const template = values.template ?? "score";
if (template !== "score" && template !== "not-found") {
  console.error(`ERROR: --template must be 'score' or 'not-found' (got '${template}')`);
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error("ERROR: RESEND_API_KEY not set (put it in frontend/.env.local)");
  process.exit(1);
}

// Fall back to Resend's shared testing sender so you can send before
// osscar.dev is DNS-verified. Resend only delivers from onboarding@resend.dev
// to the account-owner address, which is exactly what we want for dev.
const from = process.env.RESEND_FROM ?? "OSSCAR <onboarding@resend.dev>";

const [Component, previewProps, defaultSubject] =
  template === "score"
    ? [
        ScoreReportEmail,
        ScoreReportEmail.PreviewProps,
        `#${ScoreReportEmail.PreviewProps.divisionRank} on OSSCAR ${ScoreReportEmail.PreviewProps.quarterLabel} — ${ScoreReportEmail.PreviewProps.ownerName}`,
      ]
    : [
        NotFoundEmail,
        NotFoundEmail.PreviewProps,
        `OSSCAR ${NotFoundEmail.PreviewProps.quarterLabel} — we couldn't find "${NotFoundEmail.PreviewProps.orgInput}"`,
      ];

const subject = values.subject ?? defaultSubject;

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(Component as any, previewProps as any);
  const [html, text] = await Promise.all([
    render(element, { pretty: false }),
    render(element, { plainText: true }),
  ]);

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
    replyTo: "hello@osscar.dev",
  });

  if (error) {
    console.error("✗ Resend error:");
    console.error(error);
    process.exit(1);
  }

  console.log("✓ Sent");
  console.log(`   template: ${template}`);
  console.log(`   from:     ${from}`);
  console.log(`   to:       ${to}`);
  console.log(`   subject:  ${subject}`);
  console.log(`   id:       ${data?.id ?? "(unknown)"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
