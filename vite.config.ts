import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

function ignoreChromeProbePaths(): Plugin {
  return {
    name: "ignore-chrome-probe-paths",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/.well-known/")) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end("{}");
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), ignoreChromeProbePaths(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
});
