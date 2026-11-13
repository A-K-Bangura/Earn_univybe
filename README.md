# UniVybe Earn

React/TypeScript PWA for opportunities, student gigs and community. Target host: earn.univybesl.com. Shares existing UniVybe accounts/API; separate sign-in is intentional. Only this repository is the Earn implementation target.

## Development

Use the existing installed dependencies, then run npm run dev. API configuration reads VITE_API_URL, falling back to VITE_BASE_DEV_URL. Preserve the existing backend contracts. Never put credentials in VITE variables. The environment and hosting proxy were not changed during this implementation.

Validation: npm run type-check, npm run lint, npm test, npm run build. Icon regeneration: npm run icons:generate. The PWA manifest has one authority: pwa-manifest.json.

## Routes

Discover, Opportunities, Gigs, Feed and Profile are independent destinations. Legacy /feed/opportunities and /feed/gigs routes redirect to canonical routes. Removed learning URLs show a user-initiated handoff to https://univybesl.com without forwarding query parameters.

## Release gate

Local backend source implements a narrower unlimited Feed exemption than the department-only product requirement: no enrollment AND no published department/faculty/university-scope courses. Earn trusts server unlimited/remaining responses and coded FEED_LOCKED errors; it does not bypass authorization. The broader exemption needs backend review before release. See docs/PHASE2_IMPLEMENTATION.md for verification, file changes and release checklist. Copied student API/history documents remain reference material; the Phase 2 report describes the Earn application.
