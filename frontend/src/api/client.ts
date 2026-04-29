import axios from "axios";

const client = axios.create({
  baseURL: "/api",
  timeout: 120000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    const msg = err.response?.data?.detail || err.message || "网络错误";
    return Promise.reject(new Error(msg));
  }
);

export default client;
