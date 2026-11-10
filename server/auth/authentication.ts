export interface AuthenticatedUser {
  id: string
  email: string | null
}

export interface PlayerProfile {
  id: string
  username: string
  display_name: string
  island_name: string
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface AuthenticationServices {
  verifyAccessToken(accessToken: string): Promise<AuthenticatedUser | null>
  getPlayerProfile(userId: string, accessToken: string): Promise<PlayerProfile | null>
}
