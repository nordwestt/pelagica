import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import type { MusicPlaybackTrack } from '@/context/MusicPlaybackContext';

export function toPlaybackTrack(item: BaseItemDto, album?: BaseItemDto): MusicPlaybackTrack {
    return {
        id: item.Id || '',
        title: item.Name || '',
        artist:
            item.ArtistItems?.[0]?.Name ||
            album?.ArtistItems?.[0]?.Name ||
            album?.AlbumArtist ||
            'Unknown',
        albumId: item.AlbumId || album?.Id || '',
        albumName: item.Album || album?.Name || '',
    };
}

export function toPlaybackTracks(items: BaseItemDto[], album?: BaseItemDto): MusicPlaybackTrack[] {
    return items.map((item) => toPlaybackTrack(item, album));
}
