-- Distingue o acesso de funcionários do acesso de administradores no Auth
-- partilhado; cada identidade continua associada ao mesmo auth.users.

BEGIN;

ALTER TABLE kima_facturas.employees
  ADD COLUMN IF NOT EXISTS auth_source TEXT NOT NULL DEFAULT 'hub';

ALTER TABLE kima_facturas.employee_permissions
  ADD COLUMN IF NOT EXISTS auth_source TEXT NOT NULL DEFAULT 'hub';

ALTER TABLE kima_facturas.employee_permissions
  DROP CONSTRAINT IF EXISTS employee_permissions_company_id_user_id_fkey,
  DROP CONSTRAINT IF EXISTS employee_permissions_company_user_source_fkey,
  DROP CONSTRAINT IF EXISTS employee_permissions_pkey;

ALTER TABLE kima_facturas.employees
  DROP CONSTRAINT IF EXISTS employees_company_id_user_id_key,
  DROP CONSTRAINT IF EXISTS employees_company_user_auth_source_key,
  ADD CONSTRAINT employees_company_user_auth_source_key
    UNIQUE (company_id, user_id, auth_source);

ALTER TABLE kima_facturas.employee_permissions
  DROP CONSTRAINT IF EXISTS employee_permissions_auth_source_check,
  ADD CONSTRAINT employee_permissions_auth_source_check
    CHECK (auth_source IN ('hub', 'faturas')),
  ADD CONSTRAINT employee_permissions_pkey
    PRIMARY KEY (company_id, user_id, auth_source, permission_code),
  ADD CONSTRAINT employee_permissions_company_user_source_fkey
    FOREIGN KEY (company_id, user_id, auth_source)
    REFERENCES kima_facturas.employees(company_id, user_id, auth_source)
    ON DELETE CASCADE;

ALTER TABLE kima_facturas.employees
  DROP CONSTRAINT IF EXISTS employees_auth_source_check,
  ADD CONSTRAINT employees_auth_source_check
    CHECK (auth_source IN ('hub', 'faturas'));

CREATE INDEX IF NOT EXISTS employees_auth_source_user_id_idx
  ON kima_facturas.employees (auth_source, user_id);

DROP FUNCTION IF EXISTS kima_facturas.accept_employee_invitation(TEXT, UUID);

CREATE OR REPLACE FUNCTION kima_facturas.accept_employee_invitation(
  p_token_hash TEXT,
  p_user_id UUID,
  p_email TEXT
)
RETURNS TABLE(company_id UUID, employee_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invitation kima_facturas.employee_invitations%ROWTYPE;
BEGIN
  SELECT i.*
  INTO v_invitation
  FROM kima_facturas.employee_invitations i
  WHERE i.token_hash = p_token_hash
    AND i.accepted_at IS NULL
    AND i.revoked_at IS NULL
    AND i.expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_invalid_or_expired' USING ERRCODE = 'P0001';
  END IF;

  IF p_user_id IS NULL
    OR p_email IS NULL
    OR lower(trim(p_email)) <> lower(trim(v_invitation.email))
  THEN
    RAISE EXCEPTION 'invitation_email_mismatch' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO kima_facturas.employees (
    company_id, user_id, auth_source, email, full_name, status
  ) VALUES (
    v_invitation.company_id,
    p_user_id,
    'faturas',
    lower(v_invitation.email),
    v_invitation.full_name,
    'ativo'
  )
  ON CONFLICT (company_id, user_id, auth_source) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = coalesce(EXCLUDED.full_name, kima_facturas.employees.full_name),
        status = 'ativo',
        updated_at = now()
  RETURNING id INTO employee_id;

  DELETE FROM kima_facturas.employee_permissions ep
  WHERE ep.company_id = v_invitation.company_id
    AND ep.user_id = p_user_id
    AND ep.auth_source = 'faturas';

  INSERT INTO kima_facturas.employee_permissions (
    company_id, user_id, auth_source, permission_code
  )
  SELECT v_invitation.company_id, p_user_id, 'faturas', ip.permission_code
  FROM kima_facturas.employee_invitation_permissions ip
  WHERE ip.invitation_id = v_invitation.id;

  UPDATE kima_facturas.employee_invitations
  SET accepted_at = now(), accepted_by = p_user_id
  WHERE id = v_invitation.id;

  company_id := v_invitation.company_id;
  RETURN NEXT;
END;
$$;

DROP FUNCTION IF EXISTS kima_facturas.update_employee_access(
  UUID, UUID, TEXT, TEXT[]
);

CREATE OR REPLACE FUNCTION kima_facturas.update_employee_access(
  p_company_id UUID,
  p_user_id UUID,
  p_auth_source TEXT,
  p_status TEXT,
  p_permission_codes TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_permission_code TEXT;
BEGIN
  IF p_auth_source NOT IN ('hub', 'faturas') THEN
    RAISE EXCEPTION 'invalid_auth_source' USING ERRCODE = '22023';
  END IF;

  IF p_status NOT IN ('ativo', 'inativo') THEN
    RAISE EXCEPTION 'invalid_employee_status' USING ERRCODE = '22023';
  END IF;

  UPDATE kima_facturas.employees
  SET status = p_status, updated_at = now()
  WHERE company_id = p_company_id
    AND user_id = p_user_id
    AND auth_source = p_auth_source;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'employee_not_found' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM kima_facturas.employee_permissions ep
  WHERE ep.company_id = p_company_id
    AND ep.user_id = p_user_id
    AND ep.auth_source = p_auth_source;

  FOREACH v_permission_code IN ARRAY coalesce(p_permission_codes, ARRAY[]::TEXT[])
  LOOP
    INSERT INTO kima_facturas.employee_permissions (
      company_id, user_id, auth_source, permission_code
    ) VALUES (
      p_company_id, p_user_id, p_auth_source, v_permission_code
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION kima_facturas.accept_employee_invitation(
  TEXT, UUID, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION kima_facturas.update_employee_access(
  UUID, UUID, TEXT, TEXT, TEXT[]
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION kima_facturas.accept_employee_invitation(
  TEXT, UUID, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION kima_facturas.update_employee_access(
  UUID, UUID, TEXT, TEXT, TEXT[]
) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
