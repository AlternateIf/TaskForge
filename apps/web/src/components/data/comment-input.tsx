import { type MentionUser, RichTextEditor, type RichTextEditorProps } from '@/components/editor';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface CommentInputProps {
  currentUserName?: string;
  currentUserId?: string;
  loading?: boolean;
  onSubmit: (body: string) => Promise<void> | void;
  fetchMentionUsers?: (query: string) => MentionUser[] | Promise<MentionUser[]>;
  onImageUpload?: RichTextEditorProps['onImageUpload'];
  stickyMobile?: boolean;
}

export function CommentInput({
  currentUserName,
  currentUserId,
  loading,
  onSubmit,
  fetchMentionUsers,
  onImageUpload,
  stickyMobile,
}: CommentInputProps) {
  const [draft, setDraft] = useState('');
  const [editorKey, setEditorKey] = useState(0);

  async function submitComment() {
    const normalized = draft.trim();
    if (!normalized || loading) return;

    try {
      await onSubmit(normalized);
      setDraft('');
      setEditorKey((prev) => prev + 1);
    } catch {
      // parent handles toast/error reporting
    }
  }

  return (
    <section
      className={
        stickyMobile
          ? 'border-t border-border/20 bg-surface-container-lowest px-md pb-md pt-sm md:border-0 md:bg-transparent md:p-0'
          : 'space-y-sm'
      }
    >
      {!stickyMobile ? (
        <h3 className="text-label font-bold uppercase tracking-widest text-secondary">
          Add comment
        </h3>
      ) : null}

      <div className="flex items-start gap-sm">
        <Avatar name={currentUserName} userId={currentUserId} size="md" />

        <div
          className="min-w-0 flex-1 space-y-xs"
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              void submitComment();
            }
          }}
        >
          <RichTextEditor
            key={editorKey}
            mode="comment"
            placeholder="Write a comment... Use @ to mention"
            fetchMentionUsers={fetchMentionUsers}
            onImageUpload={onImageUpload}
            onUpdate={setDraft}
          />

          <div className="flex justify-end">
            <Button loading={loading} onClick={() => void submitComment()}>
              Comment
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
