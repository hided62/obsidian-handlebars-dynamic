# AGENTS.md

## Project

- This repository is an Obsidian plugin.
- Primary goal: keep compatibility with Obsidian plugin guidelines and API expectations.

## Non‑negotiables

- Do NOT violate Obsidian plugin guidelines.
- Avoid breaking changes to the plugin’s public behavior unless explicitly requested.
- Keep user data safe; avoid destructive operations on vault files.

## Code style

- Prefer TypeScript and Obsidian APIs.
- Keep changes minimal and localized.
- Avoid adding new dependencies unless necessary.
- Use ASCII by default; introduce Unicode only if the file already contains it.

## Obsidian plugin constraints

- Avoid direct DOM assumptions that might break across Obsidian versions.
- Use Obsidian’s provided APIs for file I/O and UI.
- Avoid blocking the main thread with heavy work; use async patterns.

## Files and structure

- Respect existing file structure and naming conventions.
- If adding files, place them alongside similar modules.

## Testing & validation

- Run available tests or build steps if present.
- At minimum, ensure `pnpm build` (or project build command) succeeds.

## Documentation

- Update README or inline docs if behavior changes.
- Keep comments short and only for complex logic.

## Communication

- If instructions are unclear, ask for clarification before making large changes.
