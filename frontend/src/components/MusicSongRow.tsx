import { forwardRef } from 'react';
import { Play } from 'lucide-react';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import { ticksToReadableMusicTime } from '@/utils/timeConversion';
import type { MusicPlaybackTrack } from '@/context/MusicPlaybackContext';
import MusicItemContextMenu from '@/components/MusicItemContextMenu';

interface MusicSongRowProps {
    song: BaseItemDto;
    onPlay: () => void;
    showAlbum?: boolean;
    contextTracks: MusicPlaybackTrack[];
    startIndex: number;
}

const MusicSongRowInner = forwardRef<
    HTMLDivElement,
    Omit<MusicSongRowProps, 'contextTracks' | 'startIndex'>
>(({ song, onPlay, showAlbum = false }, ref) => (
    <div
        ref={ref}
        className="flex items-center gap-3 px-3 py-2 hover:bg-accent/50 rounded-md cursor-pointer group transition-colors"
        onClick={onPlay}
    >
        <div className="w-10 h-10 relative shrink-0">
            <img
                src={getPrimaryImageUrl(song.AlbumId || song.Id || '', {
                    width: 80,
                    height: 80,
                })}
                alt={song.Name || ''}
                className="w-10 h-10 rounded object-cover"
                loading="lazy"
            />
            <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-4 h-4 text-white" />
            </div>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm truncate">{song.Name}</span>
            <span className="text-xs text-muted-foreground truncate">
                {song.ArtistItems?.map((a) => a.Name).join(', ') || 'Unknown'}
                {showAlbum && song.Album && ` • ${song.Album}`}
            </span>
        </div>
        {song.UserData?.PlayCount !== undefined && song.UserData.PlayCount > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">
                {song.UserData.PlayCount}x
            </span>
        )}
        {song.RunTimeTicks && (
            <span className="text-xs text-muted-foreground shrink-0">
                {ticksToReadableMusicTime(song.RunTimeTicks)}
            </span>
        )}
    </div>
));
MusicSongRowInner.displayName = 'MusicSongRowInner';

const MusicSongRow = ({
    song,
    onPlay,
    showAlbum,
    contextTracks,
    startIndex,
}: MusicSongRowProps) => (
    <MusicItemContextMenu
        item={song}
        kind="song"
        contextTracks={contextTracks}
        startIndex={startIndex}
    >
        <MusicSongRowInner song={song} onPlay={onPlay} showAlbum={showAlbum} />
    </MusicItemContextMenu>
);

export default MusicSongRow;
