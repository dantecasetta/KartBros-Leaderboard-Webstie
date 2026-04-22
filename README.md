# Kart Bros Leaderboard

A simple Kart Bros leaderboard built with Next.js and ready for Vercel deployment.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Deploy to Vercel

1. Create a new GitHub repository.
2. Upload these files.
3. Push to GitHub.
4. Go to Vercel.
5. Import the GitHub repository.
6. Click deploy.

## Update leaderboard data

Edit:

```text
data/leaderboard.js
```

Add tracks and player times later in `data/leaderboard.js`.

```javascript
export const leaderboardData = {};
```

## Bookmarklet import

The site supports imports from a bookmarklet using a URL like this:

```text
https://your-site-url/?payload=...
```

When a player arrives with a payload:

* the payload is decoded
* the player's times are merged into the leaderboard
* the result is saved in browser local storage
* the URL is cleaned after import

This means the leaderboard is stored per browser unless you later connect it to a database.