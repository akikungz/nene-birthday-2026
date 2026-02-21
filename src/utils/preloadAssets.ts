import assetPaths from './assetList.json';

export const triggerBackgroundPreload = () => {
    if (typeof window === 'undefined') return;

    const startPreload = () => {
        assetPaths.forEach((src: string) => {
            if (src.endsWith('.mp3') || src.endsWith('.mp4')) {
                fetch(src, { cache: 'force-cache' }).catch(() => { });
            } else if (src.endsWith('.png') || src.endsWith('.jpg') || src.endsWith('.svg')) {
                const img = new Image();
                img.src = src;
            }
        });
    };

    if (document.readyState === 'complete') {
        setTimeout(startPreload, 1000);
    } else {
        window.addEventListener('load', () => setTimeout(startPreload, 1000));
    }
};
