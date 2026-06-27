import { useEffect, useMemo, useState } from 'react';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import {
    ContextMenu,
    ContextMenuCheckboxItem,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
    Heart,
    ListEnd,
    ListMusic,
    ListPlus,
    ListStart,
    Play,
    Shuffle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMusicPlayback } from '@/hooks/useMusicPlayback';
import { useFavorite } from '@/hooks/api/useFavorite';
import { useAlbumTracks } from '@/hooks/api/useAlbumTracks';
import { usePlaylists } from '@/hooks/api/playlist/usePlaylists';
import { useAddToPlaylist } from '@/hooks/api/playlist/useAddToPlaylist';
import { useRemoveFromPlaylist } from '@/hooks/api/playlist/useRemoveFromPlaylist';
import { usePlaylistPresence } from '@/hooks/api/playlist/usePlaylistPresence';
import { useCurrentUser } from '@/hooks/api/useCurrentUser';
import { useQueryClient } from '@tanstack/react-query';
import { CreatePlaylistDialog } from '@/components/CreatePlaylistDialog';
import type { MusicPlaybackTrack } from '@/context/MusicPlaybackContext';
import { toPlaybackTrack, toPlaybackTracks } from '@/utils/musicPlaybackTrack';

interface MusicItemContextMenuProps {
    item: BaseItemDto;
    kind: 'song' | 'album';
    contextTracks?: MusicPlaybackTrack[];
    startIndex?: number;
    children: React.ReactNode;
}

const SongPlaylistSubmenu = ({ trackId }: { trackId: string }) => {
    const { data: currentUser } = useCurrentUser();
    const {
        data: playlists,
        isLoading: isLoadingPlaylists,
        refetch: refetchPlaylists,
    } = usePlaylists(currentUser?.Id);
    const playlistIds = useMemo(
        () => playlists?.map((p) => p.Id!).filter(Boolean) || [],
        [playlists]
    );
    const {
        data: presence,
        isLoading: isCheckingPlaylists,
        refetch,
    } = usePlaylistPresence(trackId, playlistIds, currentUser?.Id);
    const addToPlaylist = useAddToPlaylist();
    const removeFromPlaylist = useRemoveFromPlaylist();
    const queryClient = useQueryClient();
    const [localPresence, setLocalPresence] = useState(presence || {});
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (presence) setLocalPresence(presence);
    }, [presence]);

    const handlePlaylistToggle = async (playlistId: string) => {
        const currentState = localPresence[playlistId]?.present || false;
        setLoadingStates((prev) => ({ ...prev, [playlistId]: true }));

        try {
            if (currentState) {
                const playlistItemId = localPresence[playlistId]?.playlistItemId;
                if (playlistItemId) {
                    await removeFromPlaylist.mutateAsync({
                        playlistId,
                        entryIds: [playlistItemId],
                    });
                    setLocalPresence((prev) => ({
                        ...prev,
                        [playlistId]: { present: false, playlistItemId: null },
                    }));
                }
            } else {
                await addToPlaylist.mutateAsync({
                    playlistId,
                    itemIds: [trackId],
                    userId: currentUser?.Id,
                });
                setLocalPresence((prev) => ({
                    ...prev,
                    [playlistId]: {
                        present: true,
                        playlistItemId: prev[playlistId]?.playlistItemId || null,
                    },
                }));
            }
            await queryClient.invalidateQueries({ queryKey: ['playlistPresence', trackId] });
            refetch();
        } catch (error) {
            console.error('Error toggling playlist:', error);
        } finally {
            setLoadingStates((prev) => ({ ...prev, [playlistId]: false }));
        }
    };

    return (
        <ContextMenuSubContent>
            {(isLoadingPlaylists || isCheckingPlaylists) && (
                <ContextMenuItem disabled>Loading...</ContextMenuItem>
            )}
            {!isLoadingPlaylists && playlists && playlists.length === 0 && (
                <ContextMenuItem disabled>No playlists found</ContextMenuItem>
            )}
            {!isCheckingPlaylists &&
                playlists?.map((playlist) => (
                    <ContextMenuCheckboxItem
                        key={playlist.Id}
                        checked={localPresence[playlist.Id!]?.present || false}
                        disabled={loadingStates[playlist.Id!]}
                        onCheckedChange={() => handlePlaylistToggle(playlist.Id!)}
                    >
                        {playlist.Name}
                    </ContextMenuCheckboxItem>
                ))}
            <CreatePlaylistDialog
                userId={currentUser?.Id}
                onSuccess={() => refetchPlaylists()}
                menuVariant="context"
            />
        </ContextMenuSubContent>
    );
};

const AlbumPlaylistSubmenu = ({
    trackIds,
    isLoadingTracks,
}: {
    trackIds: string[];
    isLoadingTracks: boolean;
}) => {
    const { data: currentUser } = useCurrentUser();
    const {
        data: playlists,
        isLoading: isLoadingPlaylists,
        refetch: refetchPlaylists,
    } = usePlaylists(currentUser?.Id);
    const addToPlaylist = useAddToPlaylist();
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

    const handleAddToPlaylist = async (playlistId: string) => {
        if (trackIds.length === 0) return;

        setLoadingStates((prev) => ({ ...prev, [playlistId]: true }));
        try {
            await addToPlaylist.mutateAsync({
                playlistId,
                itemIds: trackIds,
                userId: currentUser?.Id,
            });
        } catch (error) {
            console.error('Error adding album to playlist:', error);
        } finally {
            setLoadingStates((prev) => ({ ...prev, [playlistId]: false }));
        }
    };

    return (
        <ContextMenuSubContent>
            {(isLoadingPlaylists || isLoadingTracks) && (
                <ContextMenuItem disabled>Loading...</ContextMenuItem>
            )}
            {!isLoadingPlaylists && playlists && playlists.length === 0 && (
                <ContextMenuItem disabled>No playlists found</ContextMenuItem>
            )}
            {!isLoadingPlaylists &&
                playlists?.map((playlist) => (
                    <ContextMenuItem
                        key={playlist.Id}
                        disabled={loadingStates[playlist.Id!] || trackIds.length === 0}
                        onSelect={() => handleAddToPlaylist(playlist.Id!)}
                    >
                        {playlist.Name}
                    </ContextMenuItem>
                ))}
            <CreatePlaylistDialog
                userId={currentUser?.Id}
                onSuccess={() => refetchPlaylists()}
                menuVariant="context"
            />
        </ContextMenuSubContent>
    );
};

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

    const { data: albumTracks, isLoading: isLoadingAlbumTracks } = useAlbumTracks(
        kind === 'album' ? item.Id : undefined
    );

    const tracks = useMemo(() => {
        if (kind === 'album') {
            return albumTracks ? toPlaybackTracks(albumTracks, item) : [];
        }
        if (contextTracks && contextTracks.length > 0) {
            return contextTracks;
        }
        return [toPlaybackTrack(item)];
    }, [kind, albumTracks, item, contextTracks]);

    const albumTrackIds = useMemo(
        () => (albumTracks?.map((t) => t.Id!).filter(Boolean) as string[]) || [],
        [albumTracks]
    );

    const actionsDisabled =
        kind === 'album' ? isLoadingAlbumTracks || tracks.length === 0 : tracks.length === 0;

    const handlePlayNow = () => {
        loadQueue(tracks, startIndex, true);
    };

    const handleShuffleNow = () => {
        loadQueueShuffled(tracks, true);
    };

    const handleAddToQueueStart = () => {
        addToQueueStart(tracks);
    };

    const handleAddToQueueEnd = () => {
        addToQueueEnd(tracks);
    };

    const handleFavorite = () => {
        toggleFavorite(!isFavorite);
    };

    return (
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
                        <ContextMenuItem disabled={actionsDisabled} onSelect={handleAddToQueueStart}>
                            <ListStart />
                            {t('queue_start')}
                        </ContextMenuItem>
                        <ContextMenuItem disabled={actionsDisabled} onSelect={handleAddToQueueEnd}>
                            <ListEnd />
                            {t('queue_end')}
                        </ContextMenuItem>
                        <ContextMenuSub>
                            <ContextMenuSubTrigger>
                                <ListMusic />
                                {t('playlist')}
                            </ContextMenuSubTrigger>
                            {kind === 'song' && item.Id ? (
                                <SongPlaylistSubmenu trackId={item.Id} />
                            ) : (
                                <AlbumPlaylistSubmenu
                                    trackIds={albumTrackIds}
                                    isLoadingTracks={isLoadingAlbumTracks}
                                />
                            )}
                        </ContextMenuSub>
                    </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuItem disabled={isFavoriteLoading} onSelect={handleFavorite}>
                    <Heart fill={isFavorite ? 'currentColor' : 'none'} />
                    {isFavorite ? tItem('unfavorite') : tItem('favorite')}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
};

export default MusicItemContextMenu;
