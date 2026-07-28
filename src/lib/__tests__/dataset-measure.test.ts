import { describe, it, expect } from "vitest";
import { formatArea, formatLength } from "@/lib/dataset-measure";

const nf = (locale: string) => new Intl.NumberFormat(locale);

describe("formatArea", () => {
  it("renders sub-km² footprints in m² with lowercase SI kilo", () => {
    // 0.023 km² = 23,000 m² -> compact "23K" must become "23k" (SI kilo)
    expect(formatArea(0.023, nf("en"))).toBe("23k m²");
  });

  it("keeps uppercase M for mega (SI-correct, unlike kilo)", () => {
    // 0.95 km² = 950,000 m² rounds to compact "950K" -> "950k"
    expect(formatArea(0.95, nf("en"))).toBe("950k m²");
    // just under 1 km² rounds up to 1,000,000 m² -> compact "1M" stays uppercase
    expect(formatArea(0.9999999, nf("en"))).toBe("1M m²");
  });

  it("switches to km² at and above 1 km²", () => {
    expect(formatArea(2.5, nf("en"))).toBe("2.5 km²");
    expect(formatArea(1, nf("en"))).toBe("1 km²");
  });

  it("renders zero as 0 m²", () => {
    expect(formatArea(0, nf("en"))).toBe("0 m²");
    expect(formatArea(-5, nf("en"))).toBe("0 m²");
  });

  it("leaves word-abbreviation locales untouched (no K to lowercase)", () => {
    // pt-BR compact uses "mil" (not "K"); assert against raw Intl output so the
    // locale's own spacing (narrow no-break space) is compared faithfully.
    const raw = new Intl.NumberFormat("pt-BR", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(23000);
    expect(formatArea(0.023, nf("pt-BR"))).toBe(`${raw} m²`);
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
