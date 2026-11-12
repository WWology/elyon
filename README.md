# Notitia

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.5.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Registration

Email registration collects a name, gender, email, and password. When Supabase returns a session,
the app signs out that session and opens the sign-in page. If email confirmation is enabled, the
app instead asks the user to check their email. Configure the Supabase site and redirect URLs for
the deployed app before enabling email confirmation.

The dashboard and profile pages require a signed-in user. Login and registration are for signed-out
users; signed-in users remain on their current page, or go to the dashboard on a fresh visit or when
already on an auth page. Password reset remains accessible whether signed in or not. The account
menu signs out all sessions. Client-side route guards do not replace Supabase authorization policies.

Password recovery sends an email link to `/resetpassword/update` on the current app origin.
After the password is updated, the app signs out all sessions and opens the sign-in page. If a
recovery link expires or the update page is reloaded, request a new link. Supabase Auth's redirect
allow list must include the exact callback URL for each deployed origin; the local configuration
includes the default Angular development URLs on port 4200. Restart the local Supabase stack after
changing its configuration.

The signup trigger requires the migrations in `supabase/migrations`. **Review existing data before
applying pending migrations:** `20261111161230_change-profiles-to-people-and-add-gender.sql` drops
the old `profiles` table and does not migrate its data. Back up or migrate those records before
applying it to a database that contains profiles.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
