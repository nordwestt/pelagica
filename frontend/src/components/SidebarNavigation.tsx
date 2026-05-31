'use client';

import { Home, LayoutGrid, Library, Search } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import JellyfinLibraryIcon from '@/components/JellyfinLibraryIcon';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useUserViews } from '@/hooks/api/useUserViews';
import { useSidebarBrowser, saveExpandedBeforeBrowse } from '@/context/SidebarBrowserContext';
import {
    buildLibrarySearchParams,
    getSupportedLibraries,
} from '@/utils/sidebarLibraryNavigation';

export function SidebarNavigation() {
    const { t } = useTranslation('sidebar');
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { setBrowseMode } = useSidebarBrowser();
    const { isMobile, open, setOpen, setOpenMobile } = useSidebar();
    const { data: views } = useUserViews();
    const libraries = getSupportedLibraries(views?.Items);
    const defaultLibraryId = libraries[0]?.Id;
    const libraryHref = defaultLibraryId
        ? `/library?${buildLibrarySearchParams(defaultLibraryId).toString()}`
        : '/library';
    const activeLibraryId = searchParams.get('library');

    return (
        <>
            <SidebarGroup>
                <SidebarGroupLabel>{t('navigation')}</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={location.pathname === '/'}
                                tooltip={t('home')}
                            >
                                <Link to="/">
                                    <Home />
                                    <span>{t('home')}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={location.pathname === '/library'}
                                tooltip={t('library')}
                            >
                                <Link to={libraryHref}>
                                    <Library />
                                    <span>{t('library')}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={location.pathname === '/search'}
                                tooltip={t('search')}
                            >
                                <Link to="/search">
                                    <Search />
                                    <span>{t('search')}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip={t('browse_library')}
                                onClick={() => {
                                    saveExpandedBeforeBrowse(open);
                                    setBrowseMode(true);
                                    if (isMobile) {
                                        setOpenMobile(true);
                                    } else {
                                        setOpen(true);
                                    }
                                }}
                            >
                                <LayoutGrid />
                                <span>{t('browse_library')}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {libraries.length > 0 && (
                <SidebarGroup>
                    <SidebarGroupLabel>{t('libraries')}</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {libraries.map((library) => (
                                <SidebarMenuItem key={library.Id}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={
                                            location.pathname === '/library' &&
                                            activeLibraryId === library.Id
                                        }
                                        tooltip={library.Name ?? t('library')}
                                    >
                                        <Link
                                            to={`/library?${buildLibrarySearchParams(library.Id!).toString()}`}
                                        >
                                            <JellyfinLibraryIcon
                                                libraryType={library.CollectionType}
                                            />
                                            <span>{library.Name}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            )}
        </>
    );
}
