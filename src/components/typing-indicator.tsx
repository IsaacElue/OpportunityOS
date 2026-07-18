export function TypingIndicator() {
  return <span className="inline-flex items-center gap-1" role="status" aria-label="Scout is typing">
    <span className="size-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.3s]" />
    <span className="size-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.15s]" />
    <span className="size-1.5 animate-bounce rounded-full bg-brand" />
  </span>;
}
