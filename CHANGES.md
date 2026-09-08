# Recent changes

## Fixed: Rooms page API 404

The frontend API base URL now adapts to how the page is opened:

- When the application is served by Express at `http://localhost:5000`, it uses the existing relative `/api` routes.
- When the client is opened through VS Code Live Server (for example, `http://127.0.0.1:5500`), it sends API requests to `http://localhost:5000/api`.

This prevents the Rooms page from requesting `http://127.0.0.1:5500/api/rooms`, which caused the 404 error. The Node/Express server must still be running from the `server` folder (`npm start`).

## Added: Render production deployment

- Added `render.yaml`, which deploys the Node.js web app to Render in Singapore.
- The app now supports TiDB Cloud Starter, a MySQL-compatible database with a free quota, through configurable port and TLS settings.
- Added `GET /api/health`, which checks the application can connect to MySQL before Render marks the web service healthy.
- Added `.gitignore` so local database credentials and dependencies are not committed.
