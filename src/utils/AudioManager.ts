export interface AudioVolumeState {
    bgm: number;
    sfx: number;
}

export interface BgmOptions {
    volume?: number;
    loop?: boolean;
}

export interface SfxOptions {
    volume?: number;
    playbackRate?: number;
}

const STORAGE_BGM_VOLUME_KEY = "game_audio_bgm_volume";
const STORAGE_SFX_VOLUME_KEY = "game_audio_sfx_volume";

class AudioManager {
    private bgmAudio: HTMLAudioElement | null = null;
    private bgmSrc: string = "";
    private bgmBaseVolume: number = 1;

    private bgmVolumeSetting: number = 0.5;
    private sfxVolumeSetting: number = 1;
    private activated: boolean = false;

    constructor() {
        this.bgmVolumeSetting = this.loadVolumeSetting(STORAGE_BGM_VOLUME_KEY, 1);
        this.sfxVolumeSetting = this.loadVolumeSetting(STORAGE_SFX_VOLUME_KEY, 1);

        if (typeof window !== "undefined") {
            this.bindActivationEvents();
            document.addEventListener("visibilitychange", this.handleVisibilityChange);
        }
    }

    private clamp01(value: unknown): number {
        const num = Number(value);
        if (Number.isNaN(num)) return 0;
        return Math.min(1, Math.max(0, num));
    }

    private loadVolumeSetting(storageKey: string, fallback: number): number {
        if (typeof window === "undefined") return fallback;
        const raw = window.localStorage.getItem(storageKey);
        if (raw === null || raw === "") return fallback;
        const parsed = Number(raw);
        if (Number.isNaN(parsed)) return fallback;
        return this.clamp01(parsed);
    }

    private saveVolumeSetting(storageKey: string, value: number): void {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(storageKey, String(this.clamp01(value)));
    }

    private getEffectiveBgmVolume(): number {
        return this.clamp01(this.bgmBaseVolume * this.bgmVolumeSetting);
    }

    private getEffectiveSfxVolume(baseVolume: number = 1): number {
        return this.clamp01(this.clamp01(baseVolume) * this.sfxVolumeSetting);
    }

    private applyBgmVolume(): void {
        if (this.bgmAudio) {
            this.bgmAudio.volume = this.getEffectiveBgmVolume();
        }
    }

    private markActivated = (): void => {
        if (this.activated) return;
        this.activated = true;
        this.tryPlayBgm();
    };

    private bindActivationEvents(): void {
        const userActivatedEvents = ["pointerdown", "keydown", "touchstart"];
        userActivatedEvents.forEach((eventName) => {
            document.addEventListener(eventName, this.markActivated, { once: true, passive: true });
        });
    }

    private tryPlayBgm(): void {
        if (!this.bgmAudio || !this.bgmSrc) return;
        this.applyBgmVolume();
        if (!this.activated) return;

        const playPromise = this.bgmAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // Browser autoplay policy may block until user interaction.
            });
        }
    }

    private handleVisibilityChange = (): void => {
        if (!this.bgmAudio) return;
        if (document.hidden) {
            this.bgmAudio.pause();
        } else {
            this.tryPlayBgm();
        }
    };

    // Public API

    public initBgm(src: string, options: BgmOptions = {}): void {
        if (!src) return;

        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio = null;
        }

        this.bgmSrc = src;
        this.bgmBaseVolume = typeof options.volume === "number" ? this.clamp01(options.volume) : 1;

        this.bgmAudio = new Audio(src);
        this.bgmAudio.loop = options.loop !== false;
        this.bgmAudio.preload = "auto";
        this.applyBgmVolume();

        this.tryPlayBgm();
    }

    public stopBgm(): void {
        if (!this.bgmAudio) return;
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
    }

    public playSfx(src: string, options: SfxOptions = {}): HTMLAudioElement | null {
        if (!src) return null;

        const audio = new Audio(src);
        audio.preload = "auto";
        const baseVolume = typeof options.volume === "number" ? options.volume : 0.9;
        audio.volume = this.getEffectiveSfxVolume(baseVolume);

        if (typeof options.playbackRate === "number") {
            audio.playbackRate = options.playbackRate;
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // Ignore blocked or interrupted SFX plays.
            });
        }

        return audio;
    }

    public setBgmVolume(value: number): void {
        this.bgmVolumeSetting = this.clamp01(value);
        this.saveVolumeSetting(STORAGE_BGM_VOLUME_KEY, this.bgmVolumeSetting);
        this.applyBgmVolume();
    }

    public setSfxVolume(value: number): void {
        this.sfxVolumeSetting = this.clamp01(value);
        this.saveVolumeSetting(STORAGE_SFX_VOLUME_KEY, this.sfxVolumeSetting);
    }

    public getVolumes(): AudioVolumeState {
        return {
            bgm: this.bgmVolumeSetting,
            sfx: this.sfxVolumeSetting,
        };
    }
}

// Export as a singleton
export const audioManager = new AudioManager();
