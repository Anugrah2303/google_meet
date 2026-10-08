// STUN helps browsers discover their public address.
// TURN relays media when a direct connection is impossible.
export function getIceServers() {
  const servers = [{ urls: process.env.STUN_SERVER_URL || "stun:stun.l.google.com:19302" }];

  if (process.env.TURN_SERVER_URL) {
    servers.push({
      urls: process.env.TURN_SERVER_URL,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_PASSWORD,
    });
  }

  return servers;
}
