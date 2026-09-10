export interface UtilizadorData {
  id: string;
  email: string;
  fullName: string | null;
  isOwner: boolean;
  status: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}
