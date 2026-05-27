-- Mark existing email users as confirmed.
-- This does not disable future confirmation emails by itself.
-- Disable future confirmation emails in Supabase Dashboard:
-- Authentication > Providers > Email > Confirm email = OFF

update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  confirmation_token = '',
  confirmation_sent_at = null,
  updated_at = now()
where email is not null
  and email_confirmed_at is null;
