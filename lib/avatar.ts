export function getAvatarInitials({
  firstName,
  lastName,
  email,
}: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string | null {
  const nameParts = [firstName, lastName].filter((part): part is string =>
    Boolean(part?.trim()),
  );

  if (nameParts.length) {
    return nameParts
      .map(part => part.trim().charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  const emailLocalPart = email?.trim().split("@")[0];
  return emailLocalPart ? emailLocalPart.slice(0, 2).toUpperCase() : null;
}
