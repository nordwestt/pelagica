'use client';

import { useSidebarBrowserMock } from '@/context/SidebarBrowserMockContext';

export function SidebarBrowserHint() {
    const { selectedItem } = useSidebarBrowserMock();

    if (selectedItem) return null;

    return (
        <div className="border-primary/25 bg-primary/5 text-muted-foreground mb-4 rounded-lg border border-dashed px-4 py-3 text-sm">
            <span className="text-foreground font-medium">Sidebar browser mock</span> — use the
            panel on the left to search, filter by category, and click a result to preview it
            here.
        </div>
    );
}
