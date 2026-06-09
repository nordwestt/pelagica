import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';

const TICKS_PER_MINUTE = 60 * 10_000_000;
const DEFAULT_EPISODE_MINUTES = 30;
const DEFAULT_MOVIE_MINUTES = 105;
const MIN_SLOT_MINUTES = 15;
const MAX_SLOT_MINUTES = 180;

export interface LiveTvChannel {
    id: string;
    number: number;
    name: string;
    description: string;
    genreTerms: string[];
    typePreference?: string[];
}

export interface ScheduleProgram {
    item: BaseItemDto;
    channel: LiveTvChannel;
    start: Date;
    end: Date;
    startTicks: number;
    progress: number;
    slotIndex: number;
}

export const LIVE_TV_CHANNELS: LiveTvChannel[] = [
    {
        id: 'sitcoms',
        number: 1,
        name: 'Sitcoms',
        description: 'Comfort episodes, familiar casts, and half-hour discoveries.',
        genreTerms: ['comedy', 'sitcom'],
        typePreference: ['Episode'],
    },
    {
        id: 'animated-movies',
        number: 2,
        name: 'Animated Movies',
        description: 'Family-friendly animation with matinee and evening picks.',
        genreTerms: ['animation', 'animated', 'family'],
        typePreference: ['Movie'],
    },
    {
        id: 'sci-fi',
        number: 3,
        name: 'Sci-Fi',
        description: 'Space, futures, strange worlds, and late-night cult favorites.',
        genreTerms: ['science fiction', 'sci-fi', 'scifi', 'fantasy'],
    },
    {
        id: 'nature',
        number: 4,
        name: 'Nature',
        description: 'Documentaries, discoveries, and quieter overnight programming.',
        genreTerms: ['documentary', 'nature', 'animals', 'travel'],
    },
    {
        id: 'prime-cinema',
        number: 5,
        name: 'Prime Cinema',
        description: 'High-rated movies and bigger evening programming blocks.',
        genreTerms: ['drama', 'action', 'adventure', 'thriller'],
        typePreference: ['Movie'],
    },
];

function hashString(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function normalize(value: string | null | undefined): string {
    return value?.toLocaleLowerCase() ?? '';
}

function itemText(item: BaseItemDto): string {
    return [item.Name, item.SeriesName, item.Overview, ...(item.Genres ?? [])]
        .map(normalize)
        .join(' ');
}

function getRuntimeMinutes(item: BaseItemDto): number {
    const runtime = item.RunTimeTicks ? Math.round(item.RunTimeTicks / TICKS_PER_MINUTE) : 0;
    const fallback = item.Type === 'Episode' ? DEFAULT_EPISODE_MINUTES : DEFAULT_MOVIE_MINUTES;
    return Math.max(MIN_SLOT_MINUTES, Math.min(MAX_SLOT_MINUTES, runtime || fallback));
}

function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60_000);
}

function getDateSeed(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function getSeasonalBoost(item: BaseItemDto, date: Date): number {
    const text = itemText(item);
    const month = date.getMonth();
    const day = date.getDate();

    if (month === 11 && /christmas|holiday|xmas|winter/.test(text)) return 0.22;
    if (month === 9 && day >= 15 && /horror|halloween|slasher|supernatural/.test(text)) {
        return 0.24;
    }
    if ((month === 5 || month === 6 || month === 7) && /summer|beach|vacation/.test(text)) {
        return 0.12;
    }

    return 0;
}

function getTimeOfDayBoost(item: BaseItemDto, hour: number): number {
    const text = itemText(item);
    const rating = (item.CommunityRating ?? 0) / 10;

    if (hour >= 20 && hour < 23) {
        return (item.Type === 'Movie' ? 0.18 : 0) + rating * 0.16;
    }

    if (hour >= 0 && hour < 6) {
        return /documentary|cult|short|music/.test(text) ? 0.18 : -0.04;
    }

    if (hour >= 8 && hour < 18) {
        return /family|animation|kids|adventure/.test(text) ? 0.14 : 0;
    }

    return 0;
}

function scoreItem(
    item: BaseItemDto,
    channel: LiveTvChannel,
    date: Date,
    slotIndex: number,
    recentItemIds: string[]
): number {
    if (!item.Id) return Number.NEGATIVE_INFINITY;

    const seed = `${channel.id}:${getDateSeed(date)}:${slotIndex}`;
    const randomScore = hashString(`${seed}:${item.Id}`) / 0xffffffff;
    const text = itemText(item);
    const genreScore = channel.genreTerms.some((term) => text.includes(term)) ? 0.28 : 0;
    const typeScore = channel.typePreference?.includes(item.Type ?? '') ? 0.14 : 0;
    const favoriteScore = item.UserData?.IsFavorite ? 0.12 : 0;
    const ratingScore = ((item.CommunityRating ?? 0) / 10) * 0.1;
    const watchedPenalty = item.UserData?.Played ? -0.08 : 0;
    const recencyPenalty = recentItemIds.includes(item.Id) ? -0.5 : 0;

    return (
        randomScore +
        genreScore +
        typeScore +
        favoriteScore +
        ratingScore +
        watchedPenalty +
        recencyPenalty +
        getSeasonalBoost(item, date) +
        getTimeOfDayBoost(item, date.getHours())
    );
}

function getEligibleItems(items: BaseItemDto[], channel: LiveTvChannel): BaseItemDto[] {
    const playableItems = items.filter((item) => item.Id && item.Type && item.RunTimeTicks !== 0);
    const matchingItems = playableItems.filter((item) => {
        const text = itemText(item);
        const genreMatch = channel.genreTerms.some((term) => text.includes(term));
        const typeMatch = channel.typePreference?.includes(item.Type ?? '') ?? false;
        return genreMatch || typeMatch;
    });

    return matchingItems.length >= 8 ? matchingItems : playableItems;
}

function pickProgramItem(
    items: BaseItemDto[],
    channel: LiveTvChannel,
    date: Date,
    slotIndex: number,
    recentItemIds: string[]
): BaseItemDto | null {
    const eligibleItems = getEligibleItems(items, channel);
    if (!eligibleItems.length) return null;

    return eligibleItems.reduce(
        (bestItem, item) => {
            if (!bestItem) return item;
            const bestScore = scoreItem(bestItem, channel, date, slotIndex, recentItemIds);
            const itemScore = scoreItem(item, channel, date, slotIndex, recentItemIds);
            return itemScore > bestScore ? item : bestItem;
        },
        null as BaseItemDto | null
    );
}

export function generateChannelSchedule(
    channel: LiveTvChannel,
    items: BaseItemDto[],
    date: Date,
    lookAheadHours = 30
): ScheduleProgram[] {
    const schedule: ScheduleProgram[] = [];
    const scheduleStart = startOfDay(date);
    const scheduleEnd = addMinutes(scheduleStart, lookAheadHours * 60);
    let cursor = scheduleStart;
    let slotIndex = 0;
    const recentItemIds: string[] = [];

    while (cursor < scheduleEnd) {
        const item = pickProgramItem(items, channel, cursor, slotIndex, recentItemIds);
        if (!item) break;

        const durationMinutes = getRuntimeMinutes(item);
        const end = addMinutes(cursor, durationMinutes);
        const progress = Math.min(
            1,
            Math.max(0, (date.getTime() - cursor.getTime()) / (end.getTime() - cursor.getTime()))
        );

        schedule.push({
            item,
            channel,
            start: cursor,
            end,
            startTicks: Math.max(0, Math.floor((date.getTime() - cursor.getTime()) * 10_000)),
            progress,
            slotIndex,
        });

        recentItemIds.push(item.Id!);
        if (recentItemIds.length > 6) recentItemIds.shift();
        cursor = end;
        slotIndex += 1;
    }

    return schedule;
}

export function getCurrentProgram(schedule: ScheduleProgram[], date: Date): ScheduleProgram | null {
    return (
        schedule.find(
            (program) =>
                program.start.getTime() <= date.getTime() && program.end.getTime() > date.getTime()
        ) ??
        schedule[0] ??
        null
    );
}

export function formatProgramTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(start: Date, end: Date): string {
    const minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;

    if (!hours) return `${minutes}m`;
    if (!remainder) return `${hours}h`;
    return `${hours}h ${remainder}m`;
}
