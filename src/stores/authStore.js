import { defineStore } from "pinia";
import { reactive, ref } from "vue";
import { setToken } from "../service/apiService";

export const useAuthStore = defineStore("auth", () => {
  // --- Cargar desde localStorage al inicializar ---
  const savedCredentials = localStorage.getItem("auth_credentials");
  const savedToken = localStorage.getItem("auth_token");
  const savedTokenExpiry = localStorage.getItem("auth_token_expiry");
  const savedUserData = localStorage.getItem("auth_user_data");

  // --- Estado ---
  const credentials = reactive({
    username: savedCredentials ? JSON.parse(savedCredentials).username : "",
    password: savedCredentials ? JSON.parse(savedCredentials).password : "",
    saved: !!savedCredentials,
  });

  const token = ref(savedToken || null);
  const tokenExpiry = ref(savedTokenExpiry ? parseInt(savedTokenExpiry) : null);

  // Datos del usuario logueado
  const userData = reactive({
    id: null,
    perfilid: null,
    username: null,
    roles: [],
    ...(savedUserData ? JSON.parse(savedUserData) : {})
  });

  const connectionStatus = reactive({});
  const batchConfig = reactive({
    tokenRefreshThreshold: 1200, // 20 minutos antes de expirar
  });

  const formParams = reactive({
    username: credentials.username,
    password: credentials.password,
    apiUrl1: "https://api.flowsma.com/donandres",
  });

  // Restaurar token en axios si hay token guardado y aún es válido
  if (savedToken && savedTokenExpiry && parseInt(savedTokenExpiry) > Date.now()) {
    setToken(savedToken);
    console.log('🔄 Token restaurado desde localStorage');
  }

  // --- Guardar credenciales ---
  function saveCredentials(userCredentials) {
    credentials.username = userCredentials.username;
    credentials.password = userCredentials.password;
    credentials.saved = true;

    // IMPORTANTE: Actualizar formParams
    formParams.username = userCredentials.username;
    formParams.password = userCredentials.password;

    // Guardar en localStorage
    localStorage.setItem(
      "auth_credentials",
      JSON.stringify({
        username: userCredentials.username,
        password: userCredentials.password,
      })
    );
  }

  // --- Guardar datos de usuario ---
  function saveUserData(data) {
    userData.id = data.id;
    userData.perfilid = data.perfilid;
    userData.username = data.username;
    userData.roles = data.roles || [];

    // Guardar en localStorage
    localStorage.setItem(
      "auth_user_data",
      JSON.stringify({
        id: data.id,
        perfilid: data.perfilid,
        username: data.username,
        roles: data.roles,
      })
    );
  }

  // --- Limpiar credenciales ---
  function clearCredentials() {
    credentials.username = "";
    credentials.password = "";
    credentials.saved = false;
    token.value = null;
    tokenExpiry.value = null;

    // Limpiar datos de usuario
    userData.id = null;
    userData.perfilid = null;
    userData.username = null;
    userData.roles = [];

    // Limpiar localStorage
    localStorage.removeItem("auth_credentials");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_token_expiry");
    localStorage.removeItem("auth_user_data");

    // Eliminar token de Axios
    setToken(null);
  }

  // --- Verifica si el token está por expirar ---
  function isTokenExpiring() {
    if (!tokenExpiry.value) return true;
    const now = Date.now();
    const timeToExpiry = tokenExpiry.value - now;
    const thresholdMs = batchConfig.tokenRefreshThreshold * 1000;
    return timeToExpiry < thresholdMs;
  }

  // --- Login (renueva token si hace falta) ---
  async function login(forceRenew = false) {
    try {
      if (token.value && !isTokenExpiring() && !forceRenew) {
        return {
          access_token: token.value,
          id: userData.id,
          perfilid: userData.perfilid,
          username: userData.username,
          roles: userData.roles
        };
      }

      if (!formParams.username || !formParams.password) {
        throw new Error("Usuario y contraseña son requeridos");
      }

      console.log("🔄 Renovando token...");
      const response = await fetch(`${formParams.apiUrl1}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formParams.username,
          password: formParams.password,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`${response.status} - ${text || "Login fallido"}`);
      }

      const data = await response.json();

      // Guardar token
      token.value = data.access_token;
      tokenExpiry.value = Date.now() + (data.expires_in || 3600) * 1000;
      credentials.saved = true;

      // Guardar token localmente
      localStorage.setItem("auth_token", data.access_token);
      localStorage.setItem("auth_token_expiry", tokenExpiry.value.toString());

      // Guardar datos del usuario
      saveUserData({
        id: data.id,
        perfilid: data.perfilid,
        username: data.username,
        roles: data.roles,
      });

      // 👉 Establecer token en Axios
      setToken(data.access_token);

      console.log(
        `✅ Token renovado - Usuario: ${data.username} (ID: ${data.id}) - Expira: ${new Date(
          tokenExpiry.value
        ).toLocaleString()}`
      );

      return data;
    } catch (error) {
      console.error("❌ Error en login:", error);
      token.value = null;
      tokenExpiry.value = null;
      credentials.saved = false;

      // Limpiar datos de usuario
      userData.id = null;
      userData.perfilid = null;
      userData.username = null;
      userData.roles = [];

      // Limpiar todo en caso de error
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_token_expiry");
      localStorage.removeItem("auth_user_data");

      // Eliminar token de Axios
      setToken(null);

      throw error;
    }
  }

  // --- Test de conexión ---
  async function testConnection() {
    try {
      const loginData = await login(true);
      connectionStatus.success = true;
      connectionStatus.message = "Conexión exitosa - Token válido";
      connectionStatus.hasToken = !!loginData.access_token;
      connectionStatus.userId = loginData.id;
      connectionStatus.username = loginData.username;
      connectionStatus.roles = loginData.roles;
      connectionStatus.tokenExpiry = tokenExpiry.value
        ? new Date(tokenExpiry.value).toLocaleString()
        : null;
      connectionStatus.timestamp = new Date().toLocaleString();

      console.log("✅", connectionStatus);
      return connectionStatus;
    } catch (error) {
      connectionStatus.success = false;
      connectionStatus.message = "Error de conexión";
      connectionStatus.error = error.message || String(error);
      connectionStatus.timestamp = new Date().toLocaleString();

      console.error("❌", connectionStatus);
      throw error;
    }
  }

  return {
    credentials,
    formParams,
    token,
    tokenExpiry,
    userData,
    connectionStatus,
    saveCredentials,
    saveUserData,
    clearCredentials,
    testConnection,
    login,
    isTokenExpiring,
  };
});