export function SaveSuccessBanner({ saved }: { saved?: boolean }) {
  if (!saved) {
    return null;
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
      Resume saved successfully.
    </div>
  );
}
