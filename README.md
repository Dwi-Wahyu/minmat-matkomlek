# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
bun x sv@0.12.7 create --template minimal --types ts --add prettier eslint tailwindcss="plugins:typography,forms" vitest="usages:unit,component" sveltekit-adapter="adapter:node" drizzle="database:mysql+mysql:mysql2+docker:no" better-auth="demo:password" --install bun minmat-puskomlekad-web
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## 🧩 Add-on steps

### drizzle:

- Check DATABASE_URL in .env and adjust it to your needs
- Run `bun run db:push` to update your database schema

### better-auth:

- Run `bun run auth:schema` to generate the auth schema
- Run `bun run db:push` to update your database
- Check ORIGIN & BETTER_AUTH_SECRET in .env and adjust it to your needs
- Visit /demo/better-auth route to view the demo

┌────────────────┬────────┬───────────────────────────┐
│ Aksi │ Method │ URL Endpoint │
├────────────────┼────────┼───────────────────────────┤
│ Login │ POST │ /api/auth/sign-in/email │
│ Register │ POST │ /api/auth/sign-up/email │
│ Logout │ POST │ /api/auth/sign-out │
│ Cek Session │ GET │ /api/auth/get-session │
│ Ganti Password │ POST │ /api/auth/change-password │
└────────────────┴────────┴───────────────────────────┘
