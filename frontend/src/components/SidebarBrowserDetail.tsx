'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSidebarBrowserMock } from '@/context/SidebarBrowserMockContext';

export function SidebarBrowserDetail() {
    const { selectedItem, setSelectedItem } = useSidebarBrowserMock();

    if (!selectedItem) return null;

    return (
        <Card className="mb-6 overflow-hidden border-border/60 bg-card/80 backdrop-blur-sm">
            <div className={cn('bg-gradient-to-br relative h-36 sm:h-44', selectedItem.accent)}>
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-3 right-3 size-8 rounded-full bg-background/70 backdrop-blur-sm"
                    onClick={() => setSelectedItem(null)}
                    aria-label="Close preview"
                >
                    <X className="size-4" />
                </Button>
                <div className="absolute right-4 bottom-4 left-4">
                    <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wider">
                        {selectedItem.kind}
                    </p>
                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                        {selectedItem.title}
                    </h2>
                    <p className="text-muted-foreground mt-0.5 text-sm">{selectedItem.subtitle}</p>
                </div>
            </div>
            <CardContent className="pt-4">
                <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
                    {selectedItem.description}
                </p>
                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                    {selectedItem.meta.map((entry) => (
                        <div key={entry.label} className="min-w-[6rem]">
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">
                                {entry.label}
                            </dt>
                            <dd className="text-sm font-medium">{entry.value}</dd>
                        </div>
                    ))}
                </dl>
                <p className="text-muted-foreground mt-4 text-xs italic">
                    Mock preview — connect to Jellyfin search when ready.
                </p>
            </CardContent>
        </Card>
    );
}
