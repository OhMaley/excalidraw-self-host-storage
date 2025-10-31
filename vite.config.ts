import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    const isDev = mode === "development";
    const host = env.VITE_DEV_HOST || "localhost";
    const port = parseInt(env.VITE_DEV_PORT || "5173", 10);

    return {
        plugins: [react()],
        resolve: {
            alias: {
                "@components": path.resolve(__dirname, "./src/components"),
                "@pages": path.resolve(__dirname, "./src/pages"),
                "@hooks": path.resolve(__dirname, "./src/hooks"),
                "@services": path.resolve(__dirname, "./src/services"),
            },
        },
        server: {
            host: host,
            port: port,
            open: true,
        },
        build: {
            sourcemap: isDev,
            minify: isDev ? false : "esbuild",
            outDir: "dist",
            target: "esnext",
        },
        define: {
            __APP_ENV__: JSON.stringify(env.APP_ENV),
        },
    };
});
