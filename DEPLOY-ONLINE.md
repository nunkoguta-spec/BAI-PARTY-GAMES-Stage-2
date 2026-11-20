BAI PARTY GAMES — DEPLOY ONLINE (VERCEL + RENDER)
================================================

This package is prepared for a split deployment:
- Vercel: serves the Vite frontend (host panel, TV page, phone controller).
- Render: runs the Node.js + Socket.IO multiplayer server.

WHAT WAS UPDATED
----------------
- Host panel and phone controller now share src/socketConfig.js.
- Both connect to VITE_SERVER_URL when configured.
- Local development still falls back to the current hostname on port 3001.
- Server reads PORT from the hosting provider and CLIENT_URL for CORS.
- Added `npm start` for the Render start command.
- There were two app Socket.IO connection sites (host panel and phone controller);
  both have been switched to the shared URL.

DEPLOY RENDER FIRST
-------------------
1. Push this project folder to a GitHub repository.
2. In Render, create a new Web Service and connect that repository.
3. Set Root Directory to `BAI-PARTY-GAMES-Stage-2-main` if the repository
   contains this folder inside another folder. If this folder is the repository
   root, leave Root Directory blank.
4. Runtime: Node.
5. Build Command: `npm ci`
6. Start Command: `npm start`
7. Add environment variable:
   NODE_ENV = production
8. Deploy. Copy the Render service URL, e.g.
   https://bai-party-games-server.onrender.com
9. Check:
   https://YOUR-RENDER-URL/health
   It should return a JSON health response.

DEPLOY VERCEL SECOND
--------------------
1. In Vercel, import the same GitHub repository.
2. Set the same Root Directory as above.
3. Framework preset: Vite.
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Add environment variable:
   VITE_SERVER_URL = https://YOUR-RENDER-URL
   (Use the actual Render URL, no trailing slash.)
7. Deploy and copy the Vercel URL, e.g.
   https://bai-party-games.vercel.app

FINAL CORS CONFIGURATION
------------------------
1. Return to Render > your service > Environment.
2. Add:
   CLIENT_URL = https://YOUR-VERCEL-URL
   (Use the actual Vercel URL, no trailing slash.)
3. Save changes and redeploy/restart the Render service.

PLAY
----
- Open the Vercel URL on the host/TV browser.
- Open the phone controller URL from the host panel / QR code on each phone.
- All devices must use the same deployed Vercel frontend URL.
- Do not use localhost on phones or TVs for the online version.

NOTES
-----
- Render free services may sleep when idle; the first connection after inactivity
  can take a little longer while the server wakes up.
- Keep VITE_SERVER_URL set on Vercel. It is embedded into the frontend at build
  time; redeploy Vercel after changing it.
- Keep CLIENT_URL set on Render to the exact deployed frontend origin.
- This is a deployment-ready configuration, but a real internet multiplayer
  smoke test is still needed after deployment (host + TV + at least two phones).
