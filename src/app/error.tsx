"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <h2 className="text-xl font-bold text-accent-red mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-muted mb-4">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm rounded-lg bg-accent-blue text-white hover:bg-accent-blue/80"
      >
        Try again
      </button>
    </div>
  );
}
