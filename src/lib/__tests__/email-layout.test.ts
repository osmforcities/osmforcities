import { describe, it, expect } from "vitest";
import { emailButton, emailParagraph, renderEmail } from "../email-layout";

const url = "https://osmforcities.org/en/area/1/dataset/schools";

describe("renderEmail", () => {
  it("wraps heading, body and footer in the card with lang and dir", () => {
    const { html } = renderEmail({
      locale: "pt-BR",
      heading: "Título",
      body: emailParagraph("Corpo."),
      footer: ["Rodapé."],
    });

    expect(html).toContain('lang="pt-BR" dir="ltr"');
    expect(html).toContain("text-align: left;");
    expect(html).toMatch(/<h1[^>]*>Título<\/h1>/);
    expect(html).toContain("Corpo.");
    expect(html).toContain("Rodapé.");
  });

  it("prints a button as label and URL in plain text", () => {
    const { text } = renderEmail({
      locale: "en",
      heading: "Heading",
      body: emailButton(url, "Open the map"),
    });

    expect(text).toContain(`Open the map [${url}]`);
    expect(text).toContain("Heading");
    expect(text).not.toContain("HEADING");
  });

  it("leaves html-only paragraphs out of plain text", () => {
    const { html, text } = renderEmail({
      locale: "en",
      heading: "Heading",
      body: emailParagraph("Only in HTML.", { htmlOnly: true }),
    });

    expect(html).toContain("Only in HTML.");
    expect(text).not.toContain("Only in HTML.");
  });
});
