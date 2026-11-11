const MEMBER_CAPABILITIES = [
  "Browse and search the intelligence library",
  "View emerging patterns",
] as const;

const ADMIN_CAPABILITIES = [
  "Browse and edit the intelligence library",
  "Create intelligence items and emerging patterns",
  "Review and confirm emerging patterns",
  "Manage intelligence sources",
  "Approve and reject access requests",
  "Manage people and access",
] as const;

export const getCapabilities = (isAdmin: boolean): readonly string[] =>
  isAdmin ? ADMIN_CAPABILITIES : MEMBER_CAPABILITIES;
