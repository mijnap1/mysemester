'use client';

import { useLayoutEffect, useRef } from 'react';
import { Icon } from '@/components/Icon';

export interface MenuPosition {
  x: number;
  y: number;
  id: string;
}

/** Keep a menu opened at (x, y) inside the viewport. */
function useClampedPosition(position: MenuPosition | null) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !position) return;
    const pad = 8;
    const w = el.offsetWidth || 200;
    const h = el.offsetHeight || 160;
    el.style.left = `${Math.min(position.x, window.innerWidth - w - pad)}px`;
    el.style.top = `${Math.min(position.y, window.innerHeight - h - pad)}px`;
  }, [position]);
  return ref;
}

interface CourseMenuProps {
  position: MenuPosition | null;
  inFolder: boolean;
  creditLabel: string | null;
  creditOn: boolean;
  onAction: (action: 'edit' | 'dup' | 'detach' | 'crncr' | 'del', id: string) => void;
}

export function CourseMenu({ position, inFolder, creditLabel, creditOn, onAction }: CourseMenuProps) {
  const ref = useClampedPosition(position);
  const act = (action: Parameters<CourseMenuProps['onAction']>[0]) => position && onAction(action, position.id);
  return (
    <div className={position ? 'ctx show' : 'ctx'} id="ctxMenu" role="menu" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button type="button" role="menuitem" onClick={() => act('edit')}>
        <Icon name="create-outline" /> Edit course
      </button>
      <button type="button" role="menuitem" onClick={() => act('dup')}>
        <Icon name="copy-outline" /> Duplicate
      </button>
      {inFolder && (
        <button type="button" role="menuitem" onClick={() => act('detach')}>
          <Icon name="return-up-back-outline" /> Remove from folder
        </button>
      )}
      {creditLabel && (
        <button type="button" role="menuitem" onClick={() => act('crncr')}>
          <Icon name="shield-checkmark-outline" />
          <span>{creditOn ? `Remove ${creditLabel}` : `Set ${creditLabel}`}</span>
        </button>
      )}
      <div className="ctx-sep" role="separator" />
      <button type="button" role="menuitem" className="danger" onClick={() => act('del')}>
        <Icon name="trash-outline" /> Remove
      </button>
    </div>
  );
}

interface FolderMenuProps {
  position: MenuPosition | null;
  hasParent: boolean;
  onAction: (action: 'rename' | 'detach' | 'del', id: string) => void;
}

export function FolderMenu({ position, hasParent, onAction }: FolderMenuProps) {
  const ref = useClampedPosition(position);
  const act = (action: Parameters<FolderMenuProps['onAction']>[0]) => position && onAction(action, position.id);
  return (
    <div className={position ? 'ctx show' : 'ctx'} id="folderCtxMenu" role="menu" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button type="button" role="menuitem" onClick={() => act('rename')}>
        <Icon name="pencil-outline" /> Rename folder
      </button>
      {hasParent && (
        <button type="button" role="menuitem" onClick={() => act('detach')}>
          <Icon name="return-up-back-outline" /> Remove from folder
        </button>
      )}
      <div className="ctx-sep" role="separator" />
      <button type="button" role="menuitem" className="danger" onClick={() => act('del')}>
        <Icon name="trash-outline" /> Delete folder
      </button>
    </div>
  );
}
