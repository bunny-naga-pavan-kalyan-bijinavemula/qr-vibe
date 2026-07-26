Remove the "Continue with Google" option from `src/routes/auth.tsx`:

1. Delete the Google button JSX block and the "OR" divider below it.
2. Remove the `handleGoogle` function.
3. Remove the now-unused `lovable` import from `@/integrations/lovable/index`.

Email/password and Phone (SMS) sign-in remain unchanged.