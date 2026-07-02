import { X } from "lucide-react";

const FloatingModal = ({
  open,
  title,
  eyebrow,
  description,
  onClose,
  children,
  footer,
  maxWidth = "max-w-3xl",
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md">
      <section className={`flex max-h-[92vh] w-full ${maxWidth} flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl`}>
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            {eyebrow ? <p className="text-[11px] font-bold uppercase tracking-wider text-[#c5a059]">{eyebrow}</p> : null}
            <h2 className="text-xl font-black text-[#081c15]">{title}</h2>
            {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-5">{children}</div>

        {footer ? (
          <footer className="border-t border-slate-100 bg-slate-50 px-5 py-4">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
};

export default FloatingModal;
