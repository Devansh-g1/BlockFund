
-- Enable realtime for campaigns table
ALTER TABLE public.campaigns REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;

-- Enable realtime for campaign_verifications table
ALTER TABLE public.campaign_verifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_verifications;

-- Enable realtime for donations table
ALTER TABLE public.donations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.donations;
