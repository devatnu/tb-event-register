# TB Event Register

Event registration and ID card generator for True Balance internal events — hackathons, parties, and competitions.

## Features

- Browse upcoming events
- Hackathon team registration (2–8 members) with employee ID dedup
- Party / individual registration
- Auto-generated downloadable ID cards (PNG)
- Card lookup by ID
- Create new events

## Tech

Vanilla JS + HTML Canvas — no build step. Data stored in [Supabase](https://supabase.com).

## Run locally

```bash
python3 serve.py
# open http://localhost:3456
```

## Deploy

Hosted on Vercel as a static site. Push to `main` to trigger a deploy.
