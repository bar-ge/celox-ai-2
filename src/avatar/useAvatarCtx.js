import { useContext } from 'react'
import { AvatarCtx } from './avatarCtx'

export function useAvatarCtx() {
  const ctx = useContext(AvatarCtx)
  if (!ctx) throw new Error('useAvatarCtx must be used inside <AvatarProvider>')
  return ctx
}
