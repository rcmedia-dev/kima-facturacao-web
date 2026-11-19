-- Funcionários e convites próprios do módulo Kima Faturas.
-- As identidades continuam em auth.users; nenhuma membership do Hub é criada.

BEGIN;

CREATE TABLE IF NOT EXISTS kima_facturas.permissions (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

INSERT INTO kima_facturas.permissions (code, description) VALUES
  ('dashboard.view', 'Ver dashboard'),
  ('invoices.view', 'Ver facturas'),
  ('invoices.create', 'Criar facturas'),
  ('invoices.update', 'Editar facturas'),
  ('invoices.delete', 'Apagar facturas'),
  ('customers.view', 'Ver clientes'),
  ('customers.manage', 'Criar/editar clientes'),
  ('customers.delete', 'Apagar clientes'),
  ('suppliers.view', 'Ver fornecedores'),
  ('suppliers.manage', 'Gerir fornecedores'),
  ('articles.view', 'Ver artigos'),
  ('articles.manage', 'Gerir artigos'),
  ('expenses.view', 'Ver despesas'),
  ('expenses.manage', 'Gerir despesas'),
  ('reports.view', 'Ver relatórios'),
  ('settings.manage', 'Gerir configurações'),
  ('agt.manage', 'Gerir AGT'),
  ('users.manage', 'Gerir utilizadores')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS kima_facturas.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  status TEXT NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS employees_user_id_idx
  ON kima_facturas.employees (user_id);

CREATE TABLE IF NOT EXISTS kima_facturas.employee_permissions (
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  permission_code TEXT NOT NULL
    REFERENCES kima_facturas.permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (company_id, user_id, permission_code),
  FOREIGN KEY (company_id, user_id)
    REFERENCES kima_facturas.employees(company_id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS kima_facturas.employee_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS employee_invitations_pending_email_idx
  ON kima_facturas.employee_invitations (company_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS kima_facturas.employee_invitation_permissions (
  invitation_id UUID NOT NULL
    REFERENCES kima_facturas.employee_invitations(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL
    REFERENCES kima_facturas.permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (invitation_id, permission_code)
);

ALTER TABLE kima_facturas.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kima_facturas.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE kima_facturas.employee_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kima_facturas.employee_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kima_facturas.employee_invitation_permissions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON kima_facturas.permissions,
  kima_facturas.employees,
  kima_facturas.employee_permissions,
  kima_facturas.employee_invitations,
  kima_facturas.employee_invitation_permissions
FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA kima_facturas TO service_role;
GRANT ALL ON kima_facturas.permissions,
  kima_facturas.employees,
  kima_facturas.employee_permissions,
  kima_facturas.employee_invitations,
  kima_facturas.employee_invitation_permissions
TO service_role;

CREATE OR REPLACE FUNCTION kima_facturas.create_employee_invitation(
  p_company_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_token_hash TEXT,
  p_expires_at TIMESTAMPTZ,
  p_invited_by UUID,
  p_permission_codes TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invitation_id UUID;
  v_permission_code TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM kima_facturas.employees e
    WHERE e.company_id = p_company_id
      AND lower(e.email) = lower(p_email)
      AND e.status = 'ativo'
  ) THEN
    RAISE EXCEPTION 'employee_already_exists' USING ERRCODE = '23505';
  END IF;

  UPDATE kima_facturas.employee_invitations
  SET revoked_at = now()
  WHERE company_id = p_company_id
    AND lower(email) = lower(p_email)
    AND accepted_at IS NULL
    AND revoked_at IS NULL;

  INSERT INTO kima_facturas.employee_invitations (
    company_id, email, full_name, token_hash, invited_by, expires_at
  ) VALUES (
    p_company_id, lower(p_email), p_full_name, p_token_hash, p_invited_by, p_expires_at
  )
  RETURNING id INTO v_invitation_id;

  FOREACH v_permission_code IN ARRAY coalesce(p_permission_codes, ARRAY[]::TEXT[])
  LOOP
    INSERT INTO kima_facturas.employee_invitation_permissions (
      invitation_id, permission_code
    ) VALUES (v_invitation_id, v_permission_code);
  END LOOP;

  RETURN v_invitation_id;
END;
$$;

CREATE OR REPLACE FUNCTION kima_facturas.accept_employee_invitation(
  p_token_hash TEXT,
  p_user_id UUID
)
RETURNS TABLE(company_id UUID, employee_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invitation kima_facturas.employee_invitations%ROWTYPE;
  v_user_email TEXT;
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

  SELECT lower(u.email)
  INTO v_user_email
  FROM auth.users u
  WHERE u.id = p_user_id;

  IF v_user_email IS NULL OR v_user_email <> lower(v_invitation.email) THEN
    RAISE EXCEPTION 'invitation_email_mismatch' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO kima_facturas.employees (
    company_id, user_id, email, full_name, status
  ) VALUES (
    v_invitation.company_id,
    p_user_id,
    lower(v_invitation.email),
    v_invitation.full_name,
    'ativo'
  )
  ON CONFLICT (company_id, user_id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = coalesce(EXCLUDED.full_name, kima_facturas.employees.full_name),
        status = 'ativo'
  RETURNING id INTO employee_id;

  DELETE FROM kima_facturas.employee_permissions ep
  WHERE ep.company_id = v_invitation.company_id
    AND ep.user_id = p_user_id;

  INSERT INTO kima_facturas.employee_permissions (
    company_id, user_id, permission_code
  )
  SELECT v_invitation.company_id, p_user_id, ip.permission_code
  FROM kima_facturas.employee_invitation_permissions ip
  WHERE ip.invitation_id = v_invitation.id;

  UPDATE kima_facturas.employee_invitations
  SET accepted_at = now(), accepted_by = p_user_id
  WHERE id = v_invitation.id;

  company_id := v_invitation.company_id;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION kima_facturas.update_employee_access(
  p_company_id UUID,
  p_user_id UUID,
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
  IF p_status NOT IN ('ativo', 'inativo') THEN
    RAISE EXCEPTION 'invalid_employee_status' USING ERRCODE = '22023';
  END IF;

  UPDATE kima_facturas.employees
  SET status = p_status, updated_at = now()
  WHERE company_id = p_company_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'employee_not_found' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM kima_facturas.employee_permissions ep
  WHERE ep.company_id = p_company_id AND ep.user_id = p_user_id;

  FOREACH v_permission_code IN ARRAY coalesce(p_permission_codes, ARRAY[]::TEXT[])
  LOOP
    INSERT INTO kima_facturas.employee_permissions (
      company_id, user_id, permission_code
    ) VALUES (p_company_id, p_user_id, v_permission_code);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION kima_facturas.create_employee_invitation(
  UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID, TEXT[]
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION kima_facturas.accept_employee_invitation(TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION kima_facturas.update_employee_access(
  UUID, UUID, TEXT, TEXT[]
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION kima_facturas.create_employee_invitation(
  UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID, TEXT[]
) TO service_role;
GRANT EXECUTE ON FUNCTION kima_facturas.accept_employee_invitation(TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION kima_facturas.update_employee_access(
  UUID, UUID, TEXT, TEXT[]
) TO service_role;

COMMIT;
