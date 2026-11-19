import type { Permission } from '@/lib/types';
import type { SupabaseAuthSource } from '@/lib/auth-source';
import { db } from '@/db/client';
import { ALL_PERMISSIONS } from '@/lib/permissions';

export async function buscarPermissoes(
  userId: string,
  companyId: string,
  isOwner: boolean,
  authSource: SupabaseAuthSource = 'hub'
): Promise<Permission[]> {
  if (isOwner) return ALL_PERMISSIONS;

  const { data, error } = await db
    .from('employee_permissions')
    .select('permission_code')
    .eq('user_id', userId)
    .eq('auth_source', authSource)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(`Não foi possível carregar as permissões: ${error.message}`);
  }

  return (data || []).map(
    (row: { permission_code: string }) => row.permission_code as Permission
  );
}
