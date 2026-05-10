# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Supabase signup approval flow

Apply `supabase/migrations/20260510_affiliation_approval_flow.sql` before using the new signup approval flow. The migration adds `profiles.approval_status`, creates `affiliation_join_requests`, updates `handle_new_user()`, and adds the approval/rejection RPCs used by the app.

Supabase Auth email confirmation also needs Dashboard settings:

- Authentication > Providers > Email: enable Confirm email.
- Authentication > URL Configuration: set Site URL to the app origin.
- Redirect URLs: add `http://localhost:5173/auth/callback` and the production `/auth/callback` URL.
