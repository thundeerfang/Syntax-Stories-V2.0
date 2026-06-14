"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
export type UseDropdownResult<T extends HTMLElement = HTMLDivElement> =
  Readonly<{
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    toggle: () => void;
    close: () => void;
    rootRef: RefObject<T | null>;
    contentRef: RefObject<HTMLDivElement | null>;
  }>;
export function useDropdown<T extends HTMLElement = HTMLDivElement>(options?: {
  onClose?: () => void;
}): UseDropdownResult<T> {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<T>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    options?.onClose?.();
  }, [options?.onClose]);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  const isTargetInside = useCallback((target: Node) => {
    if (rootRef.current?.contains(target)) return true;
    if (contentRef.current?.contains(target)) return true;
    return false;
  }, []);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (isTargetInside(e.target as Node)) return;
      close();
    };
    const onScroll = (e: Event) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (isTargetInside(target)) return;
      close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointerDown);
    globalThis.addEventListener("scroll", onScroll, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      globalThis.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close, isTargetInside]);
  return { open, setOpen, toggle, close, rootRef, contentRef };
}
