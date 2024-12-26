import { rimraf } from "rimraf";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { execSync } from "node:child_process";

// Read version from package.json
const pkg = JSON.parse(await readFile("package.json"));
process.env.ULTRAVIOLET_VERSION = pkg.version;

const isDevelopment = process.argv.includes("--dev");

// Clean up previous build
await rimraf("dist");
await mkdir("dist");

// Don't compile these files, just copy them
await copyFile("src/sw.js", "dist/sw.js");
await copyFile("src/uv.config.js", "dist/uv.config.js");

// Configure the esbuild process
let builder = await build({
    platform: "browser",
    sourcemap: true,
    minify: !isDevelopment,
    entryPoints: {
        "uv.bundle": "./src/rewrite/index.js",
        "uv.client": "./src/client/index.js",
        "uv.handler": "./src/uv.handler.js",
        "uv.sw": "./src/uv.sw.js",
    },
    define: {
        "process.env.ULTRAVIOLET_VERSION": JSON.stringify(process.env.ULTRAVIOLET_VERSION),
        "process.env.ULTRAVIOLET_COMMIT_HASH": (() => {
            try {
                let hash = JSON.stringify(
                    execSync("git rev-parse --short HEAD", { encoding: "utf-8" })
                        .replace(/\r?\n|\r/g, "")
                );
                return hash;
            } catch (e) {
                return "unknown";
            }
        })(),
    },
    bundle: true,
    treeShaking: true,
    metafile: isDevelopment,
    logLevel: "info",
    // Ensure output directory is `dist/`
    outdir: "dist",
});

// If in development mode, write a metafile for debugging
if (isDevelopment) {
    await writeFile("metafile.json", JSON.stringify(builder.metafile));
}

console.log("Build complete. Output is in the 'dist/' directory.");
