import type { CSSProperties, HTMLAttributes } from 'react';

interface IconProps extends HTMLAttributes<HTMLElement> {
  name: string;
}

/**
 * An Ionicons icon. Decorative unless given an aria-label.
 * The Ionicons script adds its own attributes (class="md hydrated", role) before React hydrates
 * server-rendered pages, so attribute differences on this element are expected.
 */
export function Icon({ name, ...rest }: IconProps) {
  return <ion-icon name={name} aria-hidden={rest['aria-label'] ? undefined : true} suppressHydrationWarning {...rest} />;
}

const BARE_BUTTON: CSSProperties = {
  background: 'none',
  border: 0,
  padding: 0,
  margin: 0,
  display: 'inline-flex',
  color: 'inherit',
  cursor: 'pointer',
};

/** A bare icon used as a control (the grade page header), wrapped in a real button for keyboard and screen readers. */
export function IconButton({ name, label, onActivate, style }: { name: string; label: string; onActivate: () => void; style?: CSSProperties }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onActivate} style={{ ...BARE_BUTTON, ...style }}>
      <Icon name={name} />
    </button>
  );
}
