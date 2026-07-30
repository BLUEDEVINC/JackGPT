export function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl };
}

export function normalizeEmail(email) {
  return email?.toLowerCase();
}
