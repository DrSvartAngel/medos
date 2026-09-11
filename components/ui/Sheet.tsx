import React from 'react';
import { Modal, type ModalProps } from './Modal';

export type SheetProps = Omit<ModalProps, 'presentation'>;

/**
 * Sheet primitive
 * Pre-configured bottom sheet presentation built on the canonical Modal foundation.
 * Uses Phase 14.3 radius.sheet (28px), canonical borders, and safe-area inset handling.
 */
export function Sheet(props: SheetProps) {
  return <Modal {...props} presentation="sheet" />;
}
