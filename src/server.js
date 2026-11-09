import { createBridgeHttpServer } from './http-server.js';

const value = process.env.SERVER_PORT || process.env.PORT || '3000';
const port = Number(value);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('SERVER_PORT must be a TCP port number between 1 and 65535.');
}
const host = process.env.HOST || '0.0.0.0';
const server = createBridgeHttpServer({ apiToken: process.env.BRIDGE_API_TOKEN || '' });
server.listen(port, host, () => {
  console.log('Bridge Music service listening; Radio source unavailable until live verification.');
});
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
