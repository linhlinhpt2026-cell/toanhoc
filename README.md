To deploy:

  1. Push to GitHub (if not already)
  2. Import project in Vercel (vercel.com → New Project → Import your repo)
  3. Add Environment Variables in Vercel project settings:
    - SUPABASE_URL = your Supabase project URL
    - SUPABASE_ANON_KEY = your Supabase anon key
  4. Deploy - Vercel will auto-detect and deploy

  The routing works like this:

  ┌───────────────────────────────┬────────────────────────────────┐
  │              URL              │             Serves             │
  ├───────────────────────────────┼────────────────────────────────┤
  │ /                             │ Trang chủ                      │
  ├───────────────────────────────┼────────────────────────────────┤
  │ /teacher                      │ Trang giáo viên                │
  ├───────────────────────────────┼────────────────────────────────┤
  │ /game                         │ Chơi tự do                     │
  ├───────────────────────────────┼────────────────────────────────┤
  │ /1234567890                   │ Làm bài tập                    │
  ├───────────────────────────────┼────────────────────────────────┤
  │ /config.js                    │ Serverless function (env vars) │
  ├───────────────────────────────┼────────────────────────────────┤
  │ /assets/*, /dist/*, /public/* │ Static files                   │
  └───────────────────────────────┴────────────────────────────────┘

  No build step needed on Vercel - dist/main.js is already committed. The Express server (index.js) still works for
  local dev with yarn start.