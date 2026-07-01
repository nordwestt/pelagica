import { useMemo, useState } from 'react';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Heart, ListEnd, ListMusic, ListPlus, ListStart, Play, Shuffle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMusicPlayback } from '@/hooks/useMusicPlayback';
import { useFavorite } from '@/hooks/api/useFavorite';
import { useAlbumTracks } from '@/hooks/api/useAlbumTracks';
import { AddToPlaylistDialog } from '@/components/AddToPlaylistDialog';
import type { MusicPlaybackTrack } from '@/context/MusicPlaybackContext';
import { getMusicContextKind, toPlaybackTrack, toPlaybackTracks } from '@/utils/musicPlaybackTrack';

interface MusicItemContextMenuProps {
    item: BaseItemDto;
    kind: 'song' | 'album';
    contextTracks?: MusicPlaybackTrack[];
    startIndex?: number;
    children: React.ReactNode;
}

const MusicItemContextMenu = ({
    item,
    kind,
    contextTracks,
    startIndex = 0,
    children,
}: MusicItemContextMenuProps) => {
    const { t } = useTranslation('music');
    const { t: tItem } = useTranslation('item');
    const { loadQueue, loadQueueShuffled, addToQueueStart, addToQueueEnd } = useMusicPlayback();
    const { isFavorite, toggleFavorite, isLoading: isFavoriteLoading } = useFavorite(item.Id);
    const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
    const [playlistDialogItemIds, setPlaylistDialogItemIds] = useState<string[]>([]);

    const resolvedKind = useMemo(() => getMusicContextKind(item.Type) ?? kind, [item.Type, kind]);

    const { data: albumTracks, isLoading: isLoadingAlbumTracks } = useAlbumTracks(
        resolvedKind === 'album' ? item.Id : undefined
    );

    const tracks = useMemo(() => {
        if (resolvedKind === 'album') {
            return albumTracks ? toPlaybackTracks(albumTracks, item) : [];
        }
        if (contextTracks && contextTracks.length > 0) {
            return contextTracks;
        }
        return [toPlaybackTrack(item)];
    }, [resolvedKind, albumTracks, item, contextTracks]);

    const selectedTrack = useMemo(() => toPlaybackTrack(item), [item]);

    const playlistItemIds = useMemo(() => {
        if (resolvedKind === 'album') {
            return tracks.map((track) => track.id).filter(Boolean);
        }
        return item.Id ? [item.Id] : [];
    }, [resolvedKind, tracks, item.Id]);

    const actionsDisabled =
        resolvedKind === 'album'
            ? isLoadingAlbumTracks || tracks.length === 0
            : !item.Id;

    const playlistDisabled = actionsDisabled || playlistItemIds.length === 0;

    const handlePlayNow = () => {
        loadQueue(tracks, startIndex, true);
    };

    const handleShuffleNow = () => {
        if (resolvedKind === 'song') {
            loadQueueShuffled([selectedTrack], true);
            return;
        }
        loadQueueShuffled(tracks, true);
    };

    const handleAddToQueueStart = () => {
        addToQueueStart(resolvedKind === 'song' ? [selectedTrack] : tracks);
    };

    const handleAddToQueueEnd = () => {
        addToQueueEnd(resolvedKind === 'song' ? [selectedTrack] : tracks);
    };

    const handleFavorite = () => {
        toggleFavorite(!isFavorite);
    };

    const handleOpenPlaylistDialog = (e: Event) => {
        e.preventDefault();
        if (playlistItemIds.length === 0) return;
        setPlaylistDialogItemIds(playlistItemIds);
        setPlaylistDialogOpen(true);
    };

    const handlePlaylistDialogOpenChange = (open: boolean) => {
        setPlaylistDialogOpen(open);
        if (!open) {
            setPlaylistDialogItemIds([]);
        }
    };

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
                <ContextMenuContent className="w-52">
                    <ContextMenuItem disabled={actionsDisabled} onSelect={handlePlayNow}>
                        <Play />
                        {t('play_now')}
                    </ContextMenuItem>
                    <ContextMenuItem disabled={actionsDisabled} onSelect={handleShuffleNow}>
                        <Shuffle />
                        {t('shuffle_now')}
                    </ContextMenuItem>
                    <ContextMenuSub>
                        <ContextMenuSubTrigger disabled={actionsDisabled}>
                            <ListPlus />
                            {t('add_to')}
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-48">
                            <ContextMenuItem
                                disabled={actionsDisabled}
                                onSelect={handleAddToQueueStart}
                            >
                                <ListStart />
                                {t('queue_start')}
                            </ContextMenuItem>
                            <ContextMenuItem
                                disabled={actionsDisabled}
                                onSelect={handleAddToQueueEnd}
                            >
                                <ListEnd />
                                {t('queue_end')}
                            </ContextMenuItem>
                            <ContextMenuItem
                                disabled={playlistDisabled}
                                onSelect={handleOpenPlaylistDialog}
                            >
                                <ListMusic />
                                {t('playlist')}
                            </ContextMenuItem>
                        </ContextMenuSubContent>
                    </ContextMenuSub>
                    <ContextMenuItem disabled={isFavoriteLoading} onSelect={handleFavorite}>
                        <Heart fill={isFavorite ? 'currentColor' : 'none'} />
                        {isFavorite ? tItem('unfavorite') : tItem('favorite')}
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            <AddToPlaylistDialog
                open={playlistDialogOpen}
                onOpenChange={handlePlaylistDialogOpenChange}
                itemIds={playlistDialogItemIds}
            />
        </>
    );
};

export default MusicItemContextMenu;

export function MusicAlbumContextMenuWrapper({
    item,
    children,
}: {
    item?: BaseItemDto;
    children: React.ReactNode;
}) {
    if (item?.Type !== 'MusicAlbum') return children;

    return (
        <MusicItemContextMenu item={item} kind="album">
            {children}
        </MusicItemContextMenu>
    );
}

export function MusicSongContextMenuWrapper({
    item,
    contextTracks,
    startIndex = 0,
    children,
}: {
    item?: BaseItemDto;
    contextTracks?: MusicPlaybackTrack[];
    startIndex?: number;
    children: React.ReactNode;
}) {
    if (item?.Type !== 'Audio' || !item) return children;

    return (
        <MusicItemContextMenu
            item={item}
            kind="song"
            contextTracks={contextTracks}
            startIndex={startIndex}
        >
            {children}
        </MusicItemContextMenu>
    );
}
