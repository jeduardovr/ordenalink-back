import { Request } from 'express';

import { StaffRole } from '../../staff-users/enums/staff-role.enum';

export interface StaffAuthUser {
  id: string;
  accountType: 'STAFF';
  businessId: string;
  role: StaffRole;
}

export interface CustomerAuthUser {
  id: string;
  accountType: 'CUSTOMER';
}

export type AuthUser =
  | StaffAuthUser
  | CustomerAuthUser;

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
}