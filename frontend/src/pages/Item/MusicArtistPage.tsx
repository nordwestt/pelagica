import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { useArtistItems } from '@/hooks/api/useArtistItems';
import ItemsListPage from './ItemsListPage';

interface MusicArtistPageProps {
    item: BaseItemDto;
}

const MusicArtistPage = ({ item }: MusicArtistPageProps) => (
    <ItemsListPage item={item} useItems={useArtistItems} itemAspectClass="aspect-square" />
);

export default MusicArtistPage;
