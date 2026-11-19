import React, { useState } from 'react';
import { BookOpen, Clock, Folder, History, Layers } from 'lucide-react';
import type { UnifiedSearchItem } from '../types';
import { getFaviconUrl } from '../adapters/browserAdapter';
import { getMonogramLetter } from '../engine/urlUtils';
import { TAB_GROUP_PALETTE } from '../constants/tabGroupColors';

const DOMAIN_HUES = [
  { bg: 'rgba(99, 102, 241, 0.16)', fg: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' },
  { bg: 'rgba(14, 165, 233, 0.16)', fg: '#38bdf8', border: 'rgba(14, 165, 233, 0.3)' },
  { bg: 'rgba(16, 185, 129, 0.16)', fg: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  { bg: 'rgba(245, 158, 11, 0.16)', fg: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  { bg: 'rgba(236, 72, 153, 0.16)', fg: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' },
  { bg: 'rgba(168, 85, 247, 0.16)', fg: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

interface ItemFaviconProps {
  item: UnifiedSearchItem;
}

export const ItemFavicon: React.FC<ItemFaviconProps> = ({ item }) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (item.kind === 'folder') {
    return (
      <div
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
        style={{
          backgroundColor: 'var(--folder-bg)',
          borderColor: 'var(--folder-border)',
          color: 'var(--folder-tint)',
        }}
      >
        <Folder className="h-4 w-4" />
      </div>
    );
  }

  if (item.kind === 'tab_group' && item.tabGroup) {
    const palette = TAB_GROUP_PALETTE[item.tabGroup.color] ?? TAB_GROUP_PALETTE.grey;
    return (
      <div
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
        style={{
          backgroundColor: palette.darkBg,
          borderColor: palette.darkBorder,
          color: palette.dot,
        }}
      >
        <Layers className="h-4 w-4" />
      </div>
    );
  }

  const resolvedFavicon = !imgFailed
    ? getFaviconUrl(item.url, item.favIconUrl)
    : undefined;

  const isLiveOpen = item.kind === 'tab' || item.openTabs.length > 0;
  const hue = DOMAIN_HUES[hashString(item.domain || item.title) % DOMAIN_HUES.length];
  const monogram = getMonogramLetter(item.domain, item.title);

  return (
    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
      {resolvedFavicon ? (
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <img
            src={resolvedFavicon}
            alt=""
            className="h-4 w-4 rounded-sm object-contain"
            onError={() => setImgFailed(true)}
            loading="lazy"
          />
        </div>
      ) : (
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold select-none"
          style={{
            backgroundColor: hue.bg,
            borderColor: hue.border,
            color: hue.fg,
          }}
        >
          {item.kind === 'reading_list' ? (
            <BookOpen className="h-3.5 w-3.5" />
          ) : item.kind === 'closed_tab' ? (
            <Clock className="h-3.5 w-3.5" />
          ) : item.kind === 'history' ? (
            <History className="h-3.5 w-3.5" />
          ) : (
            monogram
          )}
        </div>
      )}

      {isLiveOpen && (
        <span
          title="Currently open in a browser tab"
          className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2"
          style={{
            backgroundColor: '#10b981',
            borderColor: 'var(--bg-app)',
          }}
        />
      )}
    </div>
  );
};
