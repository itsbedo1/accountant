import type { KeyboardEvent } from 'react'

// يفعّل عنصر غير-button (div/span) بلوحة المفاتيح — Enter أو Space، نفس
// سلوك onClick العادي. يُستخدم مع role="button" tabIndex={0}
export function onActivateKey(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handler()
    }
  }
}
