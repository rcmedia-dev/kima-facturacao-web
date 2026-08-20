interface InfoCellProps {
  label: string;
  value: string;
  mono?: boolean;
}

export function InfoCell({ label, value, mono }: InfoCellProps) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-[13px] font-bold break-words text-slate-800 dark:text-slate-200 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}