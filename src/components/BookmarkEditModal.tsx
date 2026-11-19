import React, { useEffect, useMemo, useState } from 'react';
import { Check, Folder, FolderPlus, Save, Search, Trash2, X } from 'lucide-react';
import type { BookmarkFolderNode, UnifiedSearchItem } from '../types';

interface BookmarkEditModalProps {
  bookmark: UnifiedSearchItem | null;
  folders: BookmarkFolderNode[];
  onClose: () => void;
  onSave: (
    bookmarkId: string,
    updates: { title: string; url: string; targetFolderId: string }
  ) => Promise<void>;
  onCreateSubfolder: (parentFolderId: string, folderName: string) => Promise<string>;
  onDelete: (bookmark: UnifiedSearchItem) => void;
}

export const BookmarkEditModal: React.FC<BookmarkEditModalProps> = ({
  bookmark,
  folders,
  onClose,
  onSave,
  onCreateSubfolder,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('1');
  const [folderQuery, setFolderQuery] = useState('');
  const [creatingSubfolder, setCreatingSubfolder] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bookmark) {
      setTitle(bookmark.title);
      setUrl(bookmark.url);
      setSelectedFolderId(bookmark.parentFolderId ?? folders[0]?.id ?? '1');
      setFolderQuery('');
      setCreatingSubfolder(false);
      setNewSubfolderName('');
    }
  }, [bookmark, folders]);

  const filteredFolders = useMemo(() => {
    const q = folderQuery.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter((f) => f.pathString.toLowerCase().includes(q));
  }, [folders, folderQuery]);

  if (!bookmark || !bookmark.bookmarkId) return null;

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave(bookmark.bookmarkId!, {
        title: title.trim(),
        url: url.trim(),
        targetFolderId: selectedFolderId,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSubfolder = async () => {
    if (!newSubfolderName.trim()) return;
    const newId = await onCreateSubfolder(selectedFolderId, newSubfolderName.trim());
    setSelectedFolderId(newId);
    setNewSubfolderName('');
    setCreatingSubfolder(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit or move bookmark"
      className="absolute inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-modal-backdrop)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border"
        style={{
          backgroundColor: 'var(--bg-app)',
          borderColor: 'var(--border-strong)',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Edit &amp; Organize Bookmark
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1 transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-4 py-3">
          <div>
            <label
              className="mb-1 block text-[11px] font-semibold"
              style={{ color: 'var(--text-secondary)' }}
            >
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label
              className="mb-1 block text-[11px] font-semibold"
              style={{ color: 'var(--text-secondary)' }}
            >
              URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label
                className="text-[11px] font-semibold"
                style={{ color: 'var(--text-secondary)' }}
              >
                Folder Location
              </label>
              <button
                type="button"
                onClick={() => setCreatingSubfolder((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] font-medium"
                style={{ color: 'var(--accent)' }}
              >
                <FolderPlus className="h-3 w-3" />
                New Subfolder
              </button>
            </div>

            {selectedFolder && (
              <div
                className="mb-1.5 flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] font-medium"
                style={{
                  backgroundColor: 'var(--folder-bg)',
                  borderColor: 'var(--folder-border)',
                  color: 'var(--folder-tint)',
                }}
              >
                <Folder className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{selectedFolder.pathString}</span>
              </div>
            )}

            {creatingSubfolder && (
              <div className="mb-2 flex items-center gap-1.5">
                <input
                  type="text"
                  value={newSubfolderName}
                  onChange={(e) => setNewSubfolderName(e.target.value)}
                  placeholder={`Subfolder inside "${selectedFolder?.title ?? 'Bookmarks'}"…`}
                  className="flex-1 rounded-lg border px-2.5 py-1 text-xs outline-none"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreateSubfolder}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--accent-strong)',
                    color: 'var(--accent-contrast)',
                  }}
                >
                  Create
                </button>
              </div>
            )}

            <div className="relative mb-1.5 flex items-center">
              <Search
                className="pointer-events-none absolute left-2.5 h-3.5 w-3.5"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                value={folderQuery}
                onChange={(e) => setFolderQuery(e.target.value)}
                placeholder="Filter destination folder…"
                className="w-full rounded-lg border py-1 pr-2.5 pl-8 text-xs outline-none placeholder:text-[var(--text-muted)]"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div
              className="max-h-36 space-y-0.5 overflow-y-auto rounded-xl border p-1"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {filteredFolders.map((folder) => {
                const isSelected = folder.id === selectedFolderId;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => setSelectedFolderId(folder.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-[var(--bg-hover)]"
                    style={{
                      backgroundColor: isSelected ? 'var(--bg-selected)' : 'transparent',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    <span className="truncate">{folder.pathString}</span>
                    {isSelected && (
                      <Check
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: 'var(--accent)' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-between border-t px-4 py-2.5"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              onDelete(bookmark);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--danger-bg)]"
            style={{ color: 'var(--danger-tint)' }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--bg-hover)]"
              style={{
                borderColor: 'var(--border-strong)',
                color: 'var(--text-secondary)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-95 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent-strong)',
                color: 'var(--accent-contrast)',
              }}
            >
              <Save className="h-3.5 w-3.5" />
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
