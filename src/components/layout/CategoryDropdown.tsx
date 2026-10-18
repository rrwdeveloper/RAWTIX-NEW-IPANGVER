import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

interface CategoryDropdownProps {
  id?: string;
  open: boolean;
  onClose: () => void;
}

export function CategoryDropdown({ id, open, onClose }: CategoryDropdownProps) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        id={id}
        role="region"
        aria-label="Catalogue navigation"
        className="fixed top-[57px] left-0 right-0 z-40 bg-background border-b border-border animate-in slide-in-from-top-2 duration-200"
      >
        <nav className="px-6 py-8 md:px-10">
          <ul className="space-y-4">
            <li>
              <Link
                to="/shop"
                onClick={onClose}
                className="font-heading text-sm tracking-[0.25em] uppercase text-foreground hover:text-muted-foreground transition-colors"
              >
                Ready stock
              </Link>
            </li>
            <li>
              <Link
                to="/pre-order"
                onClick={onClose}
                className="font-heading text-sm tracking-[0.25em] uppercase text-foreground hover:text-muted-foreground transition-colors"
              >
                Pre-order
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}
