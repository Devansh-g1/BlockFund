
-- Enable realtime for the campaigns table
ALTER TABLE public.campaigns REPLICA IDENTITY FULL;
BEGIN;
  -- Add table to the publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
COMMIT;
