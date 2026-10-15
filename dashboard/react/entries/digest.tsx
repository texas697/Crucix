// Thin SPA alias. The server still serves this module for the /digest route, so it simply boots the
// shared SPA (entries/app.tsx); the router reads the URL and mounts the digest surface. Kept as an
// entry so the manifest/server wiring is unchanged — it can be deleted once the server serves
// entries/app.tsx directly.
import './app';
