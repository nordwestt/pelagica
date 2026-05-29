import { useEffect, useState } from 'react';
import { extractImagePalette, type ImagePalette } from '@/utils/extractImagePalette';

export function useImagePalette(imageUrl: string | undefined, enabled = true) {
    const [palette, setPalette] = useState<ImagePalette | null>(null);

    useEffect(() => {
        if (!enabled || !imageUrl) {
            setPalette(null);
            return;
        }

        let cancelled = false;

        extractImagePalette(imageUrl).then((result) => {
            if (!cancelled) setPalette(result);
        });

        return () => {
            cancelled = true;
        };
    }, [enabled, imageUrl]);

    return palette;
}
