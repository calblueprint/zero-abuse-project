-- Run manually in a development Supabase project's SQL Editor.
-- Stable IDs make reruns safe. These examples have no supporting items.
INSERT INTO public.trends (
  trend_id, title, emerged_at, signal_status, evidence_status, description, pattern_type
)
VALUES
  (
    'a737d2b4-4bed-46e5-90bd-494bb233bd01',
    '[Demo] Changes to reporting tools',
    now(),
    'AI suggested',
    'Needs corroboration',
    'Synthetic example for previewing the Emerging patterns library.',
    'Platform updates'
  ),
  (
    'a737d2b4-4bed-46e5-90bd-494bb233bd02',
    '[Demo] Updated safety guidance',
    now() - interval '7 days',
    'Confirmed',
    'Needs corroboration',
    'Synthetic example for checking search and review filters.',
    'Professional guidance'
  ),
  (
    'a737d2b4-4bed-46e5-90bd-494bb233bd03',
    '[Demo] Earlier reporting guidance',
    now() - interval '35 days',
    'Archived',
    'Needs corroboration',
    'Synthetic example for checking archived and date filters.',
    'Professional guidance'
  )
ON CONFLICT (trend_id) DO NOTHING;
