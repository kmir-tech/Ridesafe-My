# RideSafe MY

RideSafe MY is a Malaysia-first motorcycle weather and route safety app. The product helps riders quickly understand rain, temperature, route conditions, and overall ride safety before they leave, with community hazard reporting layered in as a secondary feature.

## Beta Scope

### Core
- Map-based route weather and safety checking anywhere in Malaysia
- Weather safety score backed by real weather signals
- Heatmap for quick area-level safety scanning

### Secondary
- Community hazard reporting and confirmation
- Push alerts for saved routes
- Ride logs and account sync

### Experimental
- AI riding advisor

## Beta Success Metric

A rider can open the app on mobile, place a route start and end point anywhere in Malaysia, and understand whether it is safe to ride in under 10 seconds.

## Product Principles

- Weather comes first: rain, temperature, and route conditions should be more prominent than the abstract score.
- Malaysia-first and Malaysia-forever: the product is built specifically for Malaysian motorcycle riders.
- Map-first UX: the map should feel like the product, not a supporting widget.
- Hazards stay visible, but they remain secondary to weather and route safety.

## Current Stack

- Next.js 16
- React 19
- TypeScript
- Supabase
- Upstash Redis
- Leaflet / React Leaflet
- Web Push
- Open-Meteo and OpenStreetMap services

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
Copy-Item .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

4. Run lint:

```bash
npm run lint
```

## Environment Variables

See [.env.example](C:/Users/User/ridesafe-my/.env.example) for the full template. The main integrations are:

- Supabase
- Upstash Redis
- VAPID keys for push notifications
- Anthropic for the experimental AI advisor
- Cron secret for scheduled checks

## Near-Term Priorities

1. Support true draggable route anchors anywhere in Malaysia.
2. Remove dependence on the 12 fixed city presets for route selection.
3. Make raw weather and route conditions more prominent than the safety score.
4. Stabilize the beta UX on mobile and clean up lint/runtime issues.
