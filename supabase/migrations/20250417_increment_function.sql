
-- Create a function to increment a numeric value safely
CREATE OR REPLACE FUNCTION public.increment(
  row_id UUID,
  x NUMERIC,
  table_name TEXT,
  column_name TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_value NUMERIC;
  result NUMERIC;
BEGIN
  EXECUTE format('SELECT %I FROM %I WHERE id = $1', column_name, table_name)
  INTO current_value
  USING row_id;
  
  result := current_value + x;
  
  RETURN result;
END;
$$;
