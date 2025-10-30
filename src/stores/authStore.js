import { defineStore } from "pinia";
import { reactive, ref } from "vue";
import { setAuth } from "../service/apiService";

export const useAuthStore = defineStore("auth", () => {
    // --- Estado ---
    const credentials = reactive({
        username: "",
        password: "",
        saved: false,
    });

    const token = ref(null);
    const tokenExpiry = ref(null);
    const connectionStatus = reactive({});
    const batchConfig = reactive({
        tokenRefreshThreshold: 1200, // 20 minutos antes de expirar
    });

    const formParams = reactive({
        username: "",
        password: "",
        apiUrl1: "https://tu-api.com", // ⚠️ Reemplazá por tu endpoint real
    });

    // --- Guardar credenciales ---
    function saveCredentials(userData) {
        credentials.username = userData.username;
        credentials.password = userData.password;
        credentials.saved = true;
        setAuth(userData.username, userData.password);
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
                return { access_token: token.value };
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
            token.value = data.access_token;
            tokenExpiry.value = Date.now() + (data.expires_in || 3600) * 1000;
            credentials.saved = true;

            console.log(
                `✅ Token renovado - Expira: ${new Date(
                    tokenExpiry.value
                ).toLocaleString()}`
            );

            return data;
        } catch (error) {
            console.error("❌ Error en login:", error);
            token.value = null;
            tokenExpiry.value = null;
            credentials.saved = false;
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
        connectionStatus,
        saveCredentials,
        testConnection,
        login,
        isTokenExpiring,
    };
});
