import AvatarBadge from './AvatarBadge'
import ChatThread from './ChatThread'
import ChatInput from './ChatInput'

// TCEL-077 — chat panel layout. TCEL-078 — becomes a bottom sheet on mobile.
export default function AvatarPanel({
  rtl, isMobile, state, messages, thinking,
  onSend, onClose, onConfirmEscalation, onCancelEscalation,
}) {
  const desktopStyle = {
    position: 'fixed',
    left: 20, bottom: 124, // 124 = 20 (figure offset) + 96 (figure height) + 8 gap
    width: 380, height: 480,
    borderRadius: 'var(--avatar-radius-xl)',
  }
  // TCEL-078 — 85vh left barely a sliver of the app visible; Bar asked for a
  // shorter sheet. 62vh keeps ~4 messages in view while the fleet screen stays
  // legible behind it. The 560px cap stops it stretching on tall phones and
  // small tablets, where 62vh is more room than the thread ever needs.
  const mobileStyle = {
    position: 'fixed',
    inset: 'auto 0 0 0',
    height: 'min(62vh, 560px)',
    borderRadius: '16px 16px 0 0',
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-panel-title"
      dir={rtl ? 'rtl' : 'ltr'}
      style={{
        ...(isMobile ? mobileStyle : desktopStyle),
        zIndex: 'var(--avatar-z)',
        background: 'var(--avatar-surface)',
        boxShadow: 'var(--avatar-shadow-float)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
    >
      <div style={{
        background: 'var(--avatar-header-dark)', color: 'var(--avatar-surface)',
        height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
      }}>
        <AvatarBadge state={state} size={28} />
        <div id="avatar-panel-title" style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>עוזר CELOX</div>
        <button
          onClick={onClose}
          aria-label="סגור"
          style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}
        >
          ×
        </button>
      </div>

      <ChatThread
        messages={messages}
        thinking={thinking}
        state={state}
        onConfirmEscalation={onConfirmEscalation}
        onCancelEscalation={onCancelEscalation}
      />

      <ChatInput onSend={onSend} disabled={thinking} />
    </div>
  )
}
