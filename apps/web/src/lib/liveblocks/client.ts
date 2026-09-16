import { Liveblocks } from "@liveblocks/node";

let _client: Liveblocks | null = null;

function getClient() {
  if (!_client) {
    _client = new Liveblocks({
      secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
    });
  }
  return _client;
}

export const liveblocks = new Proxy({} as Liveblocks, {
  get(_target, prop) {
    const client = getClient();
    const value = client[prop as keyof Liveblocks];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
