-- 008_corrigir_accept_employee_invitation.sql
-- Corrige o erro "column reference 'company_id' is ambiguous" (código 42702)
-- que impedia a ativação de convites de novos funcionários.

BEGIN;

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
#variable_conflict use_column
DECLARE
  v_invitation kima_facturas.employee_invitations%ROWTYPE;
  v_employee_id UUID;
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
  RETURNING kima_facturas.employees.id INTO v_employee_id;

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

  RETURN QUERY SELECT v_invitation.company_id, v_employee_id;
END;
$$;

REVOKE ALL ON FUNCTION kima_facturas.accept_employee_invitation(
  TEXT, UUID, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION kima_facturas.accept_employee_invitation(
  TEXT, UUID, TEXT
) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
