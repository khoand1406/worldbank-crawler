ALTER TABLE audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_action_check;

ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_action_check
CHECK (
    action IN (
        'API_CALL',
        'DB_INSERT',
        'DB_UPDATE',
        'DB_ERROR',
        'DB_BATCH'
    )
);