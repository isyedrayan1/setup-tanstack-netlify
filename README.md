# setup-tanstack-netlify

A zero-config CLI utility to prepare and deploy Lovable-generated TanStack Start (React SSR) applications to Netlify in seconds.

---

## The Problem

Lovable (lovable.dev) builds dynamic full-stack applications using TanStack Start v1 (React 19 + Vite + Nitro SSR engine), configuring **Cloudflare Workers** as the default edge target. 

If you try to deploy this project directly to Netlify:
1. **Netlify 404 Errors**: Netlify treats the project as a static SPA, resulting in 404 "Page Not Found" errors on all SSR-rendered pages.
2. **Third-Party Mismatches**: The default TanStack Start dependencies contain unresolved bugs (missing `cheerio` devDependency, incorrect import paths in `@tanstack/start-plugin-core`, and missing runtime configuration fallbacks).

---

## What This CLI Does

Running this tool in your target project root automates all required configuration changes:

- **Auto-Detects Package Manager**: Identifies `npm`, `bun`, `pnpm`, or `yarn` via lockfiles.
- **Installs Missing Dependencies**: Adds `cheerio` as a devDependency.
- **Generates `netlify.toml`**: Configures Netlify with a catch-all rewrite (`/* -> /.netlify/functions/server`), Netlify-compatible Nitro presets (`NITRO_PRESET = "netlify"`), and Node 20 environment.
- **Updates `vite.config.ts`**: Removes the Cloudflare-specific server entry point (`server: { entry: "server" }`), allowing Nitro to compile using its default Netlify-compatible entry point.
- **Injects Post-Install Hotfixes**: Registers a lightweight `scripts/patch-tanstack.js` file and adds it to your project's `postinstall` step. This automatically patches known `@tanstack/start-plugin-core` bugs in `node_modules` (specifically fixing the `escapeRegExp` import path and adding a fallback value for `injectedHeadScripts`).
- **Updates Git Ignore**: Appends `.netlify/` to `.gitignore` to keep local build artifacts out of Git.

---

## Quick Start

Run the following command directly in the root directory of your Lovable-generated TanStack Start project:

```bash
npx setup-tanstack-netlify
```

---

## Deploying to Netlify

Once the setup tool completes, you can deploy your application:

### Option A: Connected Git Repository (Recommended)
Simply commit all generated files and push them to your repository (GitHub, GitLab, etc.). When Netlify builds the site, it will read `netlify.toml`, run the postinstall patch, and build the SSR application automatically.

### Option B: Netlify CLI
1. Log in and link your project:
   ```bash
   netlify login
   netlify link
   ```
2. Build and deploy:
   ```bash
   netlify deploy --build --prod
   ```

---

## Local Development & Contribution

If you want to contribute or modify this package locally:

1. Clone this repository.
2. Link the package globally to test changes:
   ```bash
   npm link
   ```
3. Run the CLI tool inside any test project root:
   ```bash
   setup-tanstack-netlify
   ```

## License

MIT
