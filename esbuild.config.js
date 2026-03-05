import esbuild from "esbuild";
import { mkdirSync } from "fs";

mkdirSync("public", { recursive: true });

await esbuild.build({
  entryPoints: ["src/client-entry.js"],
  bundle: true,
  outfile: "public/mml-client.js",
  format: "iife",
  platform: "browser",
  sourcemap: true,
  minify: false,
});