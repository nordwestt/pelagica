import { getApi } from '@/api/getApi';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import { useQuery } from '@tanstack/react-query';
import type { ItemsQueryParams, ItemsQueryResult } from '@/pages/Item/ItemsListPage';

export function useArtistItems(artistId: string, params: ItemsQueryParams): ItemsQueryResult {
    const query = useQuery({
        queryKey: ['artist-items', artistId, params],
        queryFn: async () => {
            const api = getApi();
            const itemsApi = getItemsApi(api);

            const itemsResponse = await itemsApi.getItems({
                artistIds: [artistId],
                includeItemTypes: ['MusicAlbum'],
                recursive: true,
                excludeItemTypes: ['CollectionFolder'],
                sortBy: params.sortBy,
                sortOrder: params.sortOrder,
                limit: params.limit,
                startIndex: params.startIndex,
            });

            return {
                items: (itemsResponse.data?.Items ?? []) as BaseItemDto[],
                totalCount: itemsResponse.data?.TotalRecordCount ?? 0,
            };
        },
        enabled: !!artistId,
    });

    return {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error,
    };
}
