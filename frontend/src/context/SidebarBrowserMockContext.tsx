'use client';

import * as React from 'react';

export type BrowserMediaCategory = 'music' | 'series' | 'movie';

export type BrowserMockItem = {
    id: string;
    title: string;
    subtitle: string;
    category: BrowserMediaCategory;
    kind: string;
    accent: string;
    description: string;
    meta: { label: string; value: string }[];
};

type SidebarBrowserMockContextValue = {
    selectedItem: BrowserMockItem | null;
    setSelectedItem: (item: BrowserMockItem | null) => void;
};

const SidebarBrowserMockContext = React.createContext<SidebarBrowserMockContextValue | null>(
    null
);

export function SidebarBrowserMockProvider({ children }: { children: React.ReactNode }) {
    const [selectedItem, setSelectedItem] = React.useState<BrowserMockItem | null>(null);

    const value = React.useMemo(
        () => ({ selectedItem, setSelectedItem }),
        [selectedItem]
    );

    return (
        <SidebarBrowserMockContext.Provider value={value}>
            {children}
        </SidebarBrowserMockContext.Provider>
    );
}

export function useSidebarBrowserMock() {
    const context = React.useContext(SidebarBrowserMockContext);
    if (!context) {
        throw new Error('useSidebarBrowserMock must be used within SidebarBrowserMockProvider.');
    }
    return context;
}
