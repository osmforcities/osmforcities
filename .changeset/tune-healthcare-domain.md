---
"osmforcities": minor
---

Healthcare domain template pass:

- Tuned filterableTags + demonstrator cities for the existing healthcare templates and added 11 allied-health templates (opticians, medical-laboratories, psychotherapists, physiotherapists, optometrists, podiatrists, rehabilitation-centres, counselling-services, speech-therapists, occupational-therapists, alternative-medicine).
- Added three templates from a wiki-vs-live-coverage gap audit: blood-donation, dialysis-centres, and midwives.
- Restored `brand` as a legend filter on pharmacies and medical-laboratories (chain distribution is a strong civic signal where it exists).
- Localized the Specialty (`healthcare:speciality`) legend values in English, Spanish, and Portuguese.
- Refreshed several healthcare category icons for clearer meaning (physiotherapists, psychotherapists, counselling, occupational-therapists, rehabilitation-centres, dentists).
- Fixed: a curated map filter at 0% coverage (e.g. wheelchair on health-post) was dropped from the Color-by control; it now renders as a single all-Missing legend view so accessibility gaps show on the map, not only in the stats panel.
