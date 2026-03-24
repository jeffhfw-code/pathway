# Pathway Analyzer — Codebase CLAUDE.md

## What This Is

Zoning Entitlement Pathway Analyzer — a vanilla JavaScript PWA that analyzes zoning entitlement pathways for inpatient behavioral health (BH) and substance use disorder (SUD) treatment facilities across Colorado jurisdictions. Built by Innerstate Core. Deployed to GitHub Pages.

No framework, no build step, no bundler. Vanilla ES6 with modular file structure.

## File Structure

```
index.html              Entry point, SW registration, script imports
sw.js                   Service worker (stale-while-revalidate, CACHE_NAME = 'pathway-v25')
styles.css              Dark theme responsive styles + print CSS
manifest.json           PWA manifest (Innerstate Core branding)
js/config.js            Zone lists, use tables, GIS endpoints, helper functions
js/state.js             Centralized state, GIS phase state machine, localStorage persistence
js/ui.js                Wizard pages, results rendering, main render loop
js/gis.js               Auto-detect jurisdiction, GIS lookups, AbortController
js/engine-denver.js     Denver rule engine
js/engine-cos.js        Colorado Springs rule engine
js/engine-epc.js        El Paso County rule engine
js/engine-manitou.js    Manitou Springs rule engine
js/glossary.js          Term definitions and abbreviations
tests/test-engines.js   Test suite (pure JS, no framework)
tests/test-engines.html Test runner HTML
```

## Engine Contract

Every engine is a pure function: `engineFn(formData) → {zone, gS[], gC[], results[], p2}`

Pathway objects in `results[]`:
```
{id, nm, v, proc, rank, rat, wf[], stops[], cav[], rsk{}, mg}
```

- `v:"yes"` = Viable, `v:"no"` = Not Viable. **Only two options. Never "conditional."**
- `stops[]` = reasons a pathway is Not Viable
- `cav[]` = non-blocking caveats for viable pathways
- Blocking caveats are promoted to `stops[]` and pathway becomes Not Viable

## Hard Constraints

1. **Source authority.** Every rule must trace to a specific zoning code section citation.
2. **Viability is binary.** `v:"yes"` or `v:"no"` only. Never `v:"conditional"`.
3. **Guest count is output.** The tool determines max viable count per pathway. User never inputs a desired count.
4. **All pathways tested.** Every viable use classification is evaluated, not just "group home."
5. **Population is BH/SUD.** Elderly/disabled-only pathways (LTC, CCRC) are always Not Viable.
6. **Tests must pass.** All tests must pass before any commit. Open `tests/test-engines.html` to verify.
7. **Version bump required.** Every substantive change bumps `sw.js` CACHE_NAME and `index.html` footer.

## Key Conventions

- `esc()` for ALL user-facing string interpolation (XSS safety)
- `setGisPhase()` enforces valid GIS state transitions (idle → searching → querying → done)
- `getSp(zone)` returns Denver spacing threshold per zone (null = no spacing rule)
- `isSU(z)`, `isTU(z)`, `isRH25(z)`, `hasMU(z)`, `hasCC(z)` — zone classification helpers in config.js
- `citeLink(section, url)` — generates hyperlinked code citations
- `baseForm({overrides})` — test helper for creating form data with defaults
- BHA (not CDPHE) is the state licensing authority for behavioral health facilities as of January 1, 2024

## GIS Integration

Address auto-detect queries all 4 geocoders in parallel. Priority: Manitou > COS > Denver > EPC (most specific municipality wins). `_gisAbort` shared AbortController cancels in-flight requests on new search.

## Development Workflow

**Testing:** Open `tests/test-engines.html` in a browser. All tests must pass.

**Cache clearing after code changes:**
```js
navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()));
caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))));
```

**GitHub workflow:** Branch protection on main. Work on feature branches, PR to main, merge from GitHub UI, delete branch after merge.

## Adding a New Jurisdiction

1. Read the locked ruleset from the `project_pwa` workspace folder
2. Create `js/engine-[jur].js` following the engine contract above
3. Update `js/config.js` with zone tables and GIS endpoints
4. Update `js/ui.js` with wizard pages for the new jurisdiction
5. Update `js/gis.js` with geocoder and GIS lookup endpoints
6. Add tests to `tests/test-engines.js`
7. Bump `sw.js` CACHE_NAME and `index.html` footer version

## Current State (v25)

- Denver: Deployed. 5 pathways.
- Colorado Springs: Deployed. FHA/non-FHA bifurcation.
- El Paso County: Deployed. 8 GH subtypes + 5 institutional pathways.
- Manitou Springs: Deployed. 9 pathways, 5-question medical care split.
- Fort Collins: Ruleset complete. Engine not yet built.
