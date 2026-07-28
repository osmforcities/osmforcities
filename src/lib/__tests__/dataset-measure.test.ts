import { describe, it, expect } from "vitest";
import { formatArea, formatLength } from "@/lib/dataset-measure";

const nf = (locale: string) => new Intl.NumberFormat(locale);

const LRI = String.fromCharCode(0x2066);
const PDI = String.fromCharCode(0x2069);
// Each measure is returned wrapped in an LTR isolate; assert on the visible
// text by stripping the isolate markers.
const visible = (s: string) => s.replace(LRI, "").replace(PDI, "");

describe("formatArea", () => {
  it("renders sub-km² footprints as the full grouped m² count", () => {
    // 0.023 km² = 23,000 m² -> full number, no compact kilo symbol
    expect(visible(formatArea(0.023, nf("en")))).toBe("23,000 m²");
    expect(visible(formatArea(0.95, nf("en")))).toBe("950,000 m²");
  });

  it("switches to km² at and above 1 km²", () => {
    expect(visible(formatArea(2.5, nf("en")))).toBe("2.5 km²");
    expect(visible(formatArea(1, nf("en")))).toBe("1 km²");
  });

  it("renders zero as 0 m²", () => {
    expect(visible(formatArea(0, nf("en")))).toBe("0 m²");
    expect(visible(formatArea(-5, nf("en")))).toBe("0 m²");
  });

  it("uses locale grouping for the m² count", () => {
    // pt-BR groups thousands with a dot: 23.000
    expect(visible(formatArea(0.023, nf("pt-BR")))).toBe("23.000 m²");
  });

  it("localizes the zero digit for non-Latin locales", () => {
    // fa-IR uses Eastern-Arabic-Indic digits; the zero must go through nf too.
    expect(visible(formatArea(0, nf("fa-IR")))).toBe(
      `${nf("fa-IR").format(0)} m²`
    );
    expect(visible(formatArea(0, nf("fa-IR")))).not.toBe("0 m²");
  });

  it("wraps the measure in an LTR isolate for RTL safety", () => {
    const out = formatArea(0.023, nf("en"));
    expect(out.startsWith(LRI)).toBe(true);
    expect(out.endsWith(PDI)).toBe(true);
  });
});

describe("formatLength", () => {
  it("uses meters below 1 km, km at or above", () => {
    expect(visible(formatLength(0.4, nf("en")))).toBe("400 m");
    expect(visible(formatLength(2.5, nf("en")))).toBe("2.5 km");
  });

  it("renders zero as 0 m", () => {
    expect(visible(formatLength(0, nf("en")))).toBe("0 m");
  });

  it("localizes the zero digit for non-Latin locales", () => {
    expect(visible(formatLength(0, nf("fa-IR")))).toBe(
      `${nf("fa-IR").format(0)} m`
    );
  });

  it("wraps the measure in an LTR isolate for RTL safety", () => {
    const out = formatLength(2.5, nf("en"));
    expect(out.startsWith(LRI)).toBe(true);
    expect(out.endsWith(PDI)).toBe(true);
  });
});
