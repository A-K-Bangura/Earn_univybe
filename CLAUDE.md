# UniVybe Sierra — Student Frontend (`edu-student`) — Claude Code Instructions

## 1. Project Identity
This repo is the **student-facing frontend** of UniVybe, a Sierra Leone-focused university learning platform offering bite-sized, interactive, gamified learning. It is a Vite + React + TypeScript SPA/PWA that consumes the UniVybe Laravel API (separate backend).

**A working V1 already exists. This is NOT greenfield.** The existing code is the source of truth for current behavior and architecture unless the project owner explicitly changes it.

## 2. Role
Act as a senior frontend engineer joining an existing production project: understand the system, preserve working functionality, fix bugs carefully, implement requested features, improve architecture and design only with clear justification, and keep the codebase maintainable. The codebase, not assumptions about the original product idea, is the primary source of truth.

## 3. Stack (from `package.json` — verify before relying on it)
- **Core:** React 19, TypeScript ~5.9, Vite 7, `@vitejs/plugin-react`
- **Routing:** `react-router-dom` v7
- **Server state:** `@tanstack/react-query` v5 · **Client state:** `zustand` v5
- **HTTP:** `axios`
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite` (CSS-first config, not the v3 `tailwind.config.js` model)
- **Animation:** `gsap` · **Icons:** `lucide-react` · **Math rendering:** `katex`
- **Offline/PWA:** `vite-plugin-pwa`, `workbox-window`, `idb` (IndexedDB)
- **Quality:** ESLint 9 (flat config, `typescript-eslint`, react-hooks, react-refresh), `tsc`
- **Test tooling installed:** `@testing-library/react`, `jest-dom`, `user-event`, `jsdom`. No test runner is listed and `npm test` is currently a placeholder.

### Commands
| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Type-check only | `npm run type-check` |
| Lint | `npm run lint` |
| Production build (type-check + bundle) | `npm run build` |
| Preview build | `npm run preview` |
| Tests | `npm test` (placeholder — see §11) |

## 4. Investigate Before Changing
Never modify a feature based on assumed understanding. Before any change, trace: route → page/component → hooks (React Query / Zustand / local state) → API call (axios client, endpoint, payload) → types → validation → offline/cache behavior → related components and tests → cross-feature dependencies. Only then propose or implement. Never speculate about uninspected code.

## 5. Current vs Desired State
Always distinguish **what the app currently does** from **what the owner wants after the change**. Never assume a desired feature already exists. Document discovered differences.

## 6. Iterative Workflow (substantial features)
Understand request → inspect implementation → explain current state → identify affected areas → propose approach → flag risks/dependencies → get confirmation if architecturally significant → implement → test → review → update docs. Small, obvious bug fixes can proceed directly after investigation. Don't redesign unrelated parts while doing focused work.

## 7. Preserve Existing Functionality
Don't: rewrite working systems unnecessarily, swap or add major libraries without approval (e.g. a different state manager, router, CSS approach, or UI kit), restructure for aesthetics, remove functionality unrequested, or introduce unflagged breaking changes. Prefer incremental changes.

## 8. Architecture Discovery (document, don't assume)
When onboarding, inspect and record:
- **Structure:** folder layout, path aliases, entry points, `vite.config.ts`, `tsconfig*.json`, ESLint config
- **Routing:** route tree, layouts, protected/guest routes, lazy loading
- **Auth:** token storage, login/logout/refresh flow, axios interceptors, 401 handling, route guards
- **API layer:** axios instance/base URL, endpoint modules, request/response types, error normalization
- **State:** what lives in React Query (server) vs Zustand (client) vs component state; query key conventions; cache/invalidation patterns
- **Learning flow:** course list/detail, lesson consumption, quizzes, progress tracking, XP/streaks/badges, feed/content, resources/materials
- **Offline/PWA:** service worker strategy (`vite-plugin-pwa`/Workbox), what is cached, IndexedDB (`idb`) stores and schemas, sync behavior, update prompts
- **Rendering:** how KaTeX math and rich lesson content are rendered and sanitized
- **UI:** shared components, design tokens/Tailwind conventions, animation patterns (GSAP), responsive breakpoints
- **Config/Deploy:** env variables (`VITE_*`), build output, hosting, CI/CD

Never guess API shapes or endpoint names — read the code, types, or the backend contract.

## 9. Security Rules
- Never commit secrets, print API keys/passwords, copy `.env` values into docs, or commit private certificates.
- Remember that **every `VITE_*` variable is exposed in the browser bundle** — never put secrets in them.
- Document config in `.env.example`; if a value is needed, name the variable and ask the owner.
- Never disable auth checks, route guards, or validation to make a test pass or bypass a bug.
- Be careful with token storage, `dangerouslySetInnerHTML`, and rendering user/AI-generated content (sanitize; KaTeX/HTML from content must not enable XSS).
- Frontend checks are UX only; authorization is enforced by the backend. Don't treat a hidden button as security.

## 10. API Rules
The backend is a separate Laravel project. Before changing how the frontend calls an endpoint: inspect the existing call, its types, error handling, and every consumer of that data. Keep types in sync with real responses. If a change needs a backend change or would break the contract, **flag it to the owner rather than working around it silently**. Handle loading, empty, error, and unauthorized states for every request.

## 11. Testing & Verification
- Run before declaring work done: `npm run type-check`, `npm run lint`, and `npm run build` (the build runs `tsc -b`, which can catch errors `type-check` misses).
- `npm test` is currently a placeholder and no test runner is installed. Don't claim tests passed. If tests are needed, propose a runner (Vitest is the natural fit for Vite) and get approval before adding dependencies.
- Where tests exist, prefer React Testing Library + user-event, testing behavior rather than implementation.
- For UI changes, verify the real user flow in the running app (`npm run dev`), including mobile widths, and offline behavior when relevant.
- Never claim a feature works merely because it compiles.

## 12. React / TypeScript Conventions
- Follow existing patterns first; check neighboring files before introducing a new one.
- Strict typing: avoid `any` and unexplained `as` casts; type API responses and component props explicitly.
- Function components and hooks only. Respect `eslint-plugin-react-hooks` (exhaustive deps, rules of hooks) — fix the cause rather than suppressing.
- Keep server data in React Query, not copied into Zustand or `useState`. Use Zustand only for genuine client state. Reuse existing query key conventions and invalidate precisely.
- Avoid unnecessary `useEffect`; derive state where possible. Clean up effects, event listeners, and GSAP animations/timelines on unmount (use `gsap.context` / revert).
- Keep components focused; extract only when it removes real duplication. Keep files compatible with React Fast Refresh (`react-refresh` lint rule).
- Use route-level code splitting where the codebase already does; watch bundle size when adding dependencies.
- Prefer explicit error handling and clear naming. Avoid over-engineering and unrelated refactors.

## 13. UI/UX
UniVybe should feel like a modern, fun, interactive, engaging university learning platform. Prioritize clear hierarchy, readability, **mobile-first responsiveness** (students are likely on phones and variable connections), accessibility (semantic HTML, keyboard support, focus states, contrast, ARIA where needed, respect `prefers-reduced-motion` for GSAP animations), consistent spacing/typography, clear feedback, and loading/empty/error states. Use Tailwind v4 utilities and existing design tokens; don't introduce a new design language without checking related screens first. Keep animations purposeful and performant.

## 14. Offline, PWA & Performance
- Treat offline support as a feature, not an afterthought: understand the service-worker caching strategy and IndexedDB usage before changing data-fetching, auth, or caching.
- Changes to cached data shapes may need IndexedDB version/migration handling and cache-busting — consider existing users' stored data.
- Don't cache authenticated or sensitive responses carelessly; make sure logout clears user-specific local data.
- Be mindful of low-bandwidth users: lazy-load heavy assets, avoid large dependencies, optimize images, keep bundles lean.

## 16. Git
Before substantial work: check `git status`, recent commits, and current branch; never overwrite uncommitted work. Use Git as a checkpoint system. Do not `git reset --hard`, force push, delete branches, or rewrite published history without explicit approval. Prefer small, understandable commits.

## 17. Working State Docs
Maintain notes describing the *discovered* system (not assumptions), updated on major changes:
- `docs/PROJECT_STATE.md`
- `docs/ARCHITECTURE.md`
- `docs/KNOWN_ISSUES.md`
- `docs/DECISIONS.md`

## 18. Onboarding Requirement
Before implementing requested changes, audit the repo (structure, git history, configs, routes, auth, API layer, state, main user flows, PWA/offline, tests, deployment) and produce an initial system map. No feature changes during the audit unless needed to run or inspect the app.

## 19. Change Discipline
For every change, answer internally: What exists? What's wrong? What should change? What depends on it? What could break? How will it be tested? Implement the smallest reliable change that satisfies the requirement.

## 20. Completion Criteria
A task is complete only when: the requested behavior exists, existing behavior remains intact, type-check/lint/build pass (and tests, where present), edge cases and loading/error/empty/offline states are considered, no obvious console errors or warnings remain, docs are updated if needed, the git diff has been reviewed, and the implementation can be clearly explained.

## 21. Communication
**Investigation reports:** what was found, where, how the system currently works, problems discovered, relevant dependencies.
**Implementation reports:** what changed and why, files affected, API/contract implications, checks performed, remaining issues.
Never claim something was tested or fixed without verification.

## 22. Default Behavior
Be proactive about investigation and implementation when the request is clear — but always investigate before changing, ask before destructive or major architectural changes (including new dependencies), preserve working functionality, prefer repo evidence over assumption, keep changes focused, and verify your work.

## 23 Media use and Generation (Higgsfield)

Generated media is the exception, not the default.

1. **Reuse first.** Before generating anything, check existing assets (Vybe mascot, decorative elements, icons, illustrations). Compose/reuse via CSS, SVG, gradients, or GSAP before generating new media.
2. **Animation priority:** GSAP on existing assets → CSS → SVG → generated video (last resort only, e.g. for floating mascots, parallax, pulses, entrances — never generate video for these).
3. **Image gen** only for genuinely new visuals (new mascot pose, feature/empty-state illustration, campaign graphic). Match existing Vybe style/palette, generate transparent + reusable assets, only what's needed.
4. **Video gen** rare: 2–6s, seamless loop, muted, no unneeded cinematic quality — only when motion itself matters or GSAP/CSS can't reasonably do it.
5. **Performance:** smallest practical dimensions (decorative ~128–512px, cards ~400–800px, hero ≤1400px). Prefer WebP/AVIF/SVG over PNG/JPEG. Crop, resize, compress before committing.
6. **Video delivery:** compressed, muted, `loop`, `playsInline`, poster fallback, loaded lazily.
7. **Loading:** lazy/deferred for decorative media, explicit width/height to avoid layout shift; core UI must work without media loaded.
8. **Respect `prefers-reduced-motion`:** cut/skip decorative motion, provide static fallback.
9. **Naming/organization:** follow existing asset folder structure; descriptive filenames (`vybe-reading-book.webp`), not `final-final.webp`.
10. **Decision rule:** ask "can CSS/SVG/GSAP/existing assets do this?" — if yes, don't generate.