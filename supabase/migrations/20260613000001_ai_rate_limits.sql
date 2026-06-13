-- AI request rate limiting per user, per hour window
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  user_id      uuid        NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer    NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, window_start)
);

-- No direct client access — only written by Edge Functions via service role
ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access" ON ai_rate_limits FOR ALL USING (false);

-- Atomic upsert + increment; returns current count and whether it is within the limit
CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  p_user_id      uuid,
  p_window_start timestamptz,
  p_max_requests integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO ai_rate_limits (user_id, window_start, request_count)
  VALUES (p_user_id, p_window_start, 1)
  ON CONFLICT (user_id, window_start) DO UPDATE
    SET request_count = ai_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN jsonb_build_object('count', v_count, 'allowed', v_count <= p_max_requests);
END;
$$;

-- Auto-clean rows older than 2 hours (optional, keeps table small)
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_window ON ai_rate_limits (window_start);
