'use client';

import { useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';
import { FormDialog } from '@/components/ui/FormDialog';
import { squadsApi, type SquadSummary } from '@/api/squads';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ShareToSquadDialogProps = Readonly<{
  open: boolean;
  onClose: () => void;
  accessToken: string;
  postId: string;
}>;

export function ShareToSquadDialog({ open, onClose, accessToken, postId }: ShareToSquadDialogProps) {
  const [squads, setSquads] = useState<SquadSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void squadsApi
      .listMine(accessToken)
      .then((r) => {
        if (!cancelled) setSquads(r.squads);
      })
      .catch(() => {
        if (!cancelled) setSquads([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, accessToken]);

  const share = async (slug: string) => {
    setSharing(slug);
    try {
      await squadsApi.sharePost(slug, postId, accessToken);
      toast.success('Shared to squad');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not share');
    } finally {
      setSharing(null);
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Share to squad"
      titleId="share-squad-title"
      titleIcon={<Share2 className="h-5 w-5 text-primary" strokeWidth={2.5} aria-hidden />}
      subtitle="Pick a squad you belong to."
      interactionLock={sharing !== null}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading your squads…</p>
      ) : squads.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Join or create a squad first, then you can share feed posts into it.
        </p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {squads.map((s) => (
            <li key={s._id}>
              <button
                type="button"
                disabled={sharing !== null}
                onClick={() => void share(s.slug)}
                className={cn(
                  'flex w-full items-center gap-3 border-2 border-border bg-card px-3 py-2 text-left text-sm font-semibold transition-colors',
                  'hover:border-primary hover:bg-primary/5',
                  sharing === s.slug && 'opacity-60',
                )}
              >
                {s.iconUrl ? (
                  <img src={s.iconUrl} alt="" className="size-9 shrink-0 border-2 border-border object-cover" />
                ) : (
                  <div className="flex size-9 shrink-0 items-center justify-center border-2 border-border bg-muted text-[10px] font-black uppercase text-muted-foreground">
                    {s.name.slice(0, 1)}
                  </div>
                )}
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </FormDialog>
  );
}
