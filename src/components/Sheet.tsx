"use client";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/** Accessible bottom sheet (dialog) — full-width on phones, centered card on desktop. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-black/40 backdrop:backdrop-blur-[2px] sm:m-auto sm:max-w-lg"
    >
      {open && (
        <div className="sheet card rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink sm:rounded-b-[1.25rem]">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-black">{title}</h2>
            <button className="btn btn-ghost ml-auto !p-2" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
