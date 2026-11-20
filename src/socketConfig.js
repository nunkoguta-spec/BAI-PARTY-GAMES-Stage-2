// Shared Socket.IO endpoint for host panel and phone controllers.
// Set VITE_SERVER_URL on the frontend hosting provider to the deployed server URL.
const configuredServerUrl = import.meta.env.VITE_SERVER_URL?.trim();

export const SOCKET_SERVER_URL =
  configuredServerUrl ||
  `${window.location.protocol}//${window.location.hostname}:3001`;
