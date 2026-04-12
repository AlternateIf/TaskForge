import type { Checklist } from '@/api/checklists';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight } from 'lucide-react';

interface ChecklistSectionProps {
  checklists: Checklist[];
  pendingItemIds?: Set<string>;
  onToggleItem: (itemId: string, isCompleted: boolean) => void;
  readOnly?: boolean;
}

export function ChecklistSection({
  checklists,
  pendingItemIds,
  onToggleItem,
  readOnly = false,
}: ChecklistSectionProps) {
  return (
    <details
      className="group rounded-radius-lg border border-border/20 bg-surface-container-low/40 p-md"
      open
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-sm [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-xs text-label font-bold uppercase tracking-widest text-secondary">
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
          Checklists
        </span>
      </summary>

      <div className="mt-md space-y-md">
        {checklists.length === 0 ? (
          <p className="rounded-radius-md border border-dashed border-border p-sm text-small text-muted">
            No checklists available.
          </p>
        ) : (
          checklists.map((checklist) => {
            const completed = checklist.items.filter((item) => item.isCompleted).length;
            return (
              <article
                key={checklist.id}
                className="space-y-sm rounded-radius-lg border border-border/20 bg-surface-container-low/50 p-md"
              >
                <header className="flex items-center justify-between gap-sm">
                  <h4 className="text-body font-semibold text-foreground">{checklist.title}</h4>
                  <span className="text-label text-secondary">
                    {completed}/{checklist.items.length}
                  </span>
                </header>

                <ul className="space-y-xs">
                  {checklist.items.map((item) => {
                    const pending = pendingItemIds?.has(item.id);
                    return (
                      <li
                        key={item.id}
                        className="flex items-center gap-sm rounded-radius-md p-xs hover:bg-surface-container-low"
                      >
                        <Checkbox
                          checked={item.isCompleted}
                          disabled={pending || readOnly}
                          onChange={(event) => onToggleItem(item.id, event.target.checked)}
                          aria-label={`Checklist item ${item.title}`}
                        />
                        <span
                          className={
                            item.isCompleted
                              ? 'text-body text-secondary line-through'
                              : 'text-body text-foreground'
                          }
                        >
                          {item.title}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })
        )}
      </div>
    </details>
  );
}
