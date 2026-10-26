import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import svgr from "vite-plugin-svgr";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    const isDev = mode === "development";
    const host = env.VITE_DEV_HOST || "localhost";
    const port = parseInt(env.VITE_DEV_PORT || "5173", 10);
    const dirname = import.meta.dirname;

    return {
        plugins: [react(), svgr()],
        resolve: {
            alias: {
                "@components": path.resolve(dirname, "./src/components"),
                "@pages": path.resolve(dirname, "./src/pages"),
                "@hooks": path.resolve(dirname, "./src/hooks"),
                "@services": path.resolve(dirname, "./src/services"),
                "@utils": path.resolve(dirname, "./src/utils"),
                "@auth": path.resolve(dirname, "./src/auth"),
                "@contexts": path.resolve(dirname, "./src/contexts"),
                "@assets": path.resolve(dirname, "./src/assets"),
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
