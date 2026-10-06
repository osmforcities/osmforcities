# Large datasets are limited by size alone, not by kind of area

The tiles-only lane is for cities, including the largest, and not for metro regions or states. That scope is not encoded as a rule about area type. The only limit is what the pipeline can count and bake: an area whose count probe fails even on raised budgets is refused, everything else is allowed.

## Why not an area-type rule

- Nominatim calls Tokyo Metropolis a city, so a rule by type would admit the exact case it was written to exclude.
- There is no clean numeric line either: São Paulo the city and São Paulo the state differ by about a quarter in element count.
- Tokyo excludes itself by being too big to even count, which is the intended behaviour.

## Consequences

- No area-type column, no per-country rules, no migration.
- The ceiling moves only when the pipeline's budgets move: a measured change, not a config tweak.
