import type { CSSProperties, MouseEventHandler } from 'react';

interface IconProps {
  name: string;
  className?: string;
  style?: CSSProperties;
  id?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  'aria-hidden'?: boolean;
  'aria-label'?: string;
}

/** An Ionicons icon. Decorative unless given an aria-label. */
export function Icon({ name, ...rest }: IconProps) {
  return <ion-icon name={name} aria-hidden={rest['aria-label'] ? undefined : true} {...rest} />;
}
