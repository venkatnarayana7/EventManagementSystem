(function () {
  const config = window.EMS_CONFIG || {};
  const storageKey = "ems.auth.tokens";
  const wsUrl = config.realtimeWsUrl || "";
  const listeners = new Set();
  const subscriberRegistry = window._emsRealtimeSubscribers || {};
  const state = {
    socket: null,
    portal: null,
    reconnectTimer: null,
    reconnectDelay: 1000
  };

  window._emsRealtimeSubscribers = subscriberRegistry;
  window._emsWsStatus = "disconnected";

  window.onRealtimeMessage = function (messageType, callbackFn) {
    const key = String(messageType || "*");
    if (!subscriberRegistry[key]) {
      subscriberRegistry[key] = [];
    }
    subscriberRegistry[key].push(callbackFn);
    return function () {
      window.offRealtimeMessage(key, callbackFn);
    };
  };

  window.offRealtimeMessage = function (messageType, callbackFn) {
    const key = String(messageType || "*");
    if (!subscriberRegistry[key]) {
      return;
    }
    subscriberRegistry[key] = subscriberRegistry[key].filter(function (fn) {
      return fn !== callbackFn;
    });
  };

  function loadTokens(portal) {
    const keys = [];
    const normalizedPortal = String(portal || "").toLowerCase();
    if (normalizedPortal) {
      keys.push(storageKey + "." + normalizedPortal);
    }
    keys.push(storageKey);

    for (const key of keys) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          return JSON.parse(raw);
        }
      } catch (_error) {
        // try next key
      }
    }

    return null;
  }

  function decodeJwt(token) {
    const parts = String(token || "").split(".");
    if (parts.length < 2) {
      return null;
    }
    try {
      return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    } catch (_error) {
      return null;
    }
  }

  function getClaims() {
    const tokens = loadTokens(state.portal);
    return decodeJwt(tokens && (tokens.idToken || tokens.accessToken));
  }

  function notify(message) {
    listeners.forEach(function (listener) {
      try {
        listener(message);
      } catch (error) {
        console.error("[EMS Realtime Listener Error]", error);
      }
    });
  }

  function dispatchSubscribers(message) {
    const type = String(message && (message.type || message.action) || "");
    const payload = message && message.data ? message.data : message;
    if (type && Array.isArray(subscriberRegistry[type])) {
      subscriberRegistry[type].forEach(function (listener) {
        try {
          listener(payload);
        } catch (error) {
          console.error("[EMS Realtime Subscriber Error]", { type: type, error: error });
        }
      });
    }

    if (Array.isArray(subscriberRegistry["*"])) {
      subscriberRegistry["*"].forEach(function (listener) {
        try {
          listener(message);
        } catch (error) {
          console.error("[EMS Realtime Subscriber Error]", { type: "*", error: error });
        }
      });
    }
  }

  function buildUrl(portal) {
    const claims = getClaims() || {};
    const url = new URL(wsUrl);
    url.searchParams.set("portal", portal || "unknown");
    url.searchParams.set("user_id", String(claims.sub || claims["cognito:username"] || "anonymous"));
    url.searchParams.set("event_id", "global");
    return url.toString();
  }

  function scheduleReconnect() {
    window.clearTimeout(state.reconnectTimer);
    state.reconnectTimer = window.setTimeout(function () {
      state.reconnectDelay = Math.min(state.reconnectDelay * 2, 15000);
      connect(state.portal);
    }, state.reconnectDelay);
  }

  function connect(portal) {
    if (!wsUrl) {
      return;
    }
    if (state.socket && (state.socket.readyState === WebSocket.OPEN || state.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    state.portal = portal || state.portal || "unknown";
    try {
      state.socket = new WebSocket(buildUrl(state.portal));
      state.socket.onopen = function () {
        state.reconnectDelay = 1000;
        window._emsWsStatus = "connected";
        document.dispatchEvent(new CustomEvent("ems-ws-connected"));
      };
      state.socket.onmessage = function (event) {
        try {
          const message = JSON.parse(event.data);
          notify(message);
          dispatchSubscribers(message);
        } catch (error) {
          console.error("[EMS Realtime Parse Error]", error);
        }
      };
      state.socket.onclose = function (event) {
        window._emsWsStatus = "disconnected";
        document.dispatchEvent(new CustomEvent("ems-ws-disconnected"));
        if (event.code !== 1000) {
          scheduleReconnect();
        }
      };
      state.socket.onerror = function () {
        if (state.socket) {
          state.socket.close();
        }
      };
    } catch (error) {
      console.error("[EMS Realtime Connect Error]", error);
      scheduleReconnect();
    }
  }

  function ensureConnection(portal) {
    state.portal = portal || state.portal || "unknown";
    connect(state.portal);
  }

  function onMessage(listener) {
    listeners.add(listener);
    return function () {
      listeners.delete(listener);
    };
  }

  window.EMS_REALTIME = {
    ensureConnection: ensureConnection,
    onMessage: onMessage
  };
})();
