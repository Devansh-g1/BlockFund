DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trigger_check_campaign_verification'
  ) THEN
    CREATE TRIGGER trigger_check_campaign_verification
    AFTER INSERT ON campaign_verifications
    FOR EACH ROW
    EXECUTE FUNCTION check_campaign_verification();
  END IF;
END $$;
