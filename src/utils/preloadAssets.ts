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

        const imageExts = new Set(['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif']);
        const fetchExts = new Set(['.mp3', '.mp4', '.mov', '.webm', '.ogg', '.wav']);

        const getExt = (path: string) => {
            const i = path.lastIndexOf('.');
            return i !== -1 ? path.slice(i).toLowerCase() : '';
        };

        const startPreload = () => {
            assetPaths.forEach((src: string) => {
                const ext = getExt(src);
                if (fetchExts.has(ext)) {
                    fetch(src, { cache: 'force-cache' })
                        .then(handleLoad)
                        .catch(handleLoad);
                } else if (imageExts.has(ext)) {
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
                    fetch(src, { cache: 'force-cache' })
                        .then(handleLoad)
                        .catch(handleLoad);
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
