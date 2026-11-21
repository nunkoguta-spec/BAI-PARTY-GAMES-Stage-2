// Shared Socket.IO endpoint for host panel and phone controllers.
// Development: Vite runs on 5173 while the multiplayer server runs on 3001.
// Production home-server: Express serves dist and Socket.IO on the same origin.
const configuredServerUrl = import.meta.env.VITE_SERVER_URL?.trim();

export const SOCKET_SERVER_URL =
  configuredServerUrl ||
  (import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : window.location.origin);
