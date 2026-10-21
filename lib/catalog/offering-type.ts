import { isInternalStaff, type SessionUser } from '@/lib/auth/session';

export function offeringTypeOf(value?: unknown) {
  return String(value || 'PRODUCT').trim().toUpperCase() || 'PRODUCT';
}

export function isServiceOffering(value?: unknown) {
  return offeringTypeOf(value) === 'SERVICE';
}

export function canViewServices(user?: SessionUser | null) {
  return Boolean(user && (user.role === 'admin' || isInternalStaff(user)));
}

export function canCreateService(user?: SessionUser | null) {
  return Boolean(user && (user.role === 'admin' || isInternalStaff(user)));
}

export function denyEnterpriseService(user: SessionUser, type?: unknown) {
  if (isServiceOffering(type) && !canCreateService(user)) {
    return 'Enterprise accounts can create products only, not services.';
  }
  return null;
}

export function filterVisibleByType<T extends { offering_type?: unknown }>(
  items: T[],
  user?: SessionUser | null
) {
  if (canViewServices(user)) return items;
  return items.filter((item) => !isServiceOffering(item.offering_type));
}

export function productTypeSql(user?: SessionUser | null) {
  if (canViewServices(user)) return '';
  return ` AND UPPER(IFNULL(offering_type,'PRODUCT')) <> 'SERVICE'`;
}
