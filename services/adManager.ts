
// This service handles the imperative logic of Google IMA SDK
// We treat 'google' as a global variable injected by the script in index.html

declare global {
  interface Window {
    google: any;
  }
}

export class AdManager {
  private adDisplayContainer: any = null;
  private adsLoader: any = null;
  private adsManager: any = null;
  private videoElement: HTMLVideoElement;
  private adContainerElement: HTMLElement;
  
  private onAdCompleteCallback: (() => void) | null = null;
  private onAdErrorCallback: (() => void) | null = null;
  private onAdStartedCallback: (() => void) | null = null;
  private onAdLoadedCallback: (() => void) | null = null; 
  
  // The specific URL provided by the user
  private AD_TAG_URL = "https://shiny-fortune.com/dIm.FZz/diGSNpvdZ/GaUV/qeBmt9/uAZ-UclZkSPKTPY/3yNfjMAI3/M/j/gxtPN_jEcz2GMsDucZywOLSiZesYakWi1HpjdDDD0/xr";

  constructor(videoEl: HTMLVideoElement, containerEl: HTMLElement) {
    this.videoElement = videoEl;
    this.adContainerElement = containerEl;
    
    // Bind resize event to handle orientation changes
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  // Must be called as a direct result of a user action (click/tap)
  public initializeForUserAction() {
    if (!window.google || !window.google.ima) {
      console.error("IMA SDK not loaded");
      return;
    }

    const { google } = window;
    
    if (!this.adDisplayContainer) {
        this.adDisplayContainer = new google.ima.AdDisplayContainer(
          this.adContainerElement,
          this.videoElement
        );
        this.adsLoader = new google.ima.AdsLoader(this.adDisplayContainer);
        
        this.adsLoader.addEventListener(
          google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
          this.onAdsManagerLoaded.bind(this),
          false
        );
        this.adsLoader.addEventListener(
          google.ima.AdErrorEvent.Type.AD_ERROR,
          this.onAdError.bind(this),
          false
        );
    }

    try {
        // Crucial for mobile video support - signals user intent
        // This must be called inside a user interaction handler (click/tap)
        this.adDisplayContainer.initialize();
    } catch (e) {
        // Already initialized or warning. safe to ignore in many re-entry cases.
        // console.warn("AdDisplayContainer init warning:", e);
    }
  }

  // Updated signature to accept onLoaded callback
  public requestAd(onComplete: () => void, onError: () => void, onStart?: () => void, onLoaded?: () => void) {
    this.onAdCompleteCallback = onComplete;
    this.onAdErrorCallback = onError;
    this.onAdStartedCallback = onStart || null;
    this.onAdLoadedCallback = onLoaded || null;

    if (!window.google || !window.google.ima) {
        console.error("IMA SDK missing during request");
        this.onAdErrorCallback?.();
        return;
    }

    // Ensure loader exists
    if (!this.adsLoader) {
        this.initializeForUserAction();
    }
    
    // Cleanup previous manager
    this.destroyAdsManager();

    // Signal to the loader that previous content (or empty slot) is done.
    // This is required to make subsequent requests work reliably.
    if (this.adsLoader) {
        try {
            this.adsLoader.contentComplete();
        } catch (e) {
            console.warn("contentComplete warning", e);
        }
    }

    const { google } = window;
    const adsRequest = new google.ima.AdsRequest();
    adsRequest.adTagUrl = this.AD_TAG_URL;
    
    const w = window.innerWidth;
    const h = window.innerHeight;

    adsRequest.linearAdSlotWidth = w;
    adsRequest.linearAdSlotHeight = h;
    adsRequest.nonLinearAdSlotWidth = w;
    adsRequest.nonLinearAdSlotHeight = h;
    
    // Force non-autoplay to ensure SDK handles playback logic
    adsRequest.setAdWillAutoPlay(true);
    adsRequest.setAdWillPlayMuted(false);

    try {
      this.adsLoader.requestAds(adsRequest);
    } catch (e) {
      console.error("Ad request failed", e);
      this.onAdErrorCallback?.();
    }
  }

  private onAdsManagerLoaded(adsManagerLoadedEvent: any) {
    const { google } = window;
    const adsRenderingSettings = new google.ima.AdsRenderingSettings();
    adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
    
    // Trigger Loaded Callback
    this.onAdLoadedCallback?.();

    // Get the ads manager.
    this.adsManager = adsManagerLoadedEvent.getAdsManager(
      this.videoElement,
      adsRenderingSettings
    );

    // Add listeners to the required events.
    this.adsManager.addEventListener(google.ima.AdEvent.Type.STARTED, () => {
        this.onAdStartedCallback?.();
    });

    this.adsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE, () => {
      this.onAdCompleteCallback?.();
      this.destroyAdsManager();
    });

    this.adsManager.addEventListener(google.ima.AdEvent.Type.SKIPPED, () => {
       console.warn("Ad Skipped");
       // Skipping usually voids the reward
       this.onAdErrorCallback?.(); 
       this.destroyAdsManager();
    });

    this.adsManager.addEventListener(google.ima.AdEvent.Type.USER_CLOSE, () => {
       console.warn("Ad Closed by User");
       this.onAdErrorCallback?.();
       this.destroyAdsManager();
    });

    this.adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, (e: any) => {
        console.error("AdsManager Error Event", e.getError());
        this.onAdErrorCallback?.();
        this.destroyAdsManager();
    });
    
    this.adsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, () => {
        // We handle logic in COMPLETE
    });

    try {
      this.adsManager.init(
          window.innerWidth, 
          window.innerHeight, 
          google.ima.ViewMode.FULLSCREEN
      );
      this.adsManager.start();
    } catch (adError) {
      console.error("Ad Start Error", adError);
      this.onAdErrorCallback?.();
      this.destroyAdsManager();
    }
  }

  private onAdError(adErrorEvent: any) {
    // This error comes from the AdsLoader (e.g. VAST fetch error)
    console.error("Ad Loader Error", adErrorEvent.getError());
    
    // Hard reset everything to ensure next request is fresh
    this.hardReset();
    
    this.onAdErrorCallback?.();
  }
  
  private destroyAdsManager() {
    if (this.adsManager) {
        try {
            this.adsManager.destroy();
        } catch (e) {
            console.warn("Manager destroy warning", e);
        }
        this.adsManager = null;
    }
  }

  // Completely destroy loader and container to fix persistent errors
  private hardReset() {
      this.destroyAdsManager();
      if (this.adsLoader) {
          try { this.adsLoader.contentComplete(); } catch(e){}
          this.adsLoader = null;
      }
      if (this.adDisplayContainer) {
          try { this.adDisplayContainer.destroy(); } catch(e){}
          this.adDisplayContainer = null;
      }
  }

  private handleResize() {
    if (this.adsManager && this.adsManager.resize) {
      this.adsManager.resize(
          window.innerWidth, 
          window.innerHeight, 
          window.google.ima.ViewMode.FULLSCREEN
      );
    }
  }
}
