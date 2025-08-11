import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { API } from "./utils/api";
import Presenter from "./Presenter";
import LogsViewer from "./common/LogsViewer";
import {
  Button,
  InlineLoading,
  InlineNotification,
  Modal,
  Tag,
  Link,
} from "carbon-components-react";
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import {
  FormData,
  ApiDataResponse,
  ApiDataItem,
  URLParams,
} from "./types/form";
import {
  isPusherConnector,
  getSocketId,
  ConnectionStatus,
  getConnectionStatusColor,
} from "./types/websocket";
import "./styles/ExternalPreviewPage.scss";

// Extend Window interface for Pusher
// Required for Laravel Echo to work
declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo<any> | undefined;
  }
}

// Ensure Pusher is available globally for Laravel Echo
if (typeof window !== "undefined" && !window.Pusher) {
  window.Pusher = Pusher;
}

// Global state for Echo instance management
let globalEchoInstance: any = null;
let globalInitializing = false;

const transformApiResponse = (apiData: ApiDataResponse): FormData => {
  return {
    form_definition: apiData.form_template,
    form_version: apiData.form_version,
    logs: apiData.logs,
    data:
      apiData.data?.items?.reduce<Record<string, string>>(
        (acc, item: ApiDataItem) => {
          if (item.id) {
            acc[item.id] = item.value || "";
          }
          return acc;
        },
        {}
      ) || {},
    metadata: {},
  };
};

const setupChannelEventBindings = (channel: any, onUpdate: () => void) => {
  try {
    if (typeof channel.bind === "function") {
      channel.bind("pusher:subscription_error", (error: any) => {
        console.error("Subscription error:", error);
      });

      if (typeof channel.bind_global === "function") {
        channel.bind_global((eventName: string) => {
          if (
            eventName === "App\\Events\\FormVersionUpdateEvent" ||
            eventName === "FormVersionUpdateEvent"
          ) {
            onUpdate();
          }
        });
      }

      channel.bind("App\\Events\\FormVersionUpdateEvent", onUpdate);
    }

    if (typeof channel.listen === "function") {
      channel.listen("FormVersionUpdateEvent", onUpdate);
      channel.listen("App\\Events\\FormVersionUpdateEvent", onUpdate);
    }
  } catch (error) {
    console.error("Error setting up channel listeners:", error);
  }
};

// Utility to select the correct websocket host based on current hostname
function getReverbWsHost() {
  const prod = import.meta.env.VITE_REVERB_PROD_HOST;
  const dev = import.meta.env.VITE_REVERB_DEV_HOST;
  const test = import.meta.env.VITE_REVERB_TEST_HOST;
  const defaultHost = import.meta.env.VITE_REVERB_HOST || "localhost";

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (dev && host.endsWith(dev)) return dev;
    if (test && host.endsWith(test)) return test;
    if (prod && host === prod) return prod;
  }
  return defaultHost;
}

const ExternalPreviewPage = () => {
  const { id } = useParams<URLParams>();
  const formVersionID = id;

  const urlParams = new URLSearchParams(window.location.search);
  const isDraft = urlParams.get("draft") === "true";

  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const echoRef = useRef<any>(null);
  const subscriptionRef = useRef<any>(null);

  const usePreMigrationFormat = true;

  // Get form data from API
  const fetchFormData = async (isRealTimeUpdate = false) => {
    try {
      if (!isRealTimeUpdate) {
        setLoading(true);
      }

      const url = `${API.getFormById}${formVersionID}/data?${
        usePreMigrationFormat ? "pre_migration=true&" : ""
      }${isDraft ? "draft=true" : ""}`.replace(/&$/, "");

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch form data: ${response.status} ${response.statusText}`
        );
      }

      const apiData = (await response.json()) as ApiDataResponse;

      if (isRealTimeUpdate) {
        setFormData((prevFormData) => {
          if (!prevFormData) return prevFormData;

          const newFormDefinition = apiData.form_template;
          const definitionChanged =
            JSON.stringify(newFormDefinition) !==
            JSON.stringify(prevFormData.form_definition);

          if (!definitionChanged) {
            return prevFormData;
          }

          return {
            ...prevFormData,
            form_definition: newFormDefinition,
            logs: apiData.logs,
          };
        });
      } else {
        const transformedData = transformApiResponse(apiData);
        setFormData(transformedData);
        setError(null);
      }
    } catch (err) {
      console.error(
        `Error fetching form data${isRealTimeUpdate ? " (real-time)" : ""}:`,
        err
      );
      if (!isRealTimeUpdate) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      }
    } finally {
      if (!isRealTimeUpdate) {
        setLoading(false);
      }
    }
  };

  // Extract connection event handlers
  const setupConnectionHandlers = (echoInstance: any) => {
    if (!isPusherConnector(echoInstance.connector)) return;

    const pusherConnection = echoInstance.connector.pusher?.connection;

    pusherConnection.bind("connected", () => {
      const socketId = getSocketId(echoInstance);
      if (socketId) {
        setConnectionStatus("connected");
      } else {
        setTimeout(() => {
          if (getSocketId(echoInstance)) {
            setConnectionStatus("connected");
          }
        }, 1000);
      }
    });

    pusherConnection.bind("disconnected", () =>
      setConnectionStatus("disconnected")
    );
    pusherConnection.bind("error", (err: any) => {
      console.error("WebSocket error:", err);
      setConnectionStatus("error");
    });
    pusherConnection.bind("unavailable", () => {
      console.warn("WebSocket unavailable");
      setConnectionStatus("error");
    });
  };

  // Initialize Laravel Echo websocket connection
  const initializeEcho = async () => {
    try {
      globalInitializing = true;
      setConnectionStatus("connecting");

      const scheme = import.meta.env.VITE_REVERB_SCHEME || "http";
      const host = getReverbWsHost();
      const portEnv = import.meta.env.VITE_REVERB_PORT;

      const isSecure = scheme === "https";
      const port = portEnv ? Number(portEnv) : undefined;

      const echoInstance = new Echo({
        broadcaster: "reverb",
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: host,
        wsPort: !isSecure ? port : undefined,
        wssPort: isSecure ? port : undefined,
        forceTLS: isSecure,
        enabledTransports: ["ws", "wss"],
        disableStats: true,
      });

      echoRef.current = echoInstance;
      globalEchoInstance = echoInstance;
      setupConnectionHandlers(echoInstance);
    } catch (error) {
      console.error("Failed to initialize Echo:", error);
      setConnectionStatus("error");
      globalEchoInstance = null;
    } finally {
      globalInitializing = false;
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (!formVersionID) {
      setError('No form ID provided. Please include an "id" query parameter.');
      setLoading(false);
      return;
    }
    fetchFormData();
  }, [formVersionID]);

  // Initialize Echo connection and handle subscriptions
  useEffect(() => {
    if (!formVersionID) return;
    if (!globalEchoInstance && !globalInitializing) {
      initializeEcho();
    } else if (globalEchoInstance || globalInitializing) {
      echoRef.current = globalEchoInstance;
      if (globalEchoInstance?.connector?.pusher?.connection?.socket_id) {
        setConnectionStatus("connected");
      }
    }

    // Set up subscription when connected
    if (echoRef.current && connectionStatus === "connected") {
      const socketId = getSocketId(echoRef.current);
      if (socketId) {
        const subscribeTimer = setTimeout(() => {
          const channelName = isDraft
            ? `draft-form-version.${formVersionID}`
            : `form-version.${formVersionID}`;

          const channel = echoRef.current.channel(channelName);
          setupChannelEventBindings(channel, () => fetchFormData(true));
          subscriptionRef.current = channel;
        }, 500);

        return () => {
          clearTimeout(subscribeTimer);
          if (echoRef.current && formVersionID && subscriptionRef.current) {
            try {
              const channelName = isDraft
                ? `draft-form-version.${formVersionID}`
                : `form-version.${formVersionID}`;
              echoRef.current.leave(channelName);
            } catch (error) {
              console.error("Error leaving channel:", error);
            }
            subscriptionRef.current = null;
          }
        };
      }
    }

    return () => {
      echoRef.current = null;
    };
  }, [formVersionID, connectionStatus, isDraft]);

  const goBack = () => {
    const url = `${API.getFormKlammURL}${formVersionID}`;
    window.location.href = url;
  };

  if (loading) {
    return (
      <div>
        <InlineLoading description="Loading form..." status="active" />
        <div>
          Klamm Connection:{" "}
          <span style={{ color: getConnectionStatusColor(connectionStatus) }}>
            {connectionStatus}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <InlineNotification kind="error" title="Error" subtitle={error} />
        <Button onClick={goBack}>Go Back</Button>
      </div>
    );
  }

  if (!formData) {
    return (
      <div>
        <InlineNotification
          kind="error"
          title="No Data"
          subtitle="No form data was returned from the API."
        />
        <Button onClick={goBack}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="preview-container">
      {isDraft && (
        <div className="draft-banner">
          🚧 DRAFT VERSION - This form is still being edited and may not reflect
          the current version.{" "}
          <Link
            href={`/preview/${formVersionID}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View the current version
          </Link>
        </div>
      )}

      <Button
        kind="ghost"
        size="small"
        onClick={() => setSidePanelOpen(true)}
        className={`info-button ${
          isDraft ? "info-button--draft" : "info-button--normal"
        }`}
      >
        <span style={{ color: getConnectionStatusColor(connectionStatus) }}>
          ●
        </span>
        Info
      </Button>
      {sidePanelOpen && (
        <>
          <Modal
            open={sidePanelOpen}
            onRequestClose={() => setSidePanelOpen(false)}
            modalHeading="Form Info"
            primaryButtonText="Close"
            onRequestSubmit={() => setSidePanelOpen(false)}
            passiveModal
            className="side-panel-modal"
          >
            <div>
              <div>
                <h4>
                  Klamm Connection Status:
                  <Tag
                    type={
                      connectionStatus === "connected"
                        ? "green"
                        : connectionStatus === "connecting"
                        ? "blue"
                        : "red"
                    }
                    size="sm"
                  >
                    {connectionStatus}
                  </Tag>
                </h4>
                <div>
                  <div className="connection-status-item">
                    <strong>Form Version:</strong>{" "}
                    <Tag type={"blue"} size="sm">
                      {formData.form_definition.version || "N/A"}
                    </Tag>
                  </div>
                  <div className="connection-status-item">
                    <strong>Form Version Status:</strong>{" "}
                    <Tag type={"blue"} size="sm">
                      {formData.form_version.status || "N/A"}
                    </Tag>
                  </div>
                  <div className="connection-status-item">
                    <strong>Last Update:</strong>{" "}
                    <Tag type="gray" size="sm">
                      {new Date().toLocaleTimeString()}
                    </Tag>
                  </div>
                </div>
              </div>
              <LogsViewer logs={formData?.logs || null} maxHeight="600px" />
            </div>
          </Modal>
        </>
      )}

      <div
        className={`content-padding ${isDraft ? "content-padding--draft" : ""}`}
      >
        <Presenter
          key={`${JSON.stringify(formData?.form_definition)}-${Date.now()}`}
          data={formData}
          mode="preview"
          goBack={goBack}
        />
      </div>
    </div>
  );
};

export default ExternalPreviewPage;
