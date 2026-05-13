import { useAuth } from '@/contexts/authContext'

export function useSession() {
  return useAuth()
}
