# AGENTS.md

## Quick Start

No build system. Open `index.html` directly, or:
```
python3 -m http.server 8080
```
Then visit `http://localhost:8080`.

## Architecture

Static single-page app (装修助手) — vanilla HTML + CSS + JS, no bundler, no npm. Three.js loaded from CDN (r137).

**Script load order matters** — `index.html` loads JS files sequentially via `<script>` tags. `data.js` first (defines all constants), then scene/room/furniture/lighting/airflow, then manager classes, then `app.js` last (wires everything together).

**Data flow:** `js/data.js` is the single source of truth → manager classes read constants → `app.js` wires DOM events → managers re-render panels. All content (rooms, requirements, pricing, pitfalls, memos) lives in `data.js`.

## Key Gotchas

- **No module system.** All JS files share global scope. Classes are instantiated as globals (e.g., `RequirementsManager`, `PriceCalculator`).
- **localStorage persistence.** Requirement checked states and notes persist client-side. Clearing browser data loses state.
- **All UI text is Chinese (zh-CN).** Room/item IDs use snake_case prefixed by domain (e.g., `basic_water`, `kitchen_cabinet`).
- **Coordinate system.** `房屋原始结构3D语义化.json` has origin at Bedroom_B top-left, mm units. `jsonToScene()` in `data.js` converts to Three.js world coords (meters, centered).
- **3D uses CDN Three.js.** No local copies — `three.min.js` + `OrbitControls.js` from jsdelivr. If CDN is down, 3D preview breaks.

## Files That Matter

| File | Role |
|------|------|
| `js/data.js` | All static data, pricing tiers, room geometry, coordinate math |
| `js/app.js` | Entry point — instantiates all managers, wires tabs/modals |
| `js/requirements.js` | RequirementsManager — sidebar, CRUD, search, localStorage |
| `js/calculator.js` | PriceCalculator — 3-tier pricing, pie chart |
| `js/memo.js` | MemoManager — communication checklist, PDF export |
| `js/pitfalls.js` | PitfallsManager — renovation pitfalls |
| `js/decision.js` | DecisionAnalyzer — full vs half package comparison |
| `css/style.css` | Single stylesheet, no preprocessor |
| `heimao/` | Separate Python tool (黑猫投诉数据采集) — not part of the web app |

## Adding Content

To add a new requirement item: edit `REQUIREMENTS_DATA` in `js/data.js`. Each item needs `id`, `name`, `price1/price2/price3` (economy/comfort/quality tiers), `room` (room ID from `ROOM_DATA`), and `status`.

To add a new room: edit `ROOM_DATA` in `js/data.js` with polygon coordinates (mm, origin at Bedroom_B top-left).
