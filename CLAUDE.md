# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static single-page web application (装修助手) for planning the renovation of an 88.45㎡ first-floor apartment in Kunming. The app provides a requirements checklist, 3D floor plan preview, price calculator, full-vs-half package decision analysis, communication memos, and renovation pitfall warnings.

No build system, bundler, or package manager — open `index.html` directly in a browser or serve with any static file server (`python3 -m http.server`).

## Architecture

**Static HTML + vanilla JS modules**, loaded in order via `<script>` tags in `index.html`:

1. `js/data.js` — All static data: room geometry (JSON→Three.js coordinate mapping), requirement items with 3-tier pricing, core problems, renovation stages, memo data, pitfall data, company comparison questions, and package definitions. This is the single source of truth for all content.
2. `js/scene.js` — Three.js scene setup, camera controls, OrbitControls, raycasting for room hover/click.
3. `js/room.js` — Builds 3D room geometry (walls, floors, doors, windows) from `ROOM_DATA`.
4. `js/furniture.js` — Renders furniture placeholders in the 3D scene.
5. `js/lighting.js` — Lighting presets and toggle.
6. `js/airflow.js` — Airflow visualization particles.
7. `js/requirements.js` — `RequirementsManager` class: sidebar module/stage lists, requirement item CRUD, search, localStorage persistence.
8. `js/core.js` — `CoreProblemsManager`: links core problems (moisture, lighting, privacy, etc.) to requirement items.
9. `js/memo.js` — `MemoManager`: communication checklist with notes, PDF export.
10. `js/pitfalls.js` — `PitfallsManager`: renovation pitfall checklist with notes.
11. `js/calculator.js` — `PriceCalculator`: 3-tier pricing, pie chart via Canvas 2D, summary generation.
12. `js/decision.js` — `DecisionAnalyzer`: full vs half package comparison based on checked requirements.
13. `js/app.js` — Main entry: instantiates all managers, wires tab switching, 3D toggle buttons, modal dialogs.

**Key data flow:** `data.js` defines constants → manager classes read them → `app.js` wires DOM events → managers re-render their panels.

## Coordinate System

`房屋原始结构3D语义化.json` stores room polygons in mm with origin at Bedroom_B top-left. `data.js` converts to Three.js world coordinates (meters, centered on floor plan) via `jsonToScene()`.

## Key Data Structures in `data.js`

- `ROOM_DATA` — room IDs, areas, colors, polygon coordinates for 3D rendering
- `REQUIREMENTS_DATA` — modules with items; each item has `status` (checked/pending), `room` association, and `price1/price2/price3` (economy/comfort/quality)
- `CORE_PROBLEMS` — problems linked to requirement item IDs via `linkedItems`
- `STAGES` / `ITEM_STAGE_MAP` — construction phase ordering
- `COMPARE_QUESTIONS` / `COMPARE_CATEGORY_TIPS` — company comparison framework
- `MEMO_DATA` — **个性化**的沟通备忘（每家情况不同：物业规定、业主信息等）
- `PITFALLS_DATA` — **通用**的装修避坑经验（可复制、不针对特定小区/物业）

## CSS

Single file `css/style.css`. All styling is vanilla CSS, no preprocessor.

## 3D Dependencies

Three.js r137 loaded from CDN (`three.min.js` + `OrbitControls.js`). No local copies.

## State Persistence

Requirement checked/unchecked states and notes are saved to `localStorage` by the manager classes.

## File Conventions

- All UI text is in Chinese (zh-CN)
- Room IDs use snake_case (e.g., `bedroom_a`, `living_balcony`)
- Requirement item IDs use prefixed snake_case (e.g., `basic_water`, `kitchen_cabinet`)
- Images are JPG files with Chinese or WeChat naming
