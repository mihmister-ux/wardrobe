 "use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserName } from "./useUserName";

export function NamePromptDialog() {
  const { name, isLoading, saveName } = useUserName();
  const [value, setValue] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const open = !isLoading && name === null;

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Введи имя");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await saveName(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">Как тебя зовут?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Мы запомним имя и будем обращаться к тебе на главной.</p>
        
        <input
          autoFocus
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") void handleSave(); }}
          placeholder="Твоё имя"
          maxLength={40}
          className="mt-4 h-11 w-full rounded-xl border border-border bg-transparent px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

        <Button onClick={() => void handleSave()} disabled={isSaving} className="mt-4 w-full rounded-full">
          {isSaving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Сохраняем…</> : "Начать"}
        </Button>
      </div>
    </div>
  );
}
