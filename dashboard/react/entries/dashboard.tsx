// Thin SPA alias. The server still serves this module for the dashboard route, so it simply boots the
// shared SPA (entries/app.tsx); the router decides which surface to render from the URL. Kept as an
// entry so the manifest/server wiring is unchanged — the server can later point at entries/app.tsx
// directly and this file can be deleted.
import './app';
