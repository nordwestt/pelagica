import { getApi } from '@/api/getApi';
import { getRetryConfig } from '@/utils/authErrorHandler';
import { getUserId } from '@/utils/localstorageCredentials';
import type { BaseItemDto, BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import { useQuery } from '@tanstack/react-query';

const LIVE_TV_ITEM_TYPES: BaseItemKind[] = ['Movie', 'Episode', 'Video', 'MusicVideo'];

export function useLiveTvItems() {
    return useQuery<BaseItemDto[]>({
        queryKey: ['liveTvItems'],
        queryFn: async (): Promise<BaseItemDto[]> => {
            const api = getApi();
            const itemsApi = getItemsApi(api);

            const response = await itemsApi.getItems({
                userId: getUserId() || undefined,
                recursive: true,
                includeItemTypes: LIVE_TV_ITEM_TYPES,
                locationTypes: ['FileSystem'],
                enableUserData: true,
                enableImages: true,
                sortBy: ['SortName'],
                sortOrder: ['Ascending'],
                limit: 600,
                fields: [
                    'Genres',
                    'Overview',
                    'PrimaryImageAspectRatio',
                    'DateCreated',
                    'ParentId',
                    'RecursiveItemCount',
                ],
            });

            return response.data.Items ?? [];
        },
        staleTime: 1000 * 60 * 10,
        gcTime: 1000 * 60 * 30,
        ...getRetryConfig(),
    });
}
