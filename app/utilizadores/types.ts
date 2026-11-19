export interface UtilizadorData {
  id: string;
  userId: string;
  authSource: "hub" | "faturas";
  email: string;
  fullName: string | null;
  isOwner: boolean;
  status: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}
