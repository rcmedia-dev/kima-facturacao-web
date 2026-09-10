-- 005_auth_e_permissoes.sql
-- Sistema de Autenticação e Permissões — Kima Facturação
-- Login próprio: código da empresa + email + senha
-- Dois tipos: Admin (owner, acesso total) e Funcionário (permissões atribuídas)
-- Executar no Supabase SQL Editor.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. COLUNA company_code EM companies
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS company_code TEXT UNIQUE;

-- Popular company_code para empresas existentes (4 primeiros dígitos do NIF)
UPDATE public.companies
  SET company_code = UPPER(SUBSTRING(nif FROM 1 FOR 4))
  WHERE company_code IS NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. TABELA users — Utilizadores do Kima Facturação (login próprio)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  password_hash TEXT,  -- NULL até definir senha no primeiro acesso
  is_owner BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'pendente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, email)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_email ON public.users(company_id, email);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. TABELA permissions — Catálogo fixo de permissões
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.permissions (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. TABELA user_permissions — Permissões atribuídas a cada funcionário
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (user_id, company_id, permission_code)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_company_id ON public.user_permissions(company_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. SEED — Permissões (18 total)
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.permissions (code, description) VALUES
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

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. FUNÇÃO — Auto-criar user owner quando empresa é criada
-- ══════════════════════════════════════════════════════════════════════════════

-- Função chamada via trigger ou manualmente após criação da empresa no Kima Hub
CREATE OR REPLACE FUNCTION public.criar_owner_empresa(
  p_company_id UUID,
  p_owner_email TEXT,
  p_full_name TEXT DEFAULT 'Administrador'
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  INSERT INTO public.users (company_id, email, full_name, is_owner, status)
  VALUES (p_company_id, p_owner_email, p_full_name, true, 'ativo')
  ON CONFLICT (company_id, email) DO UPDATE
    SET is_owner = true, status = 'ativo'
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. FUNÇÃO — Verificar permissão
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.verificar_permissao(
  p_user_id UUID,
  p_company_id UUID,
  p_permission_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_has_permission BOOLEAN;
BEGIN
  -- Admin (owner) tem todas as permissões
  SELECT is_owner INTO v_is_owner
  FROM public.users
  WHERE id = p_user_id AND company_id = p_company_id;

  IF v_is_owner = true THEN
    RETURN true;
  END IF;

  -- Funcionário: verificar se tem a permissão específica
  SELECT EXISTS(
    SELECT 1 FROM public.user_permissions
    WHERE user_id = p_user_id
      AND company_id = p_company_id
      AND permission_code = p_permission_code
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. FUNÇÃO — Obter todas as permissões de um utilizador
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.obter_permissoes(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS TABLE(permission_code TEXT) AS $$
DECLARE
  v_is_owner BOOLEAN;
BEGIN
  -- Admin (owner) tem todas as permissões
  SELECT is_owner INTO v_is_owner
  FROM public.users
  WHERE id = p_user_id AND company_id = p_company_id;

  IF v_is_owner = true THEN
    RETURN QUERY SELECT p.code FROM public.permissions p;
    RETURN;
  END IF;

  -- Funcionário: devolver permissões atribuídas
  RETURN QUERY
  SELECT up.permission_code
  FROM public.user_permissions up
  WHERE up.user_id = p_user_id
    AND up.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
