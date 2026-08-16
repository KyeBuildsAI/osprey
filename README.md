# Osprey

An AI-native incident command room for extreme-weather operations.

Osprey helps specialist agents and human incident commanders build a shared
operational picture, challenge uncertain evidence, compare courses of action,
and retain human approval over consequential decisions.

## Current milestone

The repository currently contains the first command-room vertical slice:

- incident overview and severity
- operational risk map
- specialist-agent status
- evidence and change timeline
- human decision review

The current incident is representative demonstration data. Durable incident
state, Temporal orchestration, live data sources, and Python weather analysis
will be introduced in later milestones.

## Development

```bash
npm install
npm run dev
```

Run the production checks with:

```bash
npm test
```
