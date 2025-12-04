// Maintenance.dal.ts
import { System } from "aquario-models";

const WS_URL = `ws://${process.env.REACT_APP_API_HOST}:3001`;

let socket: WebSocket | null = null;
// queue messages until the socket is open
const sendQueue: any[] = [];
// all registered message handlers
const callbacks: ((evt: MessageEvent<any> & System.Update) => void)[] = [];

/**
 * Call this once on app start (or before you ever send/receive)
 * to bring up the socket (and keep it up).
 * @returns the active WebSocket instance
 */
export function initWebSocket(): WebSocket {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    connect();
  }
  return socket!;
}

function connect() {
  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log("[WS] Connected");
    // flush any queued messages
    while (sendQueue.length) {
      socket!.send(JSON.stringify(sendQueue.shift()));
    }
  };

  socket.onmessage = (event) => {
    // dispatch to all listeners
    callbacks.forEach((cb) => cb(event as MessageEvent<any> & System.Update));
  };

  socket.onclose = (ev) => {
    console.warn(`[WS] Disconnected (code=${ev.code}), reconnecting in 2s…`);
    // try to reconnect after a delay
    setTimeout(connect, 2000);
  };

  socket.onerror = (err) => {
    console.error("[WS] Error", err);
    // ensure we close and trigger a reconnect
    socket?.close();
  };

  // optional keep‑alive ping every 30s
  const pingInterval = setInterval(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: "ping" }));
    } else if (socket?.readyState === WebSocket.CLOSED) {
      clearInterval(pingInterval);
    }
  }, 30_000);
}

/**
 * Register a callback to receive every WS message.
 */
export function onMessage(
  cb: (evt: MessageEvent<any> & System.Update) => void
) {
  callbacks.push(cb);
}

/**
 * Send a message — it will be queued if the socket isn't open yet.
 */
export function sendMessage(msg: System.Request | System.Update | any) {
  const payload = JSON.stringify(msg);
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(payload);
  } else {
    console.warn("[WS] Not open, queuing message", msg);
    sendQueue.push(msg);
  }
}

// convenience wrappers
export const runWaterChange = async ({
  tank_id,
}: {
  tank_id?: string | number;
}) => {
  sendMessage({
    action: System.ServiceRequest.START_WATER_CHANGE,
    data: { tank_id },
  });
};

export const fillTank = async ({ tank_id }: { tank_id?: string | number }) => {
  sendMessage({
    action: System.ServiceRequest.START_FILL_TANK,
    data: { tank_id },
  });
};

export const drainTank = async ({ tank_id }: { tank_id?: string | number }) => {
  sendMessage({
    action: System.ServiceRequest.START_DRAIN_TANK,
    data: { tank_id },
  });
};

// Cancel / reset state
export const reset = async ({ tank_id }: { tank_id?: string | number }) => {
  sendMessage({ action: System.ServiceRequest.RESET_STATE, data: { tank_id } });
};

export const fillReservoir = async ({
  res_id,
}: {
  res_id?: string | number;
}): Promise<void> => {
  sendMessage({
    action: System.ServiceRequest.START_FILL_RESERVOIR,
    data: { res_id },
  });
};

// You can also expose convenience getters if you need them:
export let serviceStatus = System.State.IDLE;
export let waterChangeInProgress = false;
