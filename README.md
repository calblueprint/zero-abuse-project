# Zero Abuse Project

This project is being built by a team at [Blueprint](https://calblueprint.org), a student organization at the University of California, Berkeley building software pro bono for nonprofits.

## Getting Started

### Prerequisites

Check your installation of `node` and `pnpm`:

```bash
node -v
pnpm -v
```

We strongly recommend using a Node version manager like [nvm](https://github.com/nvm-sh/nvm) (for Mac) or [nvm-windows](https://github.com/coreybutler/nvm-windows) (for Windows) to install Node.js. If you don't plan on switching between different Node versions, you can alternatively get a [prebuilt installer](https://nodejs.org/en/download/prebuilt-installer) from the Node.js website for an easier approach. Make sure to get Node version 20 and up, the latest LTS version should be sufficient.

After installing Node, you most likely have npm installed as well (check by running `npm -v`). If you have npm installed, simply run `npm install -g pnpm` to install pnpm. If your command line does not recognize npm as a command, refer to [this article](https://www.geeksforgeeks.org/how-to-resolve-npm-command-not-found-error-in-node-js/) to troubleshoot.

Additional resources:
- [Downloading and installing Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [Installing pnpm without npm](https://pnpm.io/installation)

### Installation

1. Clone the repo & install dependencies

   1. Clone this repo
      - using SSH (recommended)
        ```bash
        git clone git@github.com:calblueprint/zero-abuse-project.git
        ```
      - using HTTPS
        ```bash
        git clone https://github.com/calblueprint/zero-abuse-project.git
        ```
   2. Enter the cloned directory
      ```bash
      cd zero-abuse-project
      ```
   3. Install project dependencies. This command installs all packages from [`package.json`](package.json).
      ```bash
      pnpm install
      ```

2. Set up secrets:
   1. In the project's root directory (`zero-abuse-project/`), create a new file named `.env.local`
   2. Copy `example.env` into `.env.local` and fill in the Supabase values.
   3. Get `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the Supabase project settings (or from [Blueprint's internal Notion](https://app.notion.com/p/calblueprint/rose-environment-setup-279669c1807580cbbb03dc7a08f8a7d9?source=copy_link#27f669c18075808987facd37d36ab8bd)).
   4. In the Supabase dashboard, open **Connect**, select the **Transaction pooler**, copy its URI, replace the password placeholder, and save it as `DATABASE_URL`. URL-encode any special characters in the password.

   `DATABASE_URL` is a privileged server secret. Never rename it with a
   `NEXT_PUBLIC_` prefix or import the Drizzle client into a Client Component.

**Helpful resources**

- [GitHub: Cloning a Repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository#cloning-a-repository)
- [GitHub: Generating SSH keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)

### Development environment

- **[VSCode](https://code.visualstudio.com/) (recommended)**
  1. Open the `zero-abuse-project` project in VSCode.
  2. Install recommended workspace VSCode extensions. You should see a pop-up on the bottom right to "install the recommended extensions for this repository".

### Running the app

In the project directory, run:

```shell
pnpm dev
```

Then, navigate to http://localhost:3000 to launch the web application.

## Database development with Drizzle

[Supabase](https://supabase.com/) hosts the PostgreSQL database and also
provides services such as authentication, storage, realtime updates, and a
browser-safe Data API. [Drizzle](https://orm.drizzle.team/) is the typed
TypeScript layer used by our server code to define the database schema, write
SQL-like queries, and create repeatable SQL migrations. Drizzle does not replace
Supabase; it connects to the PostgreSQL database that Supabase manages.

The two clients in this project have different jobs:

- `actions/supabase/client.ts` uses the Supabase Data API. It is appropriate
  when a request should use Supabase Auth and Row Level Security.
- `db/index.ts` uses Drizzle over a direct PostgreSQL connection. It is for
  trusted server-side code only. The connection can bypass Row Level Security,
  so every server action or route using it must enforce authorization.

### Schema and migrations

1. Define and export tables in `db/schema.ts`.
2. Generate a SQL migration from the schema changes:

   ```bash
   pnpm db:generate
   ```

3. Review the generated SQL in `drizzle/`, then apply it:

   ```bash
   pnpm db:migrate
   ```

Commit both the schema change and its generated migration. Useful commands:

```bash
pnpm db:check    # validate generated migrations
pnpm db:studio   # open Drizzle Studio to inspect data
pnpm db:push     # push a schema directly; use only for disposable/local work
```

Import `db` only from server-side modules:

```ts
import { db } from "@/db";
import { items } from "@/db/schema";

const allItems = await db.select().from(items);
```
