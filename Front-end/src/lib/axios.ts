import axios from "axios";

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL, // ex: http://localhost:4000
    withCredentials: true,
});

export default axiosInstance;
