import assetPaths from './assetList.json';

export const triggerBackgroundPreload = (onProgress?: (progress: number) => void): Promise<void> => {
    return new Promise((resolve) => {
        if (typeof window === 'undefined') {
            resolve();
            return;
        }

        let loadedCount = 0;
        const totalAssets = assetPaths.length;

        if (totalAssets === 0) {
            if (onProgress) onProgress(100);
            resolve();
            return;
        }

        const handleLoad = () => {
            loadedCount++;
            if (onProgress) {
                onProgress(Math.round((loadedCount / totalAssets) * 100));
            }
            if (loadedCount >= totalAssets) {
                resolve();
            }
        };

        const startPreload = () => {
            assetPaths.forEach((src: string) => {
                if (src.endsWith('.mp3') || src.endsWith('.mp4')) {
                    fetch(src, { cache: 'force-cache' })
                        .then(handleLoad)
                        .catch(handleLoad);
                } else if (src.endsWith('.png') || src.endsWith('.jpg') || src.endsWith('.svg')) {
                    const img = new Image();
                    const cleanup = () => {
                        img.onload = null;
                        img.onerror = null;
                        handleLoad();
                    };
                    img.onload = cleanup;
                    img.onerror = cleanup;
                    img.src = src;
                } else {
                    handleLoad();
                }
            });
        };

        if (document.readyState === 'complete') {
            startPreload();
        } else {
            const onWindowLoad = () => {
                window.removeEventListener('load', onWindowLoad);
                startPreload();
            };
            window.addEventListener('load', onWindowLoad);
        }
    });
};
