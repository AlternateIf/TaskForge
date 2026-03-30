import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import {
  type RefObject,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { type Root, createRoot } from 'react-dom/client';

export interface MentionUser {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
}

export interface MentionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

interface MentionListProps {
  items: MentionUser[];
  command: (item: { id: string; label: string }) => void;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // biome-ignore lint/correctness/useExhaustiveDependencies: reset index when items change
    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useEffect(() => {
      const selected = containerRef.current?.children[selectedIndex] as HTMLElement | undefined;
      selected?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item.id, label: item.displayName });
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex);
          return true;
        }
        return event.key === 'Escape';
      },
    }));

    if (items.length === 0) {
      return (
        <div className="rounded-radius-lg bg-surface-container-lowest p-md text-small text-secondary shadow-2">
          No results
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className="max-h-[320px] overflow-y-auto rounded-radius-lg bg-surface-container-lowest p-xs shadow-2"
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-selected={index === selectedIndex}
            onClick={() => selectItem(index)}
            className={cn(
              'flex w-full items-center gap-sm rounded-radius-md px-sm py-xs text-left transition-colors',
              index === selectedIndex
                ? 'bg-surface-container-low text-foreground'
                : 'text-foreground hover:bg-surface-container-low',
            )}
          >
            <Avatar src={item.avatarUrl} name={item.displayName} userId={item.id} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-body font-medium">{item.displayName}</div>
              <div className="truncate text-label text-secondary">{item.email}</div>
            </div>
          </button>
        ))}
      </div>
    );
  },
);
MentionList.displayName = 'MentionList';

interface MentionComponent {
  ref: RefObject<MentionListRef | null>;
  element: HTMLElement;
  root: Root;
}

export function createMentionSuggestion(
  fetchUsers: (query: string) => MentionUser[] | Promise<MentionUser[]>,
) {
  return {
    items: async ({ query }: { query: string }) => {
      const users = await fetchUsers(query);
      return users.slice(0, 8);
    },

    render: () => {
      let component: MentionComponent | null = null;

      return {
        onStart: (props: SuggestionProps) => {
          const container = document.createElement('div');
          container.style.position = 'absolute';
          container.style.zIndex = '50';

          const rect = props.clientRect?.();
          if (rect) {
            container.style.left = `${rect.left}px`;
            container.style.top = `${rect.bottom + 4}px`;
          }

          document.body.appendChild(container);

          const ref: RefObject<MentionListRef | null> = { current: null };
          const root = createRoot(container);

          root.render(
            <MentionList ref={ref} items={props.items as MentionUser[]} command={props.command} />,
          );

          component = { ref, element: container, root };
        },

        onUpdate: (props: SuggestionProps) => {
          if (!component) return;

          const rect = props.clientRect?.();
          if (rect) {
            component.element.style.left = `${rect.left}px`;
            component.element.style.top = `${rect.bottom + 4}px`;
          }

          component.root.render(
            <MentionList
              ref={component.ref}
              items={props.items as MentionUser[]}
              command={props.command}
            />,
          );
        },

        onKeyDown: (props: SuggestionKeyDownProps) => {
          return component?.ref.current?.onKeyDown(props) ?? false;
        },

        onExit: () => {
          if (component) {
            component.root.unmount();
            component.element.remove();
            component = null;
          }
        },
      };
    },
  };
}
