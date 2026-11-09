const usernameAuthDomain = 'accounts.haigioi.invalid'

export function isValidUsername(value: string): boolean {
  return /^[A-Za-z0-9_-]{3,24}$/.test(value)
}

export function usernameToAuthEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${usernameAuthDomain}`
}

export function isUsernameAuthEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase().endsWith(`@${usernameAuthDomain}`) ?? false
}
