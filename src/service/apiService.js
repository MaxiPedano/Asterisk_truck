import axios from "axios";

const api = axios.create({
  baseURL: "https://api.flowsma.com/donandres", // Cambiá esto
});
export function setToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}
export function setAuth(username, password) {
  api.defaults.auth = { username, password };
}

export async function fetchData(endpoint) {
  return api.get(endpoint);
}

export async function postData(endpoint, data) {
  return api.post(endpoint, data);
}

export default api;
