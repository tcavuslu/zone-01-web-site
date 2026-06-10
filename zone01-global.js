(function () {
  if (window.__zone01GlobalLoaded) return;
  window.__zone01GlobalLoaded = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const hasGsap = !!window.gsap;
  const hasBarba = !!window.barba;
  const hasScrollTrigger = !!window.ScrollTrigger;
  const hasLenis = typeof window.Lenis !== "undefined";

  if (hasGsap && window.CustomEase) {
    gsap.registerPlugin(CustomEase);
    if (hasScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    CustomEase.create("osmo", "0.625, 0.05, 0, 1");
    gsap.defaults({ ease: "osmo", duration: 0.6 });
  }

  document.body.setAttribute("data-barba", "wrapper");
  history.scrollRestoration = "manual";

  let lenis = null;
  let nextPage = document;
  let onceFunctionsInitialized = false;

  const rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = rmMQ.matches;
  rmMQ.addEventListener?.("change", e => { reducedMotion = e.matches; });
  rmMQ.addListener?.(e => { reducedMotion = e.matches; });

  // ---------------------------------------------------------------------------
  // Legacy pixel section transitions
  // ---------------------------------------------------------------------------

  (function initLegacyPixelModule() {
    const FIXED_ROWS = 4;
    const SELECTORS = ".transition-to-white,.transition-to-black,.transition-to-blue";
    const YELLOW_PROBABILITY = 0.10;
    const BLUE_PROBABILITY = 0.32;

    const instances = new WeakMap();
    const allStates = new Set();
    let globalListenersBound = false;

    function resolveCSSVar(variableExpression, fallback) {
      const match = variableExpression.match(/var\((--[^)]+)\)/);
      if (!match) return fallback;

      const resolved = getComputedStyle(document.documentElement)
        .getPropertyValue(match[1].trim())
        .trim();

      return resolved || fallback;
    }

    function getColors() {
      return {
        blue: resolveCSSVar("var(--_primitives---brand-colors--blue)", "#0000ff"),
        white: resolveCSSVar("var(--_primitives---brand-colors--white)", "#ffffff"),
        yellow: resolveCSSVar("var(--_primitives---brand-colors--yellow)", "#ffff00"),
        black: resolveCSSVar("var(--_primitives---brand-colors--black)", "#000000")
      };
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function shuffle(array) {
      const arr = array.slice();
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function getMode(wrapper) {
      if (wrapper.classList.contains("transition-to-white")) return "white";
      if (wrapper.classList.contains("transition-to-black")) return "black";
      if (wrapper.classList.contains("transition-to-blue")) return "blue";
      return null;
    }

    function getInitialColor(mode) {
      if (mode === "blue") return "blue";
      const rand = Math.random();
      if (rand < BLUE_PROBABILITY) return "blue";
      if (rand < BLUE_PROBABILITY + YELLOW_PROBABILITY) return "yellow";
      return mode;
    }

    function createGridData(mode, totalCells) {
      const revealOrder = shuffle(Array.from({ length: totalCells }, (_, i) => i));
      const initialColors = Array.from({ length: totalCells }, () => getInitialColor(mode));
      const recolorOrder = shuffle(
        initialColors
          .map((color, index) => ({ color, index }))
          .filter(item => item.color !== mode)
          .map(item => item.index)
      );

      return { revealOrder, initialColors, recolorOrder };
    }

    function getProgress(wrapper, delayFraction, mode) {
      const rect = wrapper.getBoundingClientRect();
      const vh = window.innerHeight;
      if (!rect.height || !vh) return 0;

      if (mode === "white" || mode === "black") {
        const scrollDelay = vh * (delayFraction || 0);
        const startTop = vh - scrollDelay;
        const endTop = -rect.height;
        return clamp((startTop - rect.top) / (startTop - endTop), 0, 1);
      }

      return clamp((vh - rect.top) / vh, 0, 1);
    }

    function bindGlobalListeners() {
      if (globalListenersBound) return;
      globalListenersBound = true;

      window.addEventListener("scroll", () => {
        allStates.forEach(state => state.requestUpdate());
      }, { passive: true });

      window.addEventListener("resize", () => {
        allStates.forEach(state => {
          state.resizeCanvas();
          state.requestUpdate();
        });
      }, { passive: true });
    }

    function initTransition(wrapper) {
      if (instances.has(wrapper)) {
        const existingState = instances.get(wrapper);
        existingState.resizeCanvas();
        existingState.requestUpdate();
        return;
      }

      const mode = getMode(wrapper);
      if (!mode) return;

      const existingCanvas = wrapper.querySelector(":scope > canvas[data-legacy-pixel-canvas='true']");
      if (existingCanvas) existingCanvas.remove();

      if (getComputedStyle(wrapper).position === "static") {
        wrapper.style.position = "relative";
      }

      wrapper.style.opacity = "1";
      wrapper.style.overflow = "hidden";
      wrapper.style.zIndex = "2";

      const canvas = document.createElement("canvas");
      canvas.setAttribute("data-legacy-pixel-canvas", "true");
      canvas.setAttribute("aria-hidden", "true");
      canvas.style.cssText = [
        "position:absolute",
        "top:-1px",
        "left:-1px",
        "right:-1px",
        "bottom:-1px",
        "width:calc(100% + 2px)",
        "height:calc(100% + 2px)",
        "display:block",
        "pointer-events:none",
        "z-index:9999",
        "opacity:1",
        "visibility:visible",
        "-webkit-transform:translateZ(0)",
        "transform:translateZ(0)"
      ].join(";");

      wrapper.appendChild(canvas);

      const ctx = canvas.getContext("2d", { alpha: true });

      const state = {
        wrapper,
        mode,
        canvas,
        ctx,
        colors: getColors(),
        scrollDelayFraction: mode === "black" ? 0.2 : 0,
        rows: FIXED_ROWS,
        cols: 1,
        totalCells: FIXED_ROWS,
        cellSizePx: 1,
        revealOrder: [],
        initialColors: [],
        recolorOrder: [],
        rafId: null,

        rebuildGrid() {
          const rect = wrapper.getBoundingClientRect();
          const dpr = Math.max(1, window.devicePixelRatio || 1);
          const canvasWidth = Math.max(1, Math.round(rect.width * dpr));
          const canvasHeight = Math.max(1, Math.round(rect.height * dpr));
          const cellSizePx = Math.max(1, Math.ceil(canvasHeight / FIXED_ROWS));
          const cols = Math.max(1, Math.ceil(canvasWidth / cellSizePx));
          const totalCells = cols * FIXED_ROWS;

          if (
            this.cols === cols &&
            this.rows === FIXED_ROWS &&
            this.totalCells === totalCells &&
            this.cellSizePx === cellSizePx &&
            this.revealOrder.length
          ) {
            return;
          }

          this.rows = FIXED_ROWS;
          this.cols = cols;
          this.totalCells = totalCells;
          this.cellSizePx = cellSizePx;

          const gridData = createGridData(this.mode, totalCells);
          this.revealOrder = gridData.revealOrder;
          this.initialColors = gridData.initialColors;
          this.recolorOrder = gridData.recolorOrder;
        },

        resizeCanvas() {
          const rect = wrapper.getBoundingClientRect();
          const dpr = Math.max(1, window.devicePixelRatio || 1);
          const width = Math.max(1, Math.ceil(rect.width * dpr));
          const height = Math.max(1, Math.ceil(rect.height * dpr));

          if (canvas.width !== width) canvas.width = width;
          if (canvas.height !== height) canvas.height = height;

          this.colors = getColors();
          this.rebuildGrid();
        },

        draw() {
          const progress = getProgress(wrapper, this.scrollDelayFraction, this.mode);
          if (!this.ctx || !canvas.width || !canvas.height) return;

          this.ctx.setTransform(1, 0, 0, 1, 0, 0);
          this.ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (progress >= 1) {
            this.ctx.fillStyle = this.colors[this.mode];
            this.ctx.fillRect(0, 0, canvas.width, canvas.height);
            return;
          }

          let revealCount;
          let recolorCount;

          if (this.mode === "blue") {
            revealCount = Math.round(progress * this.totalCells);
            recolorCount = 0;
          } else {
            const revealPhaseProgress = clamp(progress / 0.65, 0, 1);
            const recolorPhaseProgress = clamp((progress - 0.35) / 0.65, 0, 1);
            revealCount = Math.round(revealPhaseProgress * this.totalCells);
            recolorCount = Math.round(recolorPhaseProgress * this.recolorOrder.length);
          }

          const visibleMap = new Map();

          for (let i = 0; i < revealCount; i++) {
            const cellIndex = this.revealOrder[i];
            if (cellIndex !== undefined) visibleMap.set(cellIndex, this.initialColors[cellIndex]);
          }

          if (this.mode !== "blue") {
            for (let i = 0; i < recolorCount; i++) {
              const cellIndex = this.recolorOrder[i];
              if (cellIndex !== undefined && visibleMap.has(cellIndex)) {
                visibleMap.set(cellIndex, this.mode);
              }
            }
          }

          visibleMap.forEach((colorKey, cellIndex) => {
            const col = cellIndex % this.cols;
            const row = Math.floor(cellIndex / this.cols);
            this.ctx.fillStyle = this.colors[colorKey];
            this.ctx.fillRect(
              col * this.cellSizePx,
              row * this.cellSizePx,
              this.cellSizePx,
              this.cellSizePx
            );
          });
        },

        requestUpdate() {
          if (this.rafId !== null) return;
          this.rafId = requestAnimationFrame(() => {
            this.rafId = null;
            this.draw();
          });
        }
      };

      instances.set(wrapper, state);
      allStates.add(state);

      if ("ResizeObserver" in window) {
        const resizeObserver = new ResizeObserver(() => {
          state.resizeCanvas();
          state.requestUpdate();
        });
        resizeObserver.observe(wrapper);
      }

      bindGlobalListeners();

      requestAnimationFrame(() => {
        state.resizeCanvas();
        state.requestUpdate();
      });
    }

    window.initLegacyPixelSectionTransitions = function (root) {
      const scope = root || document;
      scope.querySelectorAll(SELECTORS).forEach(initTransition);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        window.initLegacyPixelSectionTransitions(document);
      });
    } else {
      window.initLegacyPixelSectionTransitions(document);
    }
  })();

  // ---------------------------------------------------------------------------
  // Barba page transition
  // ---------------------------------------------------------------------------

  const pixelHorizontalAmount = 12;
  const transitionDuration = 1.35;
  const pixelFadeDuration = 0.25;
  const pixelOverlap = 0.35;

  function initOnceFunctions() {
    if (onceFunctionsInitialized) return;
    onceFunctionsInitialized = true;

    updatePageRouteState();
    initButtonHoverText(document);
    initHeroHeadingTyping(document);
    initVimeoBGVideo(document);
    initStickyFeatures(document);
    initStickyStepsBasic(document);
    initTestimonialSwiper(document);
    initVimeoLightboxAdvanced(document);
    initTestimonialCursor(document);
    setupRegistrationForm(document);
    injectZone01FormStyles();
  }

  function initBeforeEnterFunctions(next) {
    nextPage = next || document;
    applyThemeFrom(nextPage);
  }

  function initAfterEnterFunctions(next) {
    nextPage = next || document;

    ensureNavbarVisible();
    initButtonHoverText(nextPage);
    initHeroHeadingTyping(nextPage);
    initVimeoBGVideo(nextPage);
    initStickyFeatures(nextPage);
    initStickyStepsBasic(nextPage);
    initTestimonialSwiper(nextPage);
    initVimeoLightboxAdvanced(nextPage);
    initTestimonialCursor(nextPage);
    setupRegistrationForm(nextPage);

    if (window.initLegacyPixelSectionTransitions) {
      window.initLegacyPixelSectionTransitions(nextPage);
    }

    if (hasLenis && lenis) lenis.resize();
    if (hasScrollTrigger) ScrollTrigger.refresh();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        reinitWebflow();
      });
    });
  }

  function runPageOnceAnimation(next) {
    if (!hasGsap) {
      resetPage(next);
      return Promise.resolve();
    }

    return gsap.timeline().call(() => resetPage(next), null, 0);
  }

  function runPageLeaveAnimation(current, next) {
    const tl = gsap.timeline();

    if (reducedMotion) {
      tl.set(current, { autoAlpha: 0 });
      tl.call(() => current.remove(), null, 0);
      return tl;
    }

    const isPortrait = window.innerHeight > window.innerWidth;
    pixelGrid(isPortrait);

    const transitionWrap = document.querySelector("[data-transition-wrap]");
    const transitionPanel = transitionWrap?.querySelector("[data-transition-panel]");
    if (!transitionPanel) return tl;

    const lines = Array.from(transitionPanel.querySelectorAll("[data-transition-col]"));
    const allPixels = transitionPanel.querySelectorAll("[data-transition-pixel]");
    const overlap = Math.max(0, Math.min(1, pixelOverlap));
    const clipFrom = isPortrait
      ? "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)"
      : "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)";
    const clipTo = "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";
    const clipStart = Math.min(pixelFadeDuration, transitionDuration * 0.5);
    const clipDuration = Math.max(0.001, transitionDuration - 2 * clipStart);
    const stepDur = clipDuration / Math.max(1, pixelHorizontalAmount);
    const transitionEndDelay = transitionDuration / Math.max(1, pixelHorizontalAmount);

    gsap.set(allPixels, { opacity: 0, willChange: "opacity" });
    gsap.set(transitionPanel, { opacity: 1, willChange: "opacity" });
    gsap.set(next, {
      autoAlpha: 1,
      clipPath: clipFrom,
      webkitClipPath: clipFrom,
      willChange: "clip-path",
      force3D: true,
      maxHeight: "100dvh"
    });

    lines.forEach((line, i) => {
      const pixels = Array.from(line.querySelectorAll("[data-transition-pixel]"));
      if (!pixels.length) return;

      const revealTime = clipStart + i * stepDur;
      const fillStart = Math.max(0, revealTime - pixelFadeDuration);
      const fadeStart = Math.min(transitionDuration, revealTime + stepDur);
      const perPixelMin = pixelFadeDuration / pixels.length;
      const perPixelDur = perPixelMin * (1 - overlap) + pixelFadeDuration * overlap;
      const spread = Math.max(0, pixelFadeDuration - perPixelDur);

      tl.to(pixels, {
        opacity: 1,
        duration: Math.max(0.001, perPixelDur),
        ease: "none",
        stagger: { amount: spread, from: "random" }
      }, fillStart);

      tl.to(pixels, {
        opacity: 0,
        duration: Math.max(0.001, perPixelDur),
        ease: "none",
        stagger: { amount: spread, from: "random" }
      }, fadeStart);
    });

    tl.to(next, {
      clipPath: clipTo,
      webkitClipPath: clipTo,
      ease: `steps(${pixelHorizontalAmount}, start)`,
      duration: clipDuration
    }, clipStart);

    tl.set(next, {
      clearProps: "clipPath,webkitClipPath,willChange,force3D,maxHeight"
    }, clipStart + clipDuration);

    tl.call(() => current.remove(), null, transitionDuration + transitionEndDelay);
    tl.set(allPixels, { clearProps: "willChange" }, transitionDuration + transitionEndDelay);
    tl.set(transitionPanel, { clearProps: "willChange" }, transitionDuration + transitionEndDelay);

    return tl;
  }

  function runPageEnterAnimation(next) {
    if (!hasGsap) {
      resetPage(next);
      return Promise.resolve();
    }

    const tl = gsap.timeline();
    const transitionEndDelay = transitionDuration / Math.max(1, pixelHorizontalAmount);

    if (reducedMotion) {
      tl.set(next, { autoAlpha: 1 });
      tl.add("pageReady");
      tl.call(resetPage, [next], "pageReady");
      return new Promise(resolve => tl.call(resolve, null, "pageReady"));
    }

    tl.add("pageReady", transitionDuration + transitionEndDelay);
    tl.call(resetPage, [next], "pageReady");

    return new Promise(resolve => {
      tl.call(resolve, null, "pageReady");
    });
  }

  function pixelGrid(isPortrait) {
    const panel = document.querySelector("[data-transition-panel]");
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    panel.style.flexDirection = isPortrait ? "column" : "row";

    const lineSizePx = isPortrait
      ? rect.height / pixelHorizontalAmount
      : rect.width / pixelHorizontalAmount;

    const crossAmount = Math.ceil((isPortrait ? rect.width : rect.height) / lineSizePx);

    let lines = panel.querySelectorAll("[data-transition-col]");
    const lineTemplate = lines[0];
    const pixelTemplate = lineTemplate?.querySelector("[data-transition-pixel]");
    if (!lineTemplate || !pixelTemplate) return;

    if (lines.length !== pixelHorizontalAmount) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < pixelHorizontalAmount; i++) {
        frag.appendChild(lineTemplate.cloneNode(false));
      }
      panel.replaceChildren(frag);
      lines = panel.querySelectorAll("[data-transition-col]");
    }

    lines.forEach(line => {
      line.style.flexDirection = isPortrait ? "row" : "column";
      line.style.flex = "1 1 auto";
      line.style.justifyContent = "center";

      const diff = crossAmount - line.childElementCount;

      if (diff > 0) {
        const frag = document.createDocumentFragment();
        for (let i = 0; i < diff; i++) frag.appendChild(pixelTemplate.cloneNode(true));
        line.appendChild(frag);
      } else if (diff < 0) {
        for (let i = diff; i < 0; i++) line.lastElementChild?.remove();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers and feature initializers
  // ---------------------------------------------------------------------------

  const themeConfig = {
    light: { nav: "dark", transition: "light" },
    dark: { nav: "light", transition: "dark" }
  };

  function initButtonHoverText(scope = document) {
    $$(".button .button-text", scope).forEach(el => {
      const text = (el.getAttribute("data-text") || el.textContent || "").trim();
      const chars = text.length;
      el.style.setProperty("--chars", chars);
      el.style.setProperty("--typing-duration", Math.max(0.28, Math.min(chars * 0.045, 1.2)) + "s");
    });
  }

  function applyThemeFrom(container) {
    const pageTheme = container?.dataset?.pageTheme || "light";
    const config = themeConfig[pageTheme] || themeConfig.light;

    document.body.dataset.pageTheme = pageTheme;

    const transitionEl = document.querySelector("[data-theme-transition]");
    if (transitionEl) transitionEl.dataset.themeTransition = config.transition;

    const nav = document.querySelector("[data-theme-nav]");
    if (nav) nav.dataset.themeNav = config.nav;
  }

  function initLenis() {
    if (lenis || !hasLenis) return;

    lenis = new Lenis({ lerp: 0.165, wheelMultiplier: 1.25 });

    if (hasScrollTrigger) lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add(time => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  function resetPage(container) {
    window.scrollTo(0, 0);

    const pageWrapper = document.querySelector(".page-wrapper");
    if (pageWrapper && container.parentNode === document.body) {
      const footer = pageWrapper.querySelector(".footer-wrapper");
      if (footer) pageWrapper.insertBefore(container, footer);
      else pageWrapper.appendChild(container);
    }

    requestAnimationFrame(() => {
      if (hasGsap) {
        gsap.set(container, {
          clearProps: "position,top,left,right,width,height,overflow,zIndex,clipPath,webkitClipPath,willChange,force3D,maxHeight"
        });
      } else {
        container.removeAttribute("style");
      }

      if (hasLenis && lenis) {
        lenis.resize();
        lenis.start();
      }
    });
  }

  function reinitWebflow() {
    if (!window.Webflow) return;

    window.Webflow.destroy();
    window.Webflow.ready();

    const ix2 = window.Webflow.require && window.Webflow.require("ix2");
    if (ix2) ix2.init();

    const snapSelectors = [
      ".hero-gradient",
      ".hero-content",
      ".hero-home-page",
      ".content-inner",
      ".heading-style-h1",
      ".heading-style-h2",
      ".button-group",
      ".asset-full"
    ];

    snapSelectors.forEach(sel => {
      nextPage.querySelectorAll(sel).forEach(el => {
        gsap.killTweensOf(el);
        gsap.set(el, { opacity: 1, visibility: "visible", clearProps: "transform,y,x,scale" });
      });
    });
  }

  function initBarbaNavUpdate(data) {
    const tpl = document.createElement("template");
    tpl.innerHTML = data.next.html.trim();

    const nextNodes = tpl.content.querySelectorAll("[data-barba-update]");
    const currentNodes = document.querySelectorAll("nav [data-barba-update]");

    currentNodes.forEach((curr, index) => {
      const next = nextNodes[index];
      if (!next) return;

      const newStatus = next.getAttribute("aria-current");
      if (newStatus !== null) curr.setAttribute("aria-current", newStatus);
      else curr.removeAttribute("aria-current");

      curr.setAttribute("class", next.getAttribute("class") || "");
    });
  }

  let heroTypingTimeout = null;

  function initHeroHeadingTyping(scope = document) {
    cleanupHeroHeadingTyping();

    const homePaths = ["/", "/home"];
    if (!homePaths.includes(window.location.pathname)) return;

    const el = scope.querySelector(".hero-content .heading-style-h1 em.is-rich-text");
    if (!el) return;

    el.classList.add("is-hero-typing-active");

    const words = ["Full-Stack Developer", "Software Developer", "Data Scientist", "UI/UX Designer"];
    let wordIndex = 0;
    let charIndex = words[0].length;
    let isDeleting = false;

    const typingSpeed = 120;
    const deletingSpeed = 70;
    const pauseAfterType = 1800;
    const pauseAfterDelete = 400;

    function tick() {
      if (!document.documentElement.contains(el)) return;

      const currentWord = words[wordIndex];
      charIndex = isDeleting ? charIndex - 1 : charIndex + 1;
      el.textContent = currentWord.substring(0, charIndex);

      let delay = isDeleting ? deletingSpeed : typingSpeed;

      if (!isDeleting && charIndex === currentWord.length) {
        delay = pauseAfterType;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        delay = pauseAfterDelete;
      }

      heroTypingTimeout = setTimeout(tick, delay);
    }

    el.textContent = words[0];
    heroTypingTimeout = setTimeout(() => {
      isDeleting = true;
      tick();
    }, pauseAfterType);
  }

  let vimeoBgAPIPromise = null;
  let vimeoBgResizeBound = false;
  const vimeoBgStates = new Set();

  function loadVimeoPlayerAPI() {
    if (window.Vimeo && window.Vimeo.Player) return Promise.resolve();
    if (vimeoBgAPIPromise) return vimeoBgAPIPromise;

    vimeoBgAPIPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="player.vimeo.com/api/player.js"]');

      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        setTimeout(() => {
          if (window.Vimeo && window.Vimeo.Player) resolve();
          else reject(new Error("Vimeo Player API failed to load"));
        }, 5000);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://player.vimeo.com/api/player.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return vimeoBgAPIPromise;
  }

  function bindVimeoBgResize() {
    if (vimeoBgResizeBound) return;
    vimeoBgResizeBound = true;

    window.addEventListener("resize", () => {
      vimeoBgStates.forEach(state => {
        if (!document.documentElement.contains(state.element)) {
          vimeoBgStates.delete(state);
          return;
        }
        state.adjust();
      });
    }, { passive: true });
  }

  function initVimeoBGVideo(scope = document) {
    const homePaths = ["/", "/home"];
    if (!homePaths.includes(window.location.pathname)) return;

    const vimeoPlayers = scope.querySelectorAll("[data-vimeo-bg-init]");
    if (!vimeoPlayers.length) return;

    loadVimeoPlayerAPI()
      .then(() => vimeoPlayers.forEach(initVimeoBGElement))
      .catch(error => console.warn("Vimeo background video could not start:", error));
  }

  function initVimeoBGElement(vimeoElement) {
    if (vimeoElement.dataset.vimeoInitialized === "true") return;
    vimeoElement.dataset.vimeoInitialized = "true";

    const vimeoVideoID = vimeoElement.getAttribute("data-vimeo-video-id");
    const iframeEl = vimeoElement.querySelector("iframe");
    if (!vimeoVideoID || !iframeEl || !window.Vimeo) return;

    iframeEl.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
    iframeEl.setAttribute(
      "src",
      `https://player.vimeo.com/video/${vimeoVideoID}?api=1&autoplay=1&loop=1&muted=1&autopause=0&controls=0&playsinline=1`
    );

    const player = new Vimeo.Player(iframeEl);
    let videoAspectRatio = null;

    function adjustVideoSizing() {
      const iframeWrapper = vimeoElement.querySelector(".vimeo-bg__iframe-wrapper");
      if (!iframeWrapper || !videoAspectRatio) return;

      const containerWidth = vimeoElement.offsetWidth;
      const containerHeight = vimeoElement.offsetHeight;
      if (!containerWidth || !containerHeight) return;

      const containerRatio = containerWidth / containerHeight;
      const videoRatio = 1 / videoAspectRatio;

      iframeWrapper.style.position = "absolute";
      iframeWrapper.style.left = "50%";
      iframeWrapper.style.top = "50%";
      iframeWrapper.style.transform = "translate(-50%, -50%)";

      if (containerRatio > videoRatio) {
        iframeWrapper.style.width = "100%";
        iframeWrapper.style.height = `${(containerWidth / videoRatio / containerHeight) * 100}%`;
      } else {
        iframeWrapper.style.width = `${(containerHeight * videoRatio / containerWidth) * 100}%`;
        iframeWrapper.style.height = "100%";
      }
    }

    if (vimeoElement.getAttribute("data-vimeo-update-size") === "cover") {
      player.getVideoWidth()
        .then(width => player.getVideoHeight().then(height => {
          videoAspectRatio = height / width;

          const beforeEl = vimeoElement.querySelector(".vimeo-bg__before");
          if (beforeEl) beforeEl.style.paddingTop = videoAspectRatio * 100 + "%";

          adjustVideoSizing();
        }))
        .catch(() => {});
    }

    vimeoBgStates.add({ element: vimeoElement, adjust: adjustVideoSizing });
    bindVimeoBgResize();

    player.ready()
      .then(() => {
        vimeoElement.setAttribute("data-vimeo-activated", "true");
        return player.play();
      })
      .catch(() => {});

    player.on("play", () => {
      vimeoElement.setAttribute("data-vimeo-loaded", "true");
      vimeoElement.setAttribute("data-vimeo-playing", "true");
    });

    player.on("pause", () => {
      vimeoElement.setAttribute("data-vimeo-playing", "false");
    });

    player.on("error", error => {
      console.warn("Vimeo background video error:", error);
    });
  }

  function updatePageRouteState(path = window.location.pathname) {
    const homePaths = ["/", "/home"];
    document.body.dataset.pageRoute = homePaths.includes(path) ? "home" : "other";
  }

  function closeWebflowMobileMenu() {
    const openButton = document.querySelector(".w-nav-button.w--open");
    if (openButton) openButton.click();
  }

  function cleanupHeroHeadingTyping() {
    if (heroTypingTimeout) {
      clearTimeout(heroTypingTimeout);
      heroTypingTimeout = null;
    }

    document
      .querySelectorAll(".is-hero-typing-active")
      .forEach(el => el.classList.remove("is-hero-typing-active"));
  }

  function initStickyFeatures(root = document) {
    const homePaths = ["/", "/home"];
    if (!homePaths.includes(window.location.pathname)) return;
    if (!window.gsap || !window.ScrollTrigger) return;

    const wraps = Array.from(root.querySelectorAll("[data-sticky-feature-wrap]"));
    if (!wraps.length) return;

    wraps.forEach(w => {
      if (w.dataset.stickyFeaturesInitialized === "true") return;
      w.dataset.stickyFeaturesInitialized = "true";

      const visualWraps = Array.from(w.querySelectorAll("[data-sticky-feature-visual-wrap]"));
      const items = Array.from(w.querySelectorAll("[data-sticky-feature-item]"));
      const progressBar = w.querySelector("[data-sticky-feature-progress]");
      const count = Math.min(visualWraps.length, items.length);
      if (count < 1) return;

      const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const DURATION = rm ? 0.01 : 0.75;
      const HIDDEN_CLIP = "inset(50% round 0em)";
      const VISIBLE_CLIP = "inset(0% round 0em)";
      const getTexts = el => Array.from(el.querySelectorAll("[data-sticky-feature-text]"));

      gsap.set(visualWraps, { clipPath: HIDDEN_CLIP });
      gsap.set(visualWraps[0], { clipPath: VISIBLE_CLIP });
      gsap.set(items, { autoAlpha: 0 });
      gsap.set(items[0], { autoAlpha: 1 });

      items.forEach((item, index) => {
        gsap.set(getTexts(item), {
          autoAlpha: index === 0 ? 1 : 0,
          y: index === 0 ? 0 : -30
        });
      });

      if (progressBar) {
        gsap.set(progressBar, {
          scaleX: count === 1 ? 1 : 0,
          transformOrigin: "left center"
        });
      }

      let currentIndex = 0;

      function setVisualState(activeIndex) {
        visualWraps.forEach((visual, index) => {
          gsap.to(visual, {
            clipPath: index <= activeIndex ? VISIBLE_CLIP : HIDDEN_CLIP,
            duration: DURATION,
            ease: "power4.inOut",
            overwrite: "auto"
          });
        });
      }

      function animateOut(itemEl) {
        const texts = getTexts(itemEl);
        gsap.killTweensOf(texts);
        gsap.killTweensOf(itemEl);
        gsap.to(texts, {
          autoAlpha: 0,
          y: -30,
          ease: "power4.out",
          duration: 0.4,
          overwrite: "auto",
          onComplete: () => gsap.set(itemEl, { autoAlpha: 0 })
        });
      }

      function animateIn(itemEl) {
        const texts = getTexts(itemEl);
        gsap.killTweensOf(texts);
        gsap.killTweensOf(itemEl);
        gsap.set(itemEl, { autoAlpha: 1 });
        gsap.fromTo(texts, {
          autoAlpha: 0,
          y: 30
        }, {
          autoAlpha: 1,
          y: 0,
          ease: "power4.out",
          duration: DURATION,
          stagger: 0.1,
          overwrite: "auto"
        });
      }

      function transition(toIndex) {
        if (toIndex === currentIndex) return;
        setVisualState(toIndex);
        animateOut(items[currentIndex]);
        animateIn(items[toIndex]);
        currentIndex = toIndex;
      }

      ScrollTrigger.create({
        trigger: w,
        start: "center center",
        end: () => "+=" + count * 100 + "%",
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: self => {
          const p = self.progress;
          const idx = Math.max(0, Math.min(count - 1, Math.floor(p * count)));
          if (progressBar) gsap.set(progressBar, { scaleX: p });
          if (idx !== currentIndex) transition(idx);
        }
      });
    });

    ScrollTrigger.refresh();
  }

  let stickyStepsRaf = null;
  let stickyStepsListenersBound = false;

  function updateStickyStepsBasic(root = document) {
    const scope = root || document;
    const containers = Array.from(scope.querySelectorAll("[data-sticky-steps-init]"));

    if (scope.matches && scope.matches("[data-sticky-steps-init]")) {
      containers.unshift(scope);
    }

    if (!containers.length) return;

    containers.forEach(container => {
      const items = Array.from(container.querySelectorAll("[data-sticky-steps-item]"));
      if (!items.length) return;

      const viewportCenter = window.innerHeight / 2;
      let closestIndex = 0;
      let closestDistance = Infinity;

      items.forEach((item, index) => {
        const anchor = item.querySelector("[data-sticky-steps-anchor]");
        if (!anchor) return;

        const rect = anchor.getBoundingClientRect();
        const anchorCenter = rect.top + rect.height / 2;
        const distance = Math.abs(viewportCenter - anchorCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      items.forEach((item, index) => {
        let status = "active";
        if (index < closestIndex) status = "before";
        if (index > closestIndex) status = "after";

        item.setAttribute("data-sticky-steps-item-status", status);
      });
    });
  }

  function requestStickyStepsUpdate() {
    if (stickyStepsRaf) return;

    stickyStepsRaf = requestAnimationFrame(() => {
      stickyStepsRaf = null;
      updateStickyStepsBasic();
    });
  }

  function initStickyStepsBasic(root = document) {
    if (!stickyStepsListenersBound) {
      window.addEventListener("scroll", requestStickyStepsUpdate, { passive: true });
      window.addEventListener("resize", requestStickyStepsUpdate);
      document.addEventListener("scroll", requestStickyStepsUpdate, { passive: true, capture: true });
      document.addEventListener("wheel", requestStickyStepsUpdate, { passive: true });
      document.addEventListener("touchmove", requestStickyStepsUpdate, { passive: true });
      stickyStepsListenersBound = true;
    }

    updateStickyStepsBasic(root);
    requestStickyStepsUpdate();
  }

  window.initStickyStepsBasic = initStickyStepsBasic;
  window.updateStickyStepsBasic = updateStickyStepsBasic;

  function ensureNavbarVisible() {
    const nav = document.querySelector(".navbar2_component");
    if (!nav || !hasGsap) return;

    gsap.set(nav, { clearProps: "opacity,visibility,display,transform" });
    nav.style.removeProperty("opacity");
    nav.style.removeProperty("visibility");
    nav.style.removeProperty("display");
  }

  function syncNavbarVariantFromNextPage(nextHtml) {
    const currentNav = document.querySelector(".navbar2_component");
    if (!currentNav || !nextHtml) return;

    const tpl = document.createElement("template");
    tpl.innerHTML = nextHtml.trim();

    const nextNav = tpl.content.querySelector(".navbar2_component");
    if (!nextNav) return;

    currentNav.setAttribute("class", nextNav.getAttribute("class") || "");

    const variant = nextNav.getAttribute("data-wf--navbar--variant");
    if (variant) currentNav.setAttribute("data-wf--navbar--variant", variant);

    ensureNavbarVisible();
  }

  // ---------------------------------------------------------------------------
  // Testimonials
  // ---------------------------------------------------------------------------

  function initTestimonialSwiper(scope = document) {
    if (!window.Swiper) return;

    $$(".testimonial-slider", scope).forEach(sliderEl => {
      if (sliderEl.swiper) sliderEl.swiper.destroy(true, true);

      const component = sliderEl.closest(".testimonial-component") || sliderEl.parentElement;
      const slideCount = new Set(
        $$('[data-vimeo-lightbox-control="open"][data-vimeo-lightbox-id]', sliderEl)
          .map(btn => btn.getAttribute("data-vimeo-lightbox-id"))
      ).size || $$(".testimonial-slider__slide", sliderEl).length;

      new Swiper(sliderEl, {
        slidesPerView: 1,
        spaceBetween: 16,
        loop: slideCount > 1,
        rewind: false,
        speed: 1000,
        autoHeight: false,
        watchOverflow: true,
        navigation: {
          nextEl: component.querySelector(".testimonial-slider__arrow.is-next"),
          prevEl: component.querySelector(".testimonial-slider__arrow.is-prev")
        },
        pagination: {
          el: component.querySelector(".testimonial-slider__pagination"),
          clickable: true
        },
        keyboard: { enabled: true }
      });
    });
  }

  let _tcCursorEl = null;
  let _tcRAFStarted = false;
  let _tcMouseX = 0;
  let _tcMouseY = 0;
  let _tcRenderX = 0;
  let _tcRenderY = 0;
  let _tcActiveFrame = null;
  let _tcActiveButton = null;

  function cleanupTestimonialCursorState() {
    _tcActiveFrame = null;
    _tcActiveButton = null;

    document.querySelectorAll(".testimonial-cursor-play").forEach(el => {
      if (el !== _tcCursorEl) el.remove();
    });

    if (_tcCursorEl) {
      _tcCursorEl.style.display = "none";
      _tcCursorEl.style.opacity = "0";
    }
  }

  function initTestimonialCursor(scope = document) {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const frames = scope.querySelectorAll(".image-wrapper.is-testimonial");
    if (!frames.length) return;

    if (!_tcCursorEl) {
      _tcCursorEl = document.createElement("div");
      _tcCursorEl.className = "testimonial-cursor-play";
      _tcCursorEl.innerHTML = '<div class="play-button"><div class="play-icon"></div></div>';
      document.body.appendChild(_tcCursorEl);
      document.addEventListener("mousemove", e => {
        _tcMouseX = e.clientX;
        _tcMouseY = e.clientY;
      });
    }

    _tcCursorEl.style.cssText = "position:fixed;top:0;left:0;width:5rem;height:5rem;pointer-events:none;opacity:0;z-index:9999;transition:opacity 0.22s ease;";

    if (!document.getElementById("tc-cursor-styles")) {
      const style = document.createElement("style");
      style.id = "tc-cursor-styles";
      style.textContent = "@media(hover:hover)and(pointer:fine){.image-wrapper.is-testimonial{cursor:none}.image-wrapper.is-testimonial .play-button{transition:opacity .3s ease}.image-wrapper.is-testimonial:hover .play-button{opacity:0}}";
      document.head.appendChild(style);
    }

    frames.forEach(frame => {
      if (frame.dataset.testimonialCursorBound === "1") return;
      frame.dataset.testimonialCursorBound = "1";

      const button = frame.querySelector(".play-button");
      if (!button) return;

      frame.addEventListener("mouseenter", e => {
        _tcActiveFrame = frame;
        _tcActiveButton = button;
        _tcMouseX = _tcRenderX = e.clientX;
        _tcMouseY = _tcRenderY = e.clientY;
        _tcCursorEl.style.display = "block";
        _tcCursorEl.style.opacity = "1";
      });

      frame.addEventListener("mousemove", e => {
        _tcMouseX = e.clientX;
        _tcMouseY = e.clientY;
      });

      frame.addEventListener("mouseleave", () => {
        _tcActiveFrame = null;
        _tcActiveButton = null;
        _tcCursorEl.style.opacity = "0";
      });
    });

    if (!_tcRAFStarted) {
      _tcRAFStarted = true;
      (function tick() {
        let tx = _tcMouseX;
        let ty = _tcMouseY;

        if (_tcActiveFrame && _tcActiveButton) {
          const r = _tcActiveButton.getBoundingClientRect();
          tx = _tcMouseX + (r.left + r.width / 2 - _tcMouseX) * 0.82;
          ty = _tcMouseY + (r.top + r.height / 2 - _tcMouseY) * 0.82;
        }

        const ease = _tcActiveFrame ? 0.22 : 0.14;
        _tcRenderX += (tx - _tcRenderX) * ease;
        _tcRenderY += (ty - _tcRenderY) * ease;

        if (_tcCursorEl) {
          _tcCursorEl.style.transform = `translate3d(${_tcRenderX}px,${_tcRenderY}px,0) translate(-50%,-50%)`;
        }

        requestAnimationFrame(tick);
      })();
    }
  }

  function initVimeoLightboxAdvanced(root = document) {
    if (!window.Vimeo || !window.Vimeo.Player) return;
    if (document.documentElement.classList.contains("wf-design-mode")) return;

    const scope = root || document;
    const lightboxes = [];

    if (scope.matches && scope.matches("[data-vimeo-lightbox-init]")) lightboxes.push(scope);
    if (scope.querySelectorAll) {
      scope.querySelectorAll("[data-vimeo-lightbox-init]").forEach(lb => lightboxes.push(lb));
    }

    [...new Set(lightboxes)].forEach(lightbox => {
      if (lightbox.dataset.vimeoGlobalInit === "1") return;
      lightbox.dataset.vimeoGlobalInit = "1";

      const component = lightbox.closest(".testimonial-component");
      const openRoot = component || scope;
      const closeButtons = lightbox.querySelectorAll('[data-vimeo-lightbox-control="close"]');
      const playControl = lightbox.querySelector('[data-vimeo-control="play"]');
      const pauseControl = lightbox.querySelector('[data-vimeo-control="pause"]');
      const muteControl = lightbox.querySelector('[data-vimeo-control="mute"]');

      let iframe = lightbox.querySelector("iframe");
      const calcEl = lightbox.querySelector(".vimeo-lightbox__calc");
      const wrapEl = lightbox.querySelector(".vimeo-lightbox__calc-wrap");
      const playerContainer = lightbox.querySelector("[data-vimeo-lightbox-player]");

      if (!iframe || !calcEl || !wrapEl || !playerContainer) return;

      let player = null;
      let currentVideoID = null;
      let videoAspectRatio = null;
      const defaultMuted = lightbox.getAttribute("data-vimeo-muted") === "true";
      let globalMuted = defaultMuted;
      const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

      function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
      }

      function clampWrapSize(ar) {
        const w = calcEl.offsetWidth;
        const h = calcEl.offsetHeight;
        if (!w || !h || !ar || !isFinite(ar)) return;
        wrapEl.style.maxWidth = Math.min(w, h / ar) + "px";
      }

      function adjustCoverSizing() {
        if (!videoAspectRatio) return;

        const cH = playerContainer.offsetHeight;
        const cW = playerContainer.offsetWidth;
        if (!cH || !cW) return;

        const r = cH / cW;
        const iframeEl = lightbox.querySelector(".vimeo-lightbox__iframe");
        if (!iframeEl) return;

        if (r > videoAspectRatio) {
          iframeEl.style.width = (r / videoAspectRatio * 100) + "%";
          iframeEl.style.height = "100%";
        } else {
          iframeEl.style.height = (videoAspectRatio / r * 100) + "%";
          iframeEl.style.width = "100%";
        }
      }

      function clearLayoutState() {
        videoAspectRatio = null;
        wrapEl.style.maxWidth = "";

        const beforeEl = lightbox.querySelector(".vimeo-lightbox__before");
        if (beforeEl) beforeEl.style.paddingTop = "";

        const iframeEl = lightbox.querySelector(".vimeo-lightbox__iframe");
        if (iframeEl) {
          iframeEl.style.width = "";
          iframeEl.style.height = "";
        }
      }

      function resetSizingState() {
        clearLayoutState();
        const iframeEl = lightbox.querySelector(".vimeo-lightbox__iframe");
        if (iframeEl) iframeEl.style.opacity = "0";
      }

      function hideIframe() {
        const iframeEl = lightbox.querySelector(".vimeo-lightbox__iframe");
        if (iframeEl) iframeEl.style.opacity = "0";
      }

      function showIframe() {
        const iframeEl = lightbox.querySelector(".vimeo-lightbox__iframe");
        if (iframeEl) iframeEl.style.opacity = "1";
      }

      function closeLightbox() {
        lightbox.setAttribute("data-vimeo-activated", "false");
        if (player) {
          player.pause().catch(() => {});
          lightbox.setAttribute("data-vimeo-playing", "false");
        }
      }

      async function tryPlayDesktopWithSound() {
        lightbox.setAttribute("data-vimeo-muted", globalMuted ? "true" : "false");

        try {
          await player.setVolume(globalMuted ? 0 : 1).catch(() => {});
          if (typeof player.setMuted === "function") await player.setMuted(globalMuted).catch(() => {});
          await new Promise(resolve => setTimeout(resolve, 50));
          await player.play();
        } catch (_) {
          if (!globalMuted) {
            globalMuted = true;
            lightbox.setAttribute("data-vimeo-muted", "true");
            await player.setVolume(0).catch(() => {});
            if (typeof player.setMuted === "function") await player.setMuted(true).catch(() => {});
            await player.play().catch(() => {});
          }
        }
      }

      async function autoPlayTouchMuted() {
        globalMuted = true;
        lightbox.setAttribute("data-vimeo-muted", "true");
        await player.setVolume(0).catch(() => {});
        if (typeof player.setMuted === "function") await player.setMuted(true).catch(() => {});
        await player.play().catch(() => {});
      }

      async function playTouchUsingCurrentMuteState() {
        lightbox.setAttribute("data-vimeo-muted", globalMuted ? "true" : "false");
        await player.setVolume(globalMuted ? 0 : 1).catch(() => {});
        if (typeof player.setMuted === "function") await player.setMuted(globalMuted).catch(() => {});
        await player.play().catch(() => {});
      }

      async function runSizing() {
        if (!player) return;

        const beforeEl = lightbox.querySelector(".vimeo-lightbox__before");
        const iframeEl = lightbox.querySelector(".vimeo-lightbox__iframe");

        if (isTouch) {
          if (beforeEl) beforeEl.style.paddingTop = "177.778%";
          wrapEl.style.maxWidth = "";
          if (iframeEl) {
            iframeEl.style.width = "100%";
            iframeEl.style.height = "100%";
          }
          return;
        }

        await player.ready().catch(() => {});

        const mode = lightbox.getAttribute("data-vimeo-update-size");
        const w = await player.getVideoWidth().catch(() => 0);
        const h = await player.getVideoHeight().catch(() => 0);
        if (!w || !h) return;

        const ar = h / w;
        if (!ar || !isFinite(ar)) return;

        if (mode === "true") {
          if (beforeEl) beforeEl.style.paddingTop = (ar * 100) + "%";
          clampWrapSize(ar);
        } else if (mode === "cover") {
          videoAspectRatio = ar;
          if (beforeEl) beforeEl.style.paddingTop = "0%";
          adjustCoverSizing();
        } else {
          clampWrapSize(ar);
        }
      }

      function setupPlayerEvents() {
        player.on("loaded", () => {
          lightbox.setAttribute("data-vimeo-loaded", "true");
          runSizing().catch(() => {});
          requestAnimationFrame(() => {
            runSizing().catch(() => {});
            showIframe();
          });
          setTimeout(() => runSizing().catch(() => {}), 120);
        });

        player.on("play", () => {
          lightbox.setAttribute("data-vimeo-playing", "true");
          showIframe();
          runSizing().catch(() => {});
          setTimeout(() => runSizing().catch(() => {}), 180);
        });

        player.on("ended", closeLightbox);
        player.on("pause", () => lightbox.setAttribute("data-vimeo-playing", "false"));

        const durEl = lightbox.querySelector("[data-vimeo-duration]");
        player.getDuration().then(duration => {
          if (durEl) durEl.textContent = formatTime(duration);
          lightbox.querySelectorAll('[data-vimeo-control="timeline"], progress').forEach(el => {
            el.max = duration;
          });
        }).catch(() => {});

        const timeline = lightbox.querySelector('[data-vimeo-control="timeline"]');
        const progress = lightbox.querySelector("progress");

        player.on("timeupdate", data => {
          if (timeline) timeline.value = data.seconds;
          if (progress) progress.value = data.seconds;
          if (durEl) durEl.textContent = formatTime(Math.trunc(data.seconds));
        });

        if (timeline) {
          ["input", "change"].forEach(evt => {
            timeline.addEventListener(evt, e => {
              const value = e.target.value;
              player.setCurrentTime(value).catch(() => {});
              if (progress) progress.value = value;
            });
          });
        }

        let hoverTimer;
        playerContainer.addEventListener("mousemove", () => {
          lightbox.setAttribute("data-vimeo-hover", "true");
          clearTimeout(hoverTimer);
          hoverTimer = setTimeout(() => lightbox.setAttribute("data-vimeo-hover", "false"), 3000);
        });

        const fsBtn = lightbox.querySelector('[data-vimeo-control="fullscreen"]');
        if (fsBtn) {
          const isFullscreen = () => document.fullscreenElement || document.webkitFullscreenElement;

          if (!(document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
            fsBtn.style.display = "none";
          }

          fsBtn.addEventListener("click", () => {
            if (isFullscreen()) {
              lightbox.setAttribute("data-vimeo-fullscreen", "false");
              (document.exitFullscreen || document.webkitExitFullscreen).call(document);
            } else {
              lightbox.setAttribute("data-vimeo-fullscreen", "true");
              (playerContainer.requestFullscreen || playerContainer.webkitRequestFullscreen).call(playerContainer);
            }
          });

          ["fullscreenchange", "webkitfullscreenchange"].forEach(evt => {
            document.addEventListener(evt, () => {
              lightbox.setAttribute("data-vimeo-fullscreen", isFullscreen() ? "true" : "false");
            });
          });
        }
      }

      async function openLightbox(id) {
        if (!id) return;

        globalMuted = defaultMuted;
        lightbox.setAttribute("data-vimeo-muted", globalMuted ? "true" : "false");
        lightbox.setAttribute("data-vimeo-activated", "loading");
        lightbox.setAttribute("data-vimeo-loaded", "false");
        lightbox.setAttribute("data-vimeo-playing", "false");

        hideIframe();
        resetSizingState();
        clearLayoutState();

        if (player && (id !== currentVideoID || isTouch)) {
          await player.pause().catch(() => {});
          await player.unload().catch(() => {});

          const oldIframe = iframe;
          const newIframe = document.createElement("iframe");
          newIframe.className = oldIframe.className;
          newIframe.setAttribute("frameborder", "0");
          newIframe.setAttribute("allowfullscreen", "true");
          newIframe.setAttribute("allow", "autoplay; encrypted-media");
          newIframe.style.opacity = "0";

          oldIframe.parentNode.replaceChild(newIframe, oldIframe);
          iframe = newIframe;
          player = null;
          currentVideoID = null;
        }

        if (!player) {
          iframe.style.opacity = "0";
          iframe.src = `https://player.vimeo.com/video/${id}?api=1&autoplay=0&loop=0&muted=0&playsinline=1`;
          player = new Vimeo.Player(iframe);
          lightbox._vimeoPlayer = player;
          setupPlayerEvents();
          currentVideoID = id;
        }

        lightbox.setAttribute("data-vimeo-activated", "true");
        requestAnimationFrame(() => runSizing().catch(() => {}));
        setTimeout(() => runSizing().catch(() => {}), 120);

        await player.ready().catch(() => {});
        runSizing().catch(() => {});

        if (isTouch) await autoPlayTouchMuted();
        else await tryPlayDesktopWithSound();
      }

      document.addEventListener("keydown", e => {
        if (!document.documentElement.contains(lightbox)) return;
        if (e.key === "Escape") closeLightbox();
      });

      window.addEventListener("resize", () => {
        if (player && document.documentElement.contains(lightbox)) runSizing().catch(() => {});
      }, { passive: true });

      closeButtons.forEach(btn => btn.addEventListener("click", closeLightbox));

      if (playControl) {
        playControl.addEventListener("click", async () => {
          if (!player || !currentVideoID) return;

          if (isTouch) {
            await playTouchUsingCurrentMuteState();
          } else {
            await player.setVolume(globalMuted ? 0 : 1).catch(() => {});
            if (typeof player.setMuted === "function") await player.setMuted(globalMuted).catch(() => {});

            player.play().catch(async () => {
              if (!globalMuted) {
                globalMuted = true;
                lightbox.setAttribute("data-vimeo-muted", "true");
                await player.setVolume(0).catch(() => {});
                if (typeof player.setMuted === "function") await player.setMuted(true).catch(() => {});
                await player.play().catch(() => {});
              }
            });
          }
        });
      }

      if (pauseControl) {
        pauseControl.addEventListener("click", () => {
          if (player) player.pause().catch(() => {});
        });
      }

      if (muteControl) {
        muteControl.addEventListener("click", async () => {
          if (!player) return;
          globalMuted = !globalMuted;
          await player.setVolume(globalMuted ? 0 : 1).catch(() => {});
          if (typeof player.setMuted === "function") await player.setMuted(globalMuted).catch(() => {});
          lightbox.setAttribute("data-vimeo-muted", globalMuted ? "true" : "false");
          if (isTouch) await player.play().catch(() => {});
        });
      }

      openRoot.addEventListener("click", e => {
        const btn = e.target.closest('[data-vimeo-lightbox-control="open"]');
        if (!btn || !openRoot.contains(btn)) return;

        e.preventDefault();
        openLightbox(btn.getAttribute("data-vimeo-lightbox-id"));
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Registration form
  // ---------------------------------------------------------------------------

  function injectZone01FormStyles() {
    if (document.getElementById("zone01-form-error-styles")) return;

    const style = document.createElement("style");
    style.id = "zone01-form-error-styles";
    style.textContent = ".zone01-field-error input,.zone01-field-error .checkbox,.zone01-field-error.cf-turnstile{outline:2px solid #ff5a5f!important;outline-offset:4px;}";
    document.head.appendChild(style);
  }

  function setupRegistrationForm(root = document) {
    const FORM_SELECTOR = "#wf-form-Form";
    const ENDPOINT = "https://funnel.zone01.gr/signup";

    function setAttrs(el, attrs) {
      if (!el) return;
      Object.keys(attrs).forEach(key => el.setAttribute(key, attrs[key]));
    }

    function setupForm(form) {
      if (!form || form.dataset.zone01Ready === "true") return;
      form.dataset.zone01Ready = "true";

      setAttrs(form.querySelector("#First-Name"), { maxlength: "60", autocomplete: "given-name" });
      setAttrs(form.querySelector("#Last-Name"), { maxlength: "60", autocomplete: "family-name" });
      setAttrs(form.querySelector("#Email"), { type: "email", maxlength: "254", autocomplete: "email" });
      setAttrs(form.querySelector("#Phone-Number"), {
        type: "tel",
        maxlength: "20",
        inputmode: "tel",
        autocomplete: "tel",
        title: "Enter a valid phone number, e.g. +30 690 000 0000."
      });

      const phone = form.querySelector("#Phone-Number");
      if (phone) phone.removeAttribute("pattern");

      const terms = form.querySelector("#Checkbox-terms");
      if (terms) terms.required = true;
    }

    function clearErrors(form) {
      form.querySelectorAll(".zone01-field-error").forEach(el => {
        el.classList.remove("zone01-field-error");
      });
    }

    function highlightField(form, fieldName) {
      let target;

      if (fieldName === "cf-turnstile-response") {
        target = form.querySelector(".cf-turnstile");
      } else {
        target = form.elements[fieldName];
      }

      if (!target) return;

      const el = target.length ? target[0] : target;
      const wrapper = el.closest(".form-list, .form_checkbox, .checkbox-wrapper") || el;
      wrapper.classList.add("zone01-field-error");
    }

    function setMessage(form, type, message) {
      const wrapper = form.closest(".w-form");
      if (!wrapper) return;

      const success = wrapper.querySelector(".w-form-done");
      const fail = wrapper.querySelector(".w-form-fail");

      if (success) success.style.display = type === "success" ? "block" : "none";
      if (fail) fail.style.display = type === "error" ? "block" : "none";

      const box = type === "success" ? success : fail;
      const text = box && box.querySelector(".text-size-medium");
      if (text && message) text.textContent = message;

      if (type === "success") {
        form.style.display = "none";
        if (success) success.focus();
      }
    }

    function validatePhone(input) {
      if (!input) return;

      const raw = input.value.trim();
      const digits = raw.replace(/\D/g, "");
      const allowedChars = /^\+?[0-9\s().-]+$/.test(raw);
      const validPlus = raw.indexOf("+") <= 0 && raw.indexOf("+") === raw.lastIndexOf("+");

      input.setCustomValidity("");
      if (!raw) return;

      if (!allowedChars || !validPlus || digits.length < 7 || digits.length > 15) {
        input.setCustomValidity("Enter a valid phone number.");
      }
    }

    function disableSubmitFor(form, ms) {
      const submit = form.querySelector('[type="submit"]');
      if (!submit) return;

      submit.disabled = true;

      setTimeout(() => {
        submit.disabled = false;
        delete form.dataset.rateLimited;
      }, ms);
    }

    function setupAll(scope) {
      (scope || document).querySelectorAll(FORM_SELECTOR).forEach(setupForm);
    }

    setupAll(root);

    if (!window.zone01RegistrationFormHandlerAttached) {
      window.zone01RegistrationFormHandlerAttached = true;

      new MutationObserver(() => {
        setupAll(document);
      }).observe(document.documentElement, { childList: true, subtree: true });

      function clearFeedback(event) {
        const form = event.target.closest && event.target.closest(FORM_SELECTOR);
        if (!form) return;

        clearErrors(form);
        setMessage(form, null);

        if (event.target.id === "Phone-Number") validatePhone(event.target);
      }

      document.addEventListener("input", clearFeedback);
      document.addEventListener("change", clearFeedback);

      document.addEventListener("submit", async event => {
        const form = event.target;
        if (!form.matches || !form.matches(FORM_SELECTOR)) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        setupForm(form);
        clearErrors(form);
        setMessage(form, null);

        ["#First-Name", "#Last-Name", "#Email", "#Phone-Number"].forEach(selector => {
          const input = form.querySelector(selector);
          if (input) input.value = input.value.trim();
        });

        validatePhone(form.querySelector("#Phone-Number"));

        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        const formData = new FormData(form);
        const turnstileToken = formData.get("cf-turnstile-response");

        if (!turnstileToken) {
          highlightField(form, "cf-turnstile-response");
          setMessage(form, "error", "Anti-bot check is still loading. Please wait a moment and try again.");
          return;
        }

        const submit = form.querySelector('[type="submit"]');
        const oldValue = submit && submit.value;

        try {
          if (submit) {
            submit.disabled = true;
            submit.value = submit.getAttribute("data-wait") || "Please wait...";
          }

          const response = await fetch(ENDPOINT, {
            method: "POST",
            body: new URLSearchParams(formData)
          });

          const result = await response.json();

          if (result.ok) {
            form.reset();
            setMessage(form, "success", result.message);
            return;
          }

          if (Array.isArray(result.fields)) {
            result.fields.forEach(fieldName => highlightField(form, fieldName));
          }

          if (result.error === "turnstile_failed" && window.turnstile) window.turnstile.reset();

          if (result.error === "rate_limited") {
            form.dataset.rateLimited = "true";
            disableSubmitFor(form, 60000);
          } else {
            delete form.dataset.rateLimited;
          }

          setMessage(form, "error", result.message || "Something went wrong. Please try again.");
        } catch (error) {
          console.error("Registration form submit failed:", error);
          setMessage(form, "error", "Connection problem. Please check your internet and try again.");
        } finally {
          if (submit && !form.dataset.rateLimited) {
            submit.disabled = false;
            submit.value = oldValue;
          }
        }
      }, true);
    }
  }

  // ---------------------------------------------------------------------------
  // Barba bootstrap
  // ---------------------------------------------------------------------------

  if (hasBarba && hasGsap) {
    barba.hooks.beforeEnter(data => {
      updatePageRouteState(data.next.url.path);

      if (data.current?.container) {
        gsap.set(data.current.container, {
          position: "relative",
          height: "100dvh",
          overflow: "hidden",
          zIndex: 1
        });
      }

      const transitionWrap = document.querySelector("[data-transition-wrap]");
      if (transitionWrap && transitionWrap.parentNode === document.body) {
        transitionWrap.insertAdjacentElement("afterend", data.next.container);
      } else {
        document.body.appendChild(data.next.container);
      }

      gsap.set(data.next.container, {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        zIndex: 2,
        autoAlpha: 1
      });

      if (lenis && typeof lenis.stop === "function") lenis.stop();
      initBeforeEnterFunctions(data.next.container);
    });

    barba.hooks.afterLeave(() => {
      if (hasScrollTrigger) ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    });

    barba.hooks.enter(data => {
      syncNavbarVariantFromNextPage(data.next.html);
      initBarbaNavUpdate(data);
    });

    barba.hooks.afterEnter(data => {
      updatePageRouteState(data.next.url.path);
      initAfterEnterFunctions(data.next.container);

      if (hasLenis && lenis) {
        lenis.resize();
        lenis.start();
      }

      if (hasScrollTrigger) ScrollTrigger.refresh();
    });

    barba.hooks.beforeLeave(() => {
      closeWebflowMobileMenu();
      cleanupHeroHeadingTyping();
      cleanupTestimonialCursorState();
      document.body.dataset.pageRoute = "transitioning";
    });

    if (window.barbaPrefetch && !window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
      barba.use(barbaPrefetch);
    }

    barba.init({
      debug: false,
      timeout: 15000,
      cacheIgnore: false,
      prefetchIgnore: false,
      preventRunning: true,

      prevent: ({ el, href }) => {
        if (!href) return false;

        let url;
        try {
          url = new URL(href, window.location.origin);
        } catch (_) {
          url = null;
        }

        return (
          href.startsWith("#") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:") ||
          el.hasAttribute("download") ||
          el.target === "_blank" ||
          el.closest("[data-barba-prevent]") ||
          (url && url.origin === window.location.origin && url.pathname === "/register")
        );
      },

      transitions: [{
        name: "default",
        sync: true,
        once: data => {
          initOnceFunctions();
          return runPageOnceAnimation(data.next.container);
        },
        leave: data => runPageLeaveAnimation(data.current.container, data.next.container),
        enter: data => runPageEnterAnimation(data.next.container)
      }]
    });
  } else {
    initOnceFunctions();
  }
})();
