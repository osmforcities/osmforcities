export interface City {
  name: string;
  name_normalized: string;
  name_slug: string;
  country_code: string;
  region_code: string;
  is_capital: boolean;
}

export interface CityStats {
  cityId: number;
  presetsCount: number;
  requiredTagsCoverage: number;
  recommendedTagsCoverage: number;
  date: Date;
}
