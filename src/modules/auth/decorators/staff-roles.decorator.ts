import { SetMetadata } from '@nestjs/common';
import { StaffRole } from '../../staff-users/enums/staff-role.enum';

export const STAFF_ROLES_KEY = 'staffRoles';

export const StaffRoles = (...roles: StaffRole[]) =>
  SetMetadata(STAFF_ROLES_KEY, roles);