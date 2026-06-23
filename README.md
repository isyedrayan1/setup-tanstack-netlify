# setup-tanstack-netlify

A CLI utility to easily set up and deploy Lovable-generated TanStack Start React SSR applications to Netlify.

## Background

By default, dynamic full-stack Lovable applications configure Cloudflare Workers as their target production environment. When deploying to Netlify, this project setup leads to static routing mismatches (404 errors) and dependency conflicts with TanStack Start dependencies (missing cheerio, syntax and import runtime path mismatches).

This CLI automates:
1. Detecting the package manager (`npm`, `bun`, `pnpm`, `yarn`).
2. Installing `cheerio` as a devDependency (required by TanStack Start HTML post-processing).
3. Writing a Netlify-compatible `netlify.toml` file with redirection and Nitro build preset configurations.
4. Stripping Cloudflare-specific server entry point configurations from `vite.config.ts`.
5. Creating and registering a `postinstall` script (`scripts/patch-tanstack.js`) to apply necessary hotfixes to `@tanstack/start-plugin-core` dependency issues.
6. Excluding Netlify build caches and configuration folders from Git.

## Usage

### Run via npx (Recommended)

Run the following command directly in the root of your Lovable-generated TanStack Start project:

```bash
npx setup-tanstack-netlify
```

### Local Installation & Testing

If you want to test or run the package locally from source:

1. Clone or navigate to the package folder:
   ```bash
   cd lovable-tan-netlify
   ```

2. Link the command globally:
   ```bash
   npm link
   ```

3. Navigate to your target project root and execute the command:
   ```bash
   setup-tanstack-netlify
   ```

### Deploying to Netlify

Once the setup is complete:

1. Ensure you have the Netlify CLI installed:
   ```bash
   npm install -g netlify-cli
   ```

2. Link your Netlify account and project:
   ```bash
   netlify login
   netlify link
   ```

3. Deploy using the Netlify CLI or push your changes to a Git provider (e.g. GitHub) connected to Netlify:
   ```bash
   netlify deploy --build
   ```

## License

MIT
