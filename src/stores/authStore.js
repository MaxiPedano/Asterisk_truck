import { defineStore } from "pinia";
import { reactive } from "vue";
import { setAuth, fetchData } from "../service/apiService";

export const authStore = defineStore("auth", () => {
    const credentials = reactive({
        username: "",
        password: "",
        saved: false,
    });

    function saveCredentials(userData) {
        credentials.username = userData.username;
        credentials.password = userData.password;
        credentials.saved = true;
        setAuth(userData.username, userData.password);
    }

    async function testConnection() {
        try {
            const res = await fetchData("/test");
            console.log("Conexión exitosa:", res.data);
            return true;
        } catch (err) {
            console.error("Error al conectar:", err);
            return false;
        }
    }

    return { credentials, saveCredentials, testConnection };
});