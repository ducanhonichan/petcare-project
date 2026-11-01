
function StateDisplay({
  type = 'empty',
  title,
  message,
  actionLabel,
  onAction,
}) {
  const defaultContent = {
    loading: {
      icon: '⏳',
      title: 'Loading...',
      message: 'Please wait while we load your data.',
    },
    empty: {
      icon: '🐾',
      title: 'No data yet',
      message: 'There is nothing to display right now.',
    },
    error: {
      icon: '⚠️',
      title: 'Something went wrong',
      message: 'We could not load your data. Please try again.',
    },
  }

  const content = defaultContent[type] || defaultContent.empty

  return (
    <div
      className={`state-display state-display--${type}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div className="state-display__icon" aria-hidden="true">
        {content.icon}
      </div>

      <h3 className="state-display__title">
        {title || content.title}
      </h3>

      <p className="state-display__message">
        {message || content.message}
      </p>

      {actionLabel && onAction && type !== 'loading' && (
        <button
          type="button"
          className="state-display__button"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default StateDisplay
