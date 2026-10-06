-- When a user's verified login email changes, keep public.users in sync and
-- re-evaluate access, which depends on the verified email domain.
-- With Secure Email Change, auth.users.email only changes after the user
-- confirms the new address (until then it sits in email_change), so this
-- fires exactly when an email change is verified.
--
-- Access mirrors getInitialUserAccess() in lib/auth/access.ts:
-- - new email on the ZAP domain: admin and approved
-- - new email off the ZAP domain: not admin; if the old email was on the ZAP
--   domain, its approval came from that domain, so it goes back to pending for
--   an admin to review. Otherwise an admin's earlier decision stays.
CREATE OR REPLACE FUNCTION public.handle_user_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  zap_domain constant text := 'zeroabuseproject.org';
  was_zap boolean := split_part(lower(OLD.email), '@', 2) = zap_domain;
  is_zap boolean := split_part(lower(NEW.email), '@', 2) = zap_domain;
BEGIN
  UPDATE public.users
  SET
    email = lower(trim(NEW.email)),
    is_admin = is_zap,
    approval_status = CASE
      WHEN is_zap THEN 'approved'
      WHEN was_zap THEN 'pending'
      ELSE approval_status
    END,
    approval_decided_by = CASE
      WHEN is_zap OR was_zap THEN NULL
      ELSE approval_decided_by
    END,
    approval_decided_at = CASE
      WHEN is_zap AND approval_status = 'approved' THEN approval_decided_at
      WHEN is_zap THEN now()
      WHEN was_zap THEN NULL
      ELSE approval_decided_at
    END
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS on_auth_user_email_change ON auth.users;--> statement-breakpoint
CREATE TRIGGER on_auth_user_email_change
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.handle_user_email_change();
