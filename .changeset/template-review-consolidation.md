---
"osmforcities": minor
---

Template review epic (#245): consolidate the food, sport/recreation, public-amenities, tourism and social domain batches into one uniform, wiki-grounded pass (healthcare shipped earlier as the quality bar).

- New templates from the domain batches and a live gap audit: food-court, food-vending, tracks, fitness-stations, ice-rinks, shower, public-bookcase, luggage-lockers, post-boxes, give-box, waste-basket, bottle-return, hotel-guesthouse, and motels (regionally-concentrated Brazilian short-stay lodging).
- Curated per-template "Color by" legends (filterableTags) tuned against real dashboard coverage in every touched domain, with demonstrator cities recorded.
- Accessibility as a transversal signal: wheelchair kept on every enterable/staffed venue even at 0% coverage (the all-Missing legend is itself the gap finding) — restored on community-centre, sports-centres and chalets.
- Removed dead/redundant templates (multi-sport, ice-hockey, ice-skating, guideposts, markers, internet-access) and the empty `public` category; fixed the broken senior-centers selector.
- Localized specialty/tag-value legends across en, pt-BR and es.
- Catalog-wide query fix: tag-value matches use a semicolon-boundary regex so features using OSM's `key=a;b` combined-value convention are no longer dropped, and combined values are counted toward each value in the legend.
- Closed out the epic with a full review of every previously-untouched template: added measured "Color by" keys to orchards, beaches, dog-parks, tower, surveillance, pipeline, storage-tanks and the football/basketball/tennis courts; removed the effectively-deprecated `moor`; and confirmed the remaining land-use/nature/infrastructure/housing templates as age-view-only where no colorable usability key exists.
