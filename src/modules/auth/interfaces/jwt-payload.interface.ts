import { StaffRole } from '../../staff-users/enums/staff-role.enum';

export interface JwtPayload {
  sub: string;
  accountType: 'STAFF' | 'CUSTOMER';
  businessId?: string;
  role?: StaffRole;
  iat?: number;
  exp?: number;
}