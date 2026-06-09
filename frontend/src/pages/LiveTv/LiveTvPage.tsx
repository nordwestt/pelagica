import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useLiveTvItems } from '@/hooks/api/useLiveTvItems';
import { cn } from '@/lib/utils';
import { getBackdropUrl, getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { CalendarClock, Clapperboard, ImageOff, Info, Play, Radio } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import Page from '../Page';
import {
    formatDuration,
    formatProgramTime,
    generateChannelSchedule,
    getCurrentProgram,
    LIVE_TV_CHANNELS,
    type LiveTvChannel,
    type ScheduleProgram,
} from './schedule';

const TIMELINE_MINUTES = 180;
const SLOT_MINUTES = 30;
const PIXELS_PER_MINUTE = 7;
const CHANNEL_COLUMN_WIDTH = 176;
const ROW_HEIGHT = 78;
const TIMELINE_WIDTH = TIMELINE_MINUTES * PIXELS_PER_MINUTE;

type ChannelSchedule = {
    channel: LiveTvChannel;
    schedule: ScheduleProgram[];
    currentProgram: ScheduleProgram | null;
};

function getDisplayTitle(item: BaseItemDto): string {
    if (item.Type === 'Episode' && item.SeriesName) {
        return `${item.SeriesName}: ${item.Name ?? ''}`;
    }

    return item.Name ?? 'Untitled';
}

function getProgramSubtitle(program: ScheduleProgram): string {
    const item = program.item;
    const parts = [
        item.ProductionYear?.toString(),
        item.OfficialRating,
        formatDuration(program.start, program.end),
    ].filter(Boolean);

    return parts.join(' | ');
}

function getPlayUrl(program: ScheduleProgram): string {
    const startTicks = Math.max(0, program.startTicks);
    return `/play/${program.item.Id}${startTicks > 0 ? `?startTicks=${startTicks}` : ''}`;
}

function getProgramKey(program: ScheduleProgram): string {
    return `${program.channel.id}-${program.slotIndex}`;
}

function getTimelineStart(date: Date): Date {
    const start = new Date(date);
    start.setSeconds(0, 0);
    start.setMinutes(Math.floor(start.getMinutes() / SLOT_MINUTES) * SLOT_MINUTES);
    return start;
}

function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60_000);
}

function getMinutesBetween(start: Date, end: Date): number {
    return (end.getTime() - start.getTime()) / 60_000;
}

function getVisiblePrograms(schedule: ScheduleProgram[], timelineStart: Date, timelineEnd: Date) {
    return schedule.filter(
        (program) =>
            program.end.getTime() > timelineStart.getTime() &&
            program.start.getTime() < timelineEnd.getTime()
    );
}

function isProgramLive(program: ScheduleProgram, now: Date): boolean {
    return program.start.getTime() <= now.getTime() && program.end.getTime() > now.getTime();
}

const LiveTvSkeleton = () => (
    <div className="flex min-h-dvh flex-col gap-4 px-4 pb-8 pt-24 sm:px-12">
        <Skeleton className="h-56 rounded-md" />
        <Skeleton className="h-12 rounded-md" />
        <div className="grid gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-md" />
            ))}
        </div>
    </div>
);

const ProgramArtwork = ({ item, className }: { item: BaseItemDto; className?: string }) => {
    const [imageError, setImageError] = useState(false);
    const imageUrl = item.Id
        ? getPrimaryImageUrl(item.Id, { maxWidth: 416, maxHeight: 640 }, item.ImageTags?.Primary)
        : '';

    if (!imageUrl || imageError) {
        return (
            <div className={cn('bg-muted flex items-center justify-center rounded-md', className)}>
                <ImageOff className="size-5 text-muted-foreground" />
            </div>
        );
    }

    return (
        <img
            src={imageUrl}
            alt={item.Name ?? ''}
            loading="lazy"
            onError={() => setImageError(true)}
            className={cn('rounded-md object-cover poster-card-outline', className)}
        />
    );
};

const SelectedProgramPanel = ({ program, now }: { program: ScheduleProgram; now: Date }) => {
    const { t } = useTranslation('livetv');
    const live = isProgramLive(program, now);
    const hasStarted = program.start.getTime() <= now.getTime();
    const backdropUrl = program.item.Id
        ? getBackdropUrl(
              program.item.Id,
              { maxWidth: 1280, maxHeight: 720 },
              program.item.BackdropImageTags?.[0]
          )
        : '';

    return (
        <section className="relative flex h-[19rem] overflow-hidden border-b bg-background px-4 pb-4 pt-18 sm:h-[24rem] sm:px-12">
            <div className="absolute inset-0 -z-10 bg-background">
                {backdropUrl && (
                    <img
                        src={backdropUrl}
                        alt=""
                        className="h-full w-full object-cover opacity-25"
                    />
                )}
                <div className="absolute inset-0 bg-linear-to-r from-background via-background/90 to-background/60" />
                <div className="absolute inset-0 bg-linear-to-b from-background/40 via-background/80 to-background" />
            </div>

            <div className="grid h-full min-h-0 w-full max-w-6xl grid-cols-1 items-center gap-5 md:grid-cols-[13rem_minmax(0,1fr)]">
                <ProgramArtwork
                    item={program.item}
                    className="hidden aspect-video w-full md:block"
                />
                <div className="flex min-h-0 min-w-0 flex-col justify-center gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge className="gap-1">
                            <Radio className="size-3" />
                            {t('channel_label', {
                                number: program.channel.number,
                                name: program.channel.name,
                            })}
                        </Badge>
                        <Badge variant="outline">
                            {formatProgramTime(program.start)} - {formatProgramTime(program.end)}
                        </Badge>
                        <Badge variant="secondary">{getProgramSubtitle(program)}</Badge>
                    </div>
                    <div className="min-h-0">
                        <h1 className="line-clamp-2 max-w-4xl text-3xl font-bold leading-tight sm:text-5xl">
                            {getDisplayTitle(program.item)}
                        </h1>
                        <p className="mt-2 max-h-16 max-w-4xl overflow-y-auto pr-2 text-sm text-muted-foreground sm:max-h-20 sm:text-base">
                            {program.item.Overview || program.channel.description}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {live ? (
                            <Button asChild>
                                <Link to={getPlayUrl(program)}>
                                    <Play />
                                    {t('watch_live')}
                                </Link>
                            </Button>
                        ) : (
                            <Button disabled>
                                <CalendarClock />
                                {hasStarted
                                    ? t('finished_at', { time: formatProgramTime(program.end) })
                                    : t('starts_at', { time: formatProgramTime(program.start) })}
                            </Button>
                        )}
                        <Button asChild variant="secondary">
                            <Link to={`/item/${program.item.Id}`}>
                                <Info />
                                {t('details')}
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
};

const ChannelCell = ({ channel, currentProgram }: ChannelSchedule) => (
    <div
        className="sticky left-0 z-20 flex items-center gap-3 border-r border-b bg-background/95 px-3 backdrop-blur"
        style={{ width: CHANNEL_COLUMN_WIDTH, height: ROW_HEIGHT }}
    >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold">
            {channel.number}
        </div>
        <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{channel.name}</p>
            <p className="truncate text-xs text-muted-foreground">
                {currentProgram ? getDisplayTitle(currentProgram.item) : channel.description}
            </p>
        </div>
    </div>
);

const ProgramBlock = ({
    program,
    timelineStart,
    timelineEnd,
    selected,
    onSelect,
}: {
    program: ScheduleProgram;
    timelineStart: Date;
    timelineEnd: Date;
    selected: boolean;
    onSelect: () => void;
}) => {
    const clippedStart = new Date(Math.max(program.start.getTime(), timelineStart.getTime()));
    const clippedEnd = new Date(Math.min(program.end.getTime(), timelineEnd.getTime()));
    const left = Math.max(0, getMinutesBetween(timelineStart, clippedStart) * PIXELS_PER_MINUTE);
    const width = Math.max(36, getMinutesBetween(clippedStart, clippedEnd) * PIXELS_PER_MINUTE);
    const live = program.progress > 0 && program.progress < 1;

    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                'absolute top-1 bottom-1 overflow-hidden border bg-card px-3 py-2 text-left transition-colors hover:bg-accent',
                selected && 'z-10 border-primary bg-primary/10',
                live && !selected && 'border-primary/60'
            )}
            style={{ left, width }}
        >
            <div className="flex h-full min-w-0 flex-col justify-between">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                        {getDisplayTitle(program.item)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {formatProgramTime(program.start)} - {formatProgramTime(program.end)}
                    </p>
                </div>
                {live && (
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.round(program.progress * 100)}%` }}
                        />
                    </div>
                )}
            </div>
        </button>
    );
};

const GuideGrid = ({
    channelSchedules,
    timelineStart,
    selectedProgramKey,
    onSelectProgram,
    now,
}: {
    channelSchedules: ChannelSchedule[];
    timelineStart: Date;
    selectedProgramKey: string | null;
    onSelectProgram: (program: ScheduleProgram) => void;
    now: Date;
}) => {
    const { t } = useTranslation('livetv');
    const timelineEnd = addMinutes(timelineStart, TIMELINE_MINUTES);
    const timeSlots = Array.from({ length: TIMELINE_MINUTES / SLOT_MINUTES + 1 }, (_, index) =>
        addMinutes(timelineStart, index * SLOT_MINUTES)
    );
    const nowOffset = Math.max(
        0,
        Math.min(TIMELINE_WIDTH, getMinutesBetween(timelineStart, now) * PIXELS_PER_MINUTE)
    );

    return (
        <section className="px-4 pb-8 sm:px-12">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-2xl font-bold">
                    <CalendarClock className="size-5" />
                    {t('guide_title')}
                </h2>
                <Badge variant="outline">{now.toLocaleDateString()}</Badge>
            </div>
            <div className="overflow-x-auto rounded-md border bg-background">
                <div style={{ width: CHANNEL_COLUMN_WIDTH + TIMELINE_WIDTH }}>
                    <div className="sticky top-0 z-30 flex border-b bg-background/95 backdrop-blur">
                        <div
                            className="sticky left-0 z-40 flex items-center border-r bg-background/95 px-3 text-sm font-semibold"
                            style={{ width: CHANNEL_COLUMN_WIDTH, height: 52 }}
                        >
                            {t('all_channels')}
                        </div>
                        <div className="relative" style={{ width: TIMELINE_WIDTH, height: 52 }}>
                            {timeSlots.map((time, index) => (
                                <div
                                    key={time.toISOString()}
                                    className="absolute top-0 flex h-full items-center border-l px-2 text-sm font-medium text-muted-foreground"
                                    style={{ left: index * SLOT_MINUTES * PIXELS_PER_MINUTE }}
                                >
                                    {formatProgramTime(time)}
                                </div>
                            ))}
                            <div
                                className="absolute top-0 h-full w-0.5 bg-primary"
                                style={{ left: nowOffset }}
                            />
                        </div>
                    </div>

                    <div className="relative">
                        <div
                            className="pointer-events-none absolute top-0 bottom-0 z-20 w-0.5 bg-primary"
                            style={{ left: CHANNEL_COLUMN_WIDTH + nowOffset }}
                        />
                        {channelSchedules.map((channelSchedule) => (
                            <div key={channelSchedule.channel.id} className="flex">
                                <ChannelCell {...channelSchedule} />
                                <div
                                    className="relative border-b bg-muted/20"
                                    style={{ width: TIMELINE_WIDTH, height: ROW_HEIGHT }}
                                >
                                    {timeSlots.slice(0, -1).map((time, index) => (
                                        <div
                                            key={time.toISOString()}
                                            className="absolute top-0 bottom-0 border-l border-border/70"
                                            style={{
                                                left: index * SLOT_MINUTES * PIXELS_PER_MINUTE,
                                            }}
                                        />
                                    ))}
                                    {getVisiblePrograms(
                                        channelSchedule.schedule,
                                        timelineStart,
                                        timelineEnd
                                    ).map((program) => (
                                        <ProgramBlock
                                            key={getProgramKey(program)}
                                            program={program}
                                            timelineStart={timelineStart}
                                            timelineEnd={timelineEnd}
                                            selected={selectedProgramKey === getProgramKey(program)}
                                            onSelect={() => onSelectProgram(program)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

const LiveTvPage = () => {
    const { t } = useTranslation('livetv');
    const { data: items, isLoading, error } = useLiveTvItems();
    const [selectedProgramKey, setSelectedProgramKey] = useState<string | null>(null);
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const interval = window.setInterval(() => setNow(new Date()), 30_000);
        return () => window.clearInterval(interval);
    }, []);

    const timelineStart = useMemo(() => getTimelineStart(now), [now]);

    const channelSchedules = useMemo(() => {
        return LIVE_TV_CHANNELS.map((channel) => {
            const schedule = generateChannelSchedule(channel, items ?? [], now);
            return {
                channel,
                schedule,
                currentProgram: getCurrentProgram(schedule, now),
            };
        });
    }, [items, now]);

    const fallbackProgram = channelSchedules[0]?.currentProgram ?? null;
    const effectiveSelectedProgramKey =
        selectedProgramKey ?? (fallbackProgram ? getProgramKey(fallbackProgram) : null);
    const selectedProgram =
        channelSchedules
            .flatMap(({ schedule }) => schedule)
            .find((program) => getProgramKey(program) === effectiveSelectedProgramKey) ??
        fallbackProgram;

    return (
        <Page title={t('title')} requiresAuth className="flex-1" pagePadding={false} overlayHeader>
            {isLoading && <LiveTvSkeleton />}
            {error && (
                <div className="px-4 pb-6 pt-24 sm:px-12">
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <CalendarClock />
                            </EmptyMedia>
                            <EmptyTitle>{t('error_title')}</EmptyTitle>
                            <EmptyDescription>{t('error_description')}</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                </div>
            )}
            {!isLoading && !error && (!items || items.length === 0) && (
                <div className="px-4 pb-6 pt-24 sm:px-12">
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Clapperboard />
                            </EmptyMedia>
                            <EmptyTitle>{t('empty_title')}</EmptyTitle>
                            <EmptyDescription>{t('empty_description')}</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                </div>
            )}
            {selectedProgram && (
                <>
                    <SelectedProgramPanel program={selectedProgram} now={now} />
                    <GuideGrid
                        channelSchedules={channelSchedules}
                        timelineStart={timelineStart}
                        selectedProgramKey={effectiveSelectedProgramKey}
                        onSelectProgram={(program) => setSelectedProgramKey(getProgramKey(program))}
                        now={now}
                    />
                </>
            )}
        </Page>
    );
};

export default LiveTvPage;
