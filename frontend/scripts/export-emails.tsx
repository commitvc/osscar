import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { render } from "react-email";

import NotFoundEmail, {
  notFoundPreviewProps,
} from "../src/emails/not-found";
import ScoreReportEmail, {
  scoreReportPreviewProps,
} from "../src/emails/score-report";

const outputDirectory = resolve(process.cwd(), ".email-out");
const templates = [
  {
    filename: "not-found.html",
    element: <NotFoundEmail {...notFoundPreviewProps} />,
  },
  {
    filename: "score-report.html",
    element: <ScoreReportEmail {...scoreReportPreviewProps} />,
  },
];

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  for (const template of templates) {
    const html = await render(template.element, { pretty: true });
    await writeFile(resolve(outputDirectory, template.filename), html, "utf8");
    console.log(`Exported ${template.filename}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
