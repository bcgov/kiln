// Type guard for Pusher connector
export const isPusherConnector = (
  connector: any
): connector is { pusher: any } => {
  return connector && typeof connector.pusher !== "undefined";
};

// Get pusher connection
export const getPusherConnection = (echoInstance: any) => {
  if (!echoInstance?.connector || !isPusherConnector(echoInstance.connector)) {
    return null;
  }
  return echoInstance.connector.pusher?.connection;
};

// Get socket ID
export const getSocketId = (echoInstance: any): string | null => {
  const connection = getPusherConnection(echoInstance);
  return connection?.socket_id || null;
};

// Connection status type
export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

// Connection status color mapping
export const getConnectionStatusColor = (status: ConnectionStatus): string => {
  switch (status) {
    case "connected":
      return "#24a148";
    case "connecting":
      return "#f1c21b";
    case "disconnected":
      return "#da1e28";
    case "error":
      return "#da1e28";
    default:
      return "#8a3ffc";
  }
};
