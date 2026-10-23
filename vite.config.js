import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Em desenvolvimento (npm run dev) o Vite não executa a pasta /api como a Vercel faz.
// Este plugin serve /api/planilha localmente, usando as variáveis do .env.local.
function apiLocal(env) {
  return {
    name: "api-local",
    configureServer(server) {
      Object.assign(process.env, env);
      server.middlewares.use("/api/planilha", async (req, res) => {
        res.status = (c) => { res.statusCode = c; return res; };
        res.json = (o) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); };
        try {
          const mod = await server.ssrLoadModule("/api/planilha.js");
          await mod.default(req, res);
        } catch (e) {
          console.error(e);
          res.status(500).json({ error: "server_error" });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return { plugins: [react(), apiLocal(env)] };
});
