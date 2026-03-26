"use client";

import { useState } from "react";

interface Props {
  games: { slug: string; name: string }[];
}

export default function CsvUploadForm({ games }: Props) {
  const [selectedGame, setSelectedGame] = useState(games[0]?.slug ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    drawsAdded?: number;
    errors?: string[];
  } | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !selectedGame) return;

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("gameSlug", selectedGame);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, errors: ["Network error"] });
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      <div className="flex gap-4">
        <select
          value={selectedGame}
          onChange={(e) => setSelectedGame(e.target.value)}
          className="px-3 py-2 rounded-lg bg-background border border-card-border text-sm text-foreground"
        >
          {games.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.name}
            </option>
          ))}
        </select>

        <input
          type="file"
          accept=".csv,.txt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-accent-blue file:text-white file:cursor-pointer"
        />

        <button
          type="submit"
          disabled={!file || uploading}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-accent-green hover:bg-accent-green/80 text-white disabled:opacity-50 transition-colors"
        >
          {uploading ? "Importing..." : "Import CSV"}
        </button>
      </div>

      {result && (
        <div
          className={`p-3 rounded-lg text-sm ${
            result.success
              ? "bg-accent-green/10 text-accent-green"
              : "bg-accent-red/10 text-accent-red"
          }`}
        >
          {result.success ? (
            <p>Successfully imported {result.drawsAdded} draws.</p>
          ) : (
            <div>
              <p>Import failed:</p>
              <ul className="list-disc ml-4 mt-1 text-xs">
                {result.errors?.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
