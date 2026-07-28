import { describe, it, expect } from "vitest";
import { formatArea, formatLength } from "@/lib/dataset-measure";

const nf = (locale: string) => new Intl.NumberFormat(locale);

describe("formatArea", () => {
  it("renders sub-km² footprints as the full grouped m² count", () => {
    // 0.023 km² = 23,000 m² -> full number, no compact kilo symbol
    expect(formatArea(0.023, nf("en"))).toBe("23,000 m²");
    expect(formatArea(0.95, nf("en"))).toBe("950,000 m²");
  });

  it("switches to km² at and above 1 km²", () => {
    expect(formatArea(2.5, nf("en"))).toBe("2.5 km²");
    expect(formatArea(1, nf("en"))).toBe("1 km²");
  });

  it("renders zero as 0 m²", () => {
    expect(formatArea(0, nf("en"))).toBe("0 m²");
    expect(formatArea(-5, nf("en"))).toBe("0 m²");
  });

  it("uses locale grouping for the m² count", () => {
    // pt-BR groups thousands with a dot: 23.000
    expect(formatArea(0.023, nf("pt-BR"))).toBe("23.000 m²");
  });
});

describe("formatLength", () => {
  it("uses meters below 1 km, km at or above", () => {
    expect(formatLength(0.4, nf("en"))).toBe("400 m");
    expect(formatLength(2.5, nf("en"))).toBe("2.5 km");
  });

  it("renders zero as 0 m", () => {
    expect(formatLength(0, nf("en"))).toBe("0 m");
  });
});
