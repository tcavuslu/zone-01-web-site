(() => {
  if (window.__zoneBarbaLoaded || !window.gsap || !window.barba) return;
  window.__zoneBarbaLoaded = true;

  gsap.registerPlugin(CustomEase);
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  CustomEase.create("osmo", "0.625, 0.05, 0, 1");
  gsap.defaults({ ease: "osmo", duration: 0.6 });

  document.body.setAttribute("data-barba", "wrapper");
  history.scrollRestoration = "manual";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const cssVar = (name, fallback) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  const ST = window.ScrollTrigger;
  const main = $(".main-wrapper");
  if (main && !main.hasAttribute("data-barba")) main.setAttribute("data-barba", "container");

  let nextPage = document;
  let onceDone = false;
  const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = rm.matches;
  if (rm.addEventListener) {
  rm.addEventListener("change", function (e) {
    reducedMotion = e.matches;
  });
}

  function ensureTransitionMarkup() {
    let wrap = $("[data-transition-wrap]");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.setAttribute("data-transition-wrap", "");
      wrap.innerHTML = '<div data-transition-panel><div data-transition-col><div data-transition-pixel></div></div></div>';
      document.body.prepend(wrap);
    }
    if (!$("[data-transition-panel]", wrap)) {
      wrap.innerHTML = '<div data-transition-panel><div data-transition-col><div data-transition-pixel></div></div></div>';
    }
  }

  (() => {
    const url = "https://calendly.com/imichalop-zone01/discovery-call?from=slack&month=2026-04";
    let loaded = false, loading = false;

    function isCal(el) {
      const a = el?.closest?.(".cta-calendly");
      if (!a) return false;
      const h = a.getAttribute("href") || "";
      return a.dataset.calendly === "true" || h === "#" || h === "" || h.includes("calendly.com");
    }

    window.__isCalendlyTrigger = isCal;

    function open() {
      if (window.Calendly) window.Calendly.initPopupWidget({ url });
    }

    function load(cb) {
      if (loaded) return cb();
      if (loading) {
        const i = setInterval(() => {
          if (loaded) {
            clearInterval(i);
            cb();
          }
        }, 100);
        return;
      }
      loading = true;

      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://assets.calendly.com/assets/external/widget.css";
      document.head.appendChild(css);

      const js = document.createElement("script");
      js.src = "https://assets.calendly.com/assets/external/widget.js";
      js.onload = () => {
        loaded = true;
        loading = false;
        cb();
      };
      js.onerror = () => {
        loading = false;
        alert("Calendly failed to load");
      };
      document.body.appendChild(js);
    }

    document.addEventListener("click", e => {
      if (!isCal(e.target)) return;
      e.preventDefault();
      load(open);
    });
  })();

    function ensureShareStyles() {
    if (document.getElementById("share-feedback-styles")) return;

    const style = document.createElement("style");
    style.id = "share-feedback-styles";
    style.textContent = `
      .blog-post1-content_social-link {
        position: relative;
        transition: opacity 200ms ease;
      }

      .blog-post1-content_social-link:hover,
      .blog-post1-content_social-link:focus-visible {
        opacity: 0.65;
      }

      .share-feedback {
        position: absolute;
        left: 50%;
        top: calc(100% + 0.5rem);
        transform: translateX(-50%);
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        background-color: #f7f7f9;
        color: #161718;
        font-size: 1rem;
        line-height: 1;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition:
          opacity 240ms ease,
          visibility 0ms linear 240ms;
        z-index: 10;
      }

      .blog-post1-content_social-link.is-active-feedback .share-feedback {
        opacity: 1;
        visibility: visible;
        transition:
          opacity 240ms ease,
          visibility 0ms linear 0ms;
      }
    `;
    document.head.appendChild(style);
  }

  function initShareButtons(root = document) {
    ensureShareStyles();

    if (window.__shareButtonsBound) return;
    window.__shareButtonsBound = true;

    function getShareData(button) {
      const cleanUrl = window.location.origin + window.location.pathname;
      const scope =
        button.closest("article, main, .main-wrapper") || document;
      const titleEl = scope.querySelector("h1");
      const title = titleEl ? titleEl.textContent.trim() : document.title;

      return {
        url: cleanUrl,
        title: title
      };
    }

    function showShareFeedback(button, message) {
      let feedback = button.querySelector(".share-feedback");

      if (!feedback) {
        feedback = document.createElement("span");
        feedback.className = "share-feedback";
        button.appendChild(feedback);
      }

      feedback.textContent = message;
      button.classList.add("is-active-feedback");

      clearTimeout(button.shareFeedbackTimeout);

      button.shareFeedbackTimeout = setTimeout(function () {
        button.classList.remove("is-active-feedback");
      }, 1600);
    }

    function copyToClipboard(text, button) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          showShareFeedback(button, "Copied");
        }).catch(function () {
          showShareFeedback(button, "Copy failed");
        });
      } else {
        const tempInput = document.createElement("input");
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();

        try {
          document.execCommand("copy");
          showShareFeedback(button, "Copied");
        } catch (e) {
          showShareFeedback(button, "Copy failed");
        }

        document.body.removeChild(tempInput);
      }
    }

    document.addEventListener("click", function (event) {
      const button = event.target.closest(
        ".copy-link-button, .linkedin-share-button, .x-share-button, .facebook-share-button"
      );

      if (!button) return;

      event.preventDefault();

      const shareData = getShareData(button);
      let shareUrl = "";

      if (button.classList.contains("copy-link-button")) {
        copyToClipboard(shareData.url, button);
        return;
      }

      if (button.classList.contains("linkedin-share-button")) {
        shareUrl =
          "https://www.linkedin.com/sharing/share-offsite/?url=" +
          encodeURIComponent(shareData.url);
      }

      if (button.classList.contains("x-share-button")) {
        shareUrl =
          "https://twitter.com/intent/tweet?url=" +
          encodeURIComponent(shareData.url) +
          "&text=" +
          encodeURIComponent(shareData.title);
      }

      if (button.classList.contains("facebook-share-button")) {
        shareUrl =
          "https://www.facebook.com/sharer/sharer.php?u=" +
          encodeURIComponent(shareData.url);
      }

      if (shareUrl) {
        window.open(shareUrl, "_blank", "noopener,noreferrer");
      }
    });
  }

  function initButtons(root = document) {
    $$(".button .button-text", root).forEach(el => {
      const text = (el.getAttribute("data-text") || el.textContent || "").trim();
      const chars = text.length;
      el.style.setProperty("--chars", chars);
      el.style.setProperty("--typing-duration", Math.max(0.28, Math.min(chars * 0.045, 1.2)) + "s");
    });
  }

  function initStats(root = document) {
    $$(".stats-list-wrapper", root).forEach(w => {
      if (w.dataset.statsInit) return;
      w.dataset.statsInit = "1";

      const stats = $$(".stats-card-content .display-text:first-child", w).map(el => {
        const finalText = el.dataset.finalText || el.textContent;
        const end = parseInt(finalText.replace(/[^\d]/g, ""), 10);
        if (Number.isNaN(end)) return null;
        el.dataset.finalText = finalText;
        el.textContent = "0";
        return { el, end, finalText };
      }).filter(Boolean);

      if (!stats.length) return;

      const obs = new IntersectionObserver(entries => {
        if (!entries.some(e => e.isIntersecting)) return;

        stats.forEach(s => {
          const start = performance.now();
          const tick = now => {
            const p = Math.min((now - start) / 1100, 1);
            s.el.textContent = Math.round(s.end * (1 - Math.pow(1 - p, 5)));
            if (p < 1) requestAnimationFrame(tick);
            else s.el.textContent = s.finalText;
          };
          requestAnimationFrame(tick);
        });

        obs.disconnect();
      }, { threshold: 0.35 });

      obs.observe(w);
    });
  }

function initSticky(root = document) {
  if (!ST) return;

  $$("[data-sticky-feature-wrap]", root).forEach(w => {
    if (w.dataset.stickyFeaturesInitialized === "true") return;
    w.dataset.stickyFeaturesInitialized = "true";

    const visualWraps = $$("[data-sticky-feature-visual-wrap]", w);
    const items = $$("[data-sticky-feature-item]", w);
    const progressBar = $("[data-sticky-feature-progress]", w);

    const count = Math.min(visualWraps.length, items.length);
    if (count < 1) return;

    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DURATION = rm ? 0.01 : 0.75;
    const EASE = "power4.inOut";
    const HIDDEN_CLIP = "inset(50% round 0em)";
    const VISIBLE_CLIP = "inset(0% round 0em)";
    const getTexts = el => $$("[data-sticky-feature-text]", el);

    gsap.set(visualWraps, { clipPath: HIDDEN_CLIP });
    gsap.set(visualWraps[0], { clipPath: VISIBLE_CLIP });

    gsap.set(items, { autoAlpha: 0 });
    gsap.set(items[0], { autoAlpha: 1 });

    items.forEach((item, index) => {
      const texts = getTexts(item);
      gsap.set(texts, {
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
          ease: EASE,
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
      gsap.fromTo(
        texts,
        { autoAlpha: 0, y: 30 },
        {
          autoAlpha: 1,
          y: 0,
          ease: "power4.out",
          duration: DURATION,
          stagger: 0.1,
          overwrite: "auto"
        }
      );
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
      end: function () {
        return "+=" + count * 100 + "%";
      },
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: self => {
        const p = self.progress;
        let idx = Math.floor(p * count);

        idx = Math.max(0, Math.min(count - 1, idx));

        if (progressBar) {
          gsap.set(progressBar, { scaleX: p });
        }

        if (idx !== currentIndex) {
          transition(idx);
        }
      }
    });
  });
}

  function initLogoWall(root = document) {
    if (!window.gsap) return;

    $$("[data-logo-wall-cycle-init]", root).forEach(c => {
      c._logoClean?.();

      const list = $("[data-logo-wall-list]", c);
      if (!list) return;

      const items = $$("[data-logo-wall-item]", list);
      if (!items.length) return;

      if (!c._logoOriginal) {
        c._logoOriginal = items.map(i => $("[data-logo-wall-target]", i)).filter(Boolean).map(t => t.cloneNode(true));
      }

      const original = c._logoOriginal;
      if (!original.length) return;

      const parentMap = new Map(items.map(i => [
        i,
        $("[data-logo-wall-target-parent]", i) || $("[data-logo-wall-target]", i)?.parentElement || i
      ]));

      let visible = [], count = 0, pool = [], pattern = [], index = 0, tl, trig, resizeTimer;
      const shuffle = a => {
        a = a.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      };
      const isVisible = el => getComputedStyle(el).display !== "none";
      const parent = item => parentMap.get(item) || item;

      function clear() {
        items.forEach(i => $$("[data-logo-wall-target]", i).forEach(t => t.remove()));
      }

      function setup() {
        tl?.kill();
        visible = items.filter(isVisible);
        count = visible.length;
        if (!count) return;

        clear();
        pattern = shuffle(Array.from({ length: count }, (_, i) => i));
        index = 0;

        pool = original.map(t => t.cloneNode(true));
        const shuffled = c.getAttribute("data-logo-wall-shuffle") === "false" ? pool : shuffle(pool);
        const front = shuffled.slice(0, count);
        const rest = shuffle(shuffled.slice(count));
        pool = front.concat(rest);

        for (let i = 0; i < count; i++) {
          if (pool.length) parent(visible[i]).appendChild(pool.shift());
        }

        tl = gsap.timeline({ repeat: -1, repeatDelay: 1.5 });
        tl.call(swap);
        tl.play();
      }

      function swap() {
        if (items.filter(isVisible).length !== count) return setup();
        if (!pool.length || !count) return;

        const item = visible[pattern[index++ % count]];
        const p = parent(item);
        if (p.querySelectorAll("[data-logo-wall-target]").length > 1) return;

        const current = $("[data-logo-wall-target]", p);
        const incoming = pool.shift();
        if (!incoming) return;

        gsap.set(incoming, { yPercent: 50, autoAlpha: 0 });
        p.appendChild(incoming);

        if (current) {
          gsap.to(current, {
            yPercent: -50,
            autoAlpha: 0,
            duration: 0.9,
            ease: "expo.inOut",
            onComplete: () => {
              current.remove();
              pool.push(current);
            }
          });
        }

        gsap.to(incoming, { yPercent: 0, autoAlpha: 1, duration: 0.9, delay: 0.1, ease: "expo.inOut" });
      }

      const vis = () => tl && (document.hidden ? tl.pause() : tl.play());
      const resize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(setup, 150);
      };

      setup();

      if (ST) {
        trig = ScrollTrigger.create({
          trigger: c,
          start: "top bottom",
          end: "bottom top",
          onEnter: () => tl?.play(),
          onLeave: () => tl?.pause(),
          onEnterBack: () => tl?.play(),
          onLeaveBack: () => tl?.pause()
        });
      }

      document.addEventListener("visibilitychange", vis);
      window.addEventListener("resize", resize, { passive: true });

      c._logoClean = () => {
        tl?.kill();
        trig?.kill();
        document.removeEventListener("visibilitychange", vis);
        window.removeEventListener("resize", resize);
        c._logoClean = null;
      };
    });
  }

  function cleanupLogoWall(root = document) {
    $$("[data-logo-wall-cycle-init]", root).forEach(c => c._logoClean?.());
  }

 function initSwiper(root = document) {
  if (!window.Swiper) return;

  $$(".testimonial-slider", root).forEach(slider => {
    if (slider.swiper) slider.swiper.destroy(true, true);

    const c = slider.closest(".testimonial-component") || slider.parentElement;
    const slideCount = new Set(
      $$('[data-vimeo-lightbox-control="open"][data-vimeo-lightbox-id]', slider)
        .map(btn => btn.getAttribute("data-vimeo-lightbox-id"))
    ).size || $$(".testimonial-slider__slide", slider).length;

    const useLoop = slideCount > 1;

    new Swiper(slider, {
  slidesPerView: 1,
  spaceBetween: 16,
  loop: slideCount > 1,
  rewind: false,
  speed: 1000,
  watchOverflow: true,
  navigation: {
    nextEl: $(".testimonial-slider__arrow.is-next", c),
    prevEl: $(".testimonial-slider__arrow.is-prev", c)
  },
  pagination: {
    el: $(".testimonial-slider__pagination", c),
    clickable: true
  },
  keyboard: { enabled: true }
});
  });
}

  let cursor, cursorRAF, mx = 0, my = 0, rx = 0, ry = 0, activeFrame = null, activeButton = null;

  function initCursor(root = document) {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const frames = $$(".image-wrapper.is-testimonial", root);
    if (!frames.length) return;

    if (!cursor) {
      cursor = document.createElement("div");
      cursor.className = "testimonial-cursor-play";
      cursor.innerHTML = '<div class="play-button"><div class="play-icon"></div></div>';
      cursor.style.cssText = "position:fixed;top:0;left:0;width:5rem;height:5rem;pointer-events:none;opacity:0;z-index:9999;transition:opacity .22s ease;";
      document.body.appendChild(cursor);

      document.addEventListener("mousemove", e => {
        mx = e.clientX;
        my = e.clientY;
      });
    }

    frames.forEach(frame => {
      if (frame.dataset.cursorBound) return;
      frame.dataset.cursorBound = "1";

      const btn = $(".play-button", frame);
      if (!btn) return;

      frame.addEventListener("mouseenter", e => {
        activeFrame = frame;
        activeButton = btn;
        mx = rx = e.clientX;
        my = ry = e.clientY;
        cursor.style.opacity = "1";
      });

      frame.addEventListener("mousemove", e => {
        mx = e.clientX;
        my = e.clientY;
      });

      frame.addEventListener("mouseleave", () => {
        activeFrame = activeButton = null;
        cursor.style.opacity = "0";
      });
    });

    if (!cursorRAF) {
      cursorRAF = true;
      (function tick() {
        let tx = mx, ty = my;

        if (activeFrame && activeButton) {
          const r = activeButton.getBoundingClientRect();
          tx = mx + (r.left + r.width / 2 - mx) * 0.82;
          ty = my + (r.top + r.height / 2 - my) * 0.82;
        }

        const e = activeFrame ? 0.22 : 0.14;
        rx += (tx - rx) * e;
        ry += (ty - ry) * e;

        if (cursor) cursor.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
        requestAnimationFrame(tick);
      })();
    }
  }

  function cleanupCursor() {
    activeFrame = activeButton = null;
    if (cursor) cursor.style.opacity = "0";
    $$(".testimonial-cursor-play").forEach(el => {
      if (el !== cursor) el.remove();
    });
  }

function initVimeo(root = document) {
  if (!window.Vimeo) return;

  $$("[data-vimeo-lightbox-init]", root).forEach(lightbox => {
    if (lightbox.dataset.vimeoInit) return;
    lightbox.dataset.vimeoInit = "1";

    const component = lightbox.closest(".testimonial-component");
    const openButtons = component
      ? $$('[data-vimeo-lightbox-control="open"]', component)
      : $$('[data-vimeo-lightbox-control="open"]', root);

    const closeButtons = $$('[data-vimeo-lightbox-control="close"]', lightbox);
    const playControl = $('[data-vimeo-control="play"]', lightbox);
    const pauseControl = $('[data-vimeo-control="pause"]', lightbox);
    const muteControl = $('[data-vimeo-control="mute"]', lightbox);
    const fsBtn = $('[data-vimeo-control="fullscreen"]', lightbox);

    let iframe = $("iframe", lightbox);
    const calcEl = $(".vimeo-lightbox__calc", lightbox);
    const wrapEl = $(".vimeo-lightbox__calc-wrap", lightbox);
    const playerContainer = $("[data-vimeo-lightbox-player]", lightbox);

    if (!iframe || !calcEl || !wrapEl || !playerContainer) return;

    let player = null;
    let currentVideoID = null;
    let videoAspectRatio = null;
    const defaultMuted = lightbox.getAttribute("data-vimeo-muted") === "true";
    let globalMuted = defaultMuted;
    const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

    function formatTime(s) {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60).toString().padStart(2, "0");
      return `${m}:${sec}`;
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
      const iframeEl = $(".vimeo-lightbox__iframe", lightbox);
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

      const bef = $(".vimeo-lightbox__before", lightbox);
      if (bef) bef.style.paddingTop = "";

      const iframeEl = $(".vimeo-lightbox__iframe", lightbox);
      if (iframeEl) {
        iframeEl.style.width = "";
        iframeEl.style.height = "";
      }
    }

    function resetSizingState() {
      clearLayoutState();
      const iframeEl = $(".vimeo-lightbox__iframe", lightbox);
      if (iframeEl) iframeEl.style.opacity = "0";
    }

    function hideIframe() {
      const iframeEl = $(".vimeo-lightbox__iframe", lightbox);
      if (iframeEl) iframeEl.style.opacity = "0";
    }

    function showIframe() {
      const iframeEl = $(".vimeo-lightbox__iframe", lightbox);
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
        if (typeof player.setMuted === "function") {
          await player.setMuted(globalMuted).catch(() => {});
        }
        await new Promise(resolve => setTimeout(resolve, 50));
        await player.play();
      } catch (_) {
        if (!globalMuted) {
          globalMuted = true;
          lightbox.setAttribute("data-vimeo-muted", "true");
          await player.setVolume(0).catch(() => {});
          if (typeof player.setMuted === "function") {
            await player.setMuted(true).catch(() => {});
          }
          await player.play().catch(() => {});
        }
      }
    }

    async function autoPlayTouchMuted() {
      globalMuted = true;
      lightbox.setAttribute("data-vimeo-muted", "true");

      await player.setVolume(0).catch(() => {});
      if (typeof player.setMuted === "function") {
        await player.setMuted(true).catch(() => {});
      }

      await player.play().catch(() => {});
    }

    async function playTouchUsingCurrentMuteState() {
      lightbox.setAttribute("data-vimeo-muted", globalMuted ? "true" : "false");

      await player.setVolume(globalMuted ? 0 : 1).catch(() => {});
      if (typeof player.setMuted === "function") {
        await player.setMuted(globalMuted).catch(() => {});
      }

      await player.play().catch(() => {});
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

      player.on("pause", () => {
        lightbox.setAttribute("data-vimeo-playing", "false");
      });

      const durEl = $("[data-vimeo-duration]", lightbox);
      player.getDuration().then(d => {
        if (durEl) durEl.textContent = formatTime(d);
        lightbox
          .querySelectorAll('[data-vimeo-control="timeline"], progress')
          .forEach(el => el.max = d);
      }).catch(() => {});

      const tl = $('[data-vimeo-control="timeline"]', lightbox);
      const pr = $("progress", lightbox);

      player.on("timeupdate", data => {
        if (tl) tl.value = data.seconds;
        if (pr) pr.value = data.seconds;
        if (durEl) durEl.textContent = formatTime(Math.trunc(data.seconds));
      });

      if (tl) {
        ["input", "change"].forEach(evt => {
          tl.addEventListener(evt, e => {
            const v = e.target.value;
            player.setCurrentTime(v).catch(() => {});
            if (pr) pr.value = v;
          });
        });
      }

      let hoverTimer;
      playerContainer.addEventListener("mousemove", () => {
        lightbox.setAttribute("data-vimeo-hover", "true");
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          lightbox.setAttribute("data-vimeo-hover", "false");
        }, 3000);
      });

      if (fsBtn) {
        const isFS = () => document.fullscreenElement || document.webkitFullscreenElement;

        if (!(document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
          fsBtn.style.display = "none";
        }

        fsBtn.addEventListener("click", () => {
          if (isFS()) {
            lightbox.setAttribute("data-vimeo-fullscreen", "false");
            (document.exitFullscreen || document.webkitExitFullscreen).call(document);
          } else {
            lightbox.setAttribute("data-vimeo-fullscreen", "true");
            (playerContainer.requestFullscreen || playerContainer.webkitRequestFullscreen).call(playerContainer);
          }
        });

        ["fullscreenchange", "webkitfullscreenchange"].forEach(evt => {
          document.addEventListener(evt, () => {
            lightbox.setAttribute("data-vimeo-fullscreen", isFS() ? "true" : "false");
          });
        });
      }
    }

    async function runSizing() {
      if (!player) return;

      const bef = $(".vimeo-lightbox__before", lightbox);
      const iframeEl = $(".vimeo-lightbox__iframe", lightbox);

      if (isTouch) {
        if (bef) bef.style.paddingTop = "177.778%";
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
        if (bef) bef.style.paddingTop = (ar * 100) + "%";
        clampWrapSize(ar);
      } else if (mode === "cover") {
        videoAspectRatio = ar;
        if (bef) bef.style.paddingTop = "0%";
        adjustCoverSizing();
      } else {
        clampWrapSize(ar);
      }
    }

    window.addEventListener("resize", () => {
      if (player) runSizing().catch(() => {});
    });

    async function openLightbox(id) {
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
        setupPlayerEvents();
        currentVideoID = id;
      }

      lightbox.setAttribute("data-vimeo-activated", "true");

      requestAnimationFrame(() => runSizing().catch(() => {}));
      setTimeout(() => runSizing().catch(() => {}), 120);

      await player.ready().catch(() => {});
      runSizing().catch(() => {});

      if (isTouch) {
        await autoPlayTouchMuted();
      } else {
        await tryPlayDesktopWithSound();
      }
    }

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeLightbox();
    });

    closeButtons.forEach(btn => btn.addEventListener("click", closeLightbox));

    if (playControl) {
      playControl.addEventListener("click", async () => {
        if (!player || !currentVideoID) return;

        if (isTouch) {
          await playTouchUsingCurrentMuteState();
        } else {
          await player.setVolume(globalMuted ? 0 : 1).catch(() => {});
          if (typeof player.setMuted === "function") {
            await player.setMuted(globalMuted).catch(() => {});
          }

          player.play().catch(async () => {
            if (!globalMuted) {
              globalMuted = true;
              lightbox.setAttribute("data-vimeo-muted", "true");
              await player.setVolume(0).catch(() => {});
              if (typeof player.setMuted === "function") {
                await player.setMuted(true).catch(() => {});
              }
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
        if (typeof player.setMuted === "function") {
          await player.setMuted(globalMuted).catch(() => {});
        }

        lightbox.setAttribute("data-vimeo-muted", globalMuted ? "true" : "false");

        if (isTouch) {
          await player.play().catch(() => {});
        }
      });
    }

    openButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const vid = btn.getAttribute("data-vimeo-lightbox-id");
        openLightbox(vid);
      });
    });
  });
}


  function cleanupVimeo(root = document) {
    $$("[data-vimeo-lightbox-init]", root).forEach(lb => {
      lb.setAttribute("data-vimeo-activated", "false");
      lb.setAttribute("data-vimeo-playing", "false");
      lb._player?.pause().catch(() => {});
    });
  }

  const secPix = (() => {
    const wm = new WeakMap(), set = new Set();
    let bound = false;

    function init(root = document) {
      $$(".transition-to-white,.transition-to-black", root).forEach(w => {
        if (wm.has(w)) {
          wm.get(w).resize();
          wm.get(w).drawReq();
          return;
        }

        const mode = w.classList.contains("transition-to-white") ? "white" : "black";
        if (getComputedStyle(w).position === "static") w.style.position = "relative";
        w.style.opacity = "1";
        w.style.overflow = "hidden";
        w.style.zIndex = "2";

        const c = document.createElement("canvas");
        c.setAttribute("data-legacy-pixel-canvas", "true");
        c.style.cssText = "position:absolute;inset:-1px;width:calc(100% + 2px);height:calc(100% + 2px);display:block;pointer-events:none;z-index:9999;opacity:1;visibility:visible;transform:translateZ(0)";
        w.appendChild(c);

        const ctx = c.getContext("2d", { alpha: true });
        let cols = 1, rows = 4, size = 1, order = [], colors = [], raf = null;

        const shuffle = a => {
          a = a.slice();
          for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
          }
          return a;
        };

        function rebuild() {
          const dpr = Math.max(1, devicePixelRatio || 1), r = w.getBoundingClientRect();
          c.width = Math.max(1, Math.ceil(r.width * dpr));
          c.height = Math.max(1, Math.ceil(r.height * dpr));
          size = Math.max(1, Math.ceil(c.height / rows));
          cols = Math.max(1, Math.ceil(c.width / size));
          const total = cols * rows;
          order = shuffle(Array.from({ length: total }, (_, i) => i));
          colors = Array.from({ length: total }, () => Math.random() < 0.28 ? "blue" : mode);
        }

        function progress() {
          const r = w.getBoundingClientRect(), vh = innerHeight, delay = mode === "black" ? vh * 0.2 : 0;
          return Math.min(1, Math.max(0, ((vh - delay) - r.top) / ((vh - delay) + r.height)));
        }

        function draw() {
          raf = null;
          const p = progress();
          const map = new Map();
          const total = cols * rows;
          const reveal = Math.round(Math.min(p / 0.65, 1) * total);
          const blue = cssVar("--_primitives---brand-colors--blue", "#2962ff");
          const white = cssVar("--_primitives---brand-colors--white", "#fff");
          const black = cssVar("--_primitives---brand-colors--black", "#161718");
          const palette = { blue, white, black };

          ctx.clearRect(0, 0, c.width, c.height);

          if (p >= 1) {
            ctx.fillStyle = palette[mode];
            ctx.fillRect(0, 0, c.width, c.height);
            return;
          }

          for (let i = 0; i < reveal; i++) map.set(order[i], colors[order[i]]);

          map.forEach((key, idx) => {
            const x = idx % cols, y = Math.floor(idx / cols);
            ctx.fillStyle = palette[key];
            ctx.fillRect(x * size, y * size, size, size);
          });
        }

        const state = {
          resize: rebuild,
          drawReq: () => {
            if (!raf) raf = requestAnimationFrame(draw);
          },
          destroy: () => {
            c.remove();
            set.delete(state);
            wm.delete(w);
          }
        };

        wm.set(w, state);
        set.add(state);
        rebuild();
        state.drawReq();

        if (!bound) {
          bound = true;
          addEventListener("scroll", () => set.forEach(s => s.drawReq()), { passive: true });
          addEventListener("resize", () => set.forEach(s => {
            s.resize();
            s.drawReq();
          }), { passive: true });
        }
      });
    }

    function cleanup(root = document) {
      $$(".transition-to-white,.transition-to-black", root).forEach(w => wm.get(w)?.destroy());
    }

    return { init, cleanup };
  })();

  function ensureNav() {
    const nav = $(".navbar2_component");
    if (!nav) return;
    gsap.set(nav, { clearProps: "opacity,visibility,display,transform" });
    nav.style.removeProperty("opacity");
    nav.style.removeProperty("visibility");
    nav.style.removeProperty("display");
  }

  function syncNav(html) {
    const nav = $(".navbar2_component");
    if (!nav || !html) return;

    const t = document.createElement("template");
    t.innerHTML = html.trim();
    const nextNav = $(".navbar2_component", t.content);
    if (!nextNav) return;

    nav.setAttribute("class", nextNav.getAttribute("class") || "");
    const v = nextNav.getAttribute("data-wf--navbar--variant");
    if (v) nav.setAttribute("data-wf--navbar--variant", v);
    ensureNav();
  }

  function updateMeta(html) {
    if (!html) return;
    const d = new DOMParser().parseFromString(html, "text/html");
    if (d.title) document.title = d.title;
    ["data-wf-page", "data-wf-site"].forEach(a => {
      const v = d.documentElement.getAttribute(a);
      if (v) document.documentElement.setAttribute(a, v);
    });
  }

function currentLinks() {
  const path = location.pathname.replace(/\/$/, "") || "/";

  const links = [
    ...$$(".navbar2_component a[href]"),
    ...$$(".footer-wrapper a[href]"),
    ...$$("footer a[href]"),
    ...$$(".section.is-footer a[href]")
  ];

  [...new Set(links)].forEach(a => {
    const h = a.getAttribute("href");
    if (
      !h ||
      h.startsWith("#") ||
      h.startsWith("http") ||
      h.startsWith("mailto:") ||
      h.startsWith("tel:")
    ) return;

    const p = new URL(h, location.origin).pathname.replace(/\/$/, "") || "/";
    a.classList.toggle("w--current", p === path);

    if (p === path) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

  function webflow() {
    if (!window.Webflow) return;
    Webflow.destroy();
    Webflow.ready();
    const ix2 = Webflow.require && Webflow.require("ix2");
    if (ix2) ix2.init();
    ensureNav();
  }

  function closeMenu() {
    $(".w-nav-button.w--open")?.click();
  }

  function initAll(root = document) {
    nextPage = root;
    initButtons(root);
    initShareButtons(root);
    initStats(root);
    initSticky(root);
    initLogoWall(root);
    initSwiper(root);
    initVimeo(root);
    initCursor(root);
    secPix.init(root);
    if (ST) ScrollTrigger.refresh();
  }

  function cleanup(root = document) {
    cleanupCursor();
    cleanupVimeo(root);
    cleanupLogoWall(root);
    $$(".testimonial-slider", root).forEach(s => s.swiper?.destroy(true, true));
    secPix.cleanup(root);
  }

  const pxAmount = 12, transDur = 1.35, fadeDur = 0.25, overlap = 0.35;

  function pixelGrid(portrait) {
    const panel = $("[data-transition-panel]");
    if (!panel) return;

    const r = panel.getBoundingClientRect();
    panel.style.flexDirection = portrait ? "column" : "row";

    const lineSize = portrait ? r.height / pxAmount : r.width / pxAmount;
    const cross = Math.ceil((portrait ? r.width : r.height) / lineSize);

    let lines = $$("[data-transition-col]", panel);
    const lineTpl = lines[0];
    const pixTpl = $("[data-transition-pixel]", lineTpl);
    if (!lineTpl || !pixTpl) return;

    if (lines.length !== pxAmount) {
      const f = document.createDocumentFragment();
      for (let i = 0; i < pxAmount; i++) f.appendChild(lineTpl.cloneNode(false));
      panel.replaceChildren(f);
      lines = $$("[data-transition-col]", panel);
    }

    lines.forEach(line => {
      line.style.flexDirection = portrait ? "row" : "column";
      line.style.flex = "1 1 auto";
      line.style.justifyContent = "center";

      const diff = cross - line.childElementCount;
      if (diff > 0) {
        const f = document.createDocumentFragment();
        for (let i = 0; i < diff; i++) f.appendChild(pixTpl.cloneNode(true));
        line.appendChild(f);
      } else if (diff < 0) {
        for (let i = diff; i < 0; i++) line.lastElementChild?.remove();
      }
    });
  }

  function resetPage(container) {
    scrollTo(0, 0);

    const wrap = $(".page-wrapper");
    if (wrap && container.parentNode === document.body) {
     const footer = wrap.querySelector(".footer-wrapper");
      if (footer) wrap.insertBefore(container, footer);
      else wrap.appendChild(container);
    }

    requestAnimationFrame(() => {
      gsap.set(container, { clearProps: "position,top,left,right,width,height,overflow,zIndex,clipPath,webkitClipPath,willChange,force3D,maxHeight" });
    });
  }

  function onceAnim(next) {
    return gsap.timeline().call(() => resetPage(next), null, 0);
  }

  function leaveAnim(current, next) {
    const tl = gsap.timeline();

    if (reducedMotion) {
      tl.set(current, { autoAlpha: 0 }).call(() => current.remove());
      return tl;
    }

    const portrait = innerHeight > innerWidth;
    pixelGrid(portrait);

    const panel = $("[data-transition-panel]");
    if (!panel) return tl;

    const lines = $$("[data-transition-col]", panel);
    const allPix = $$("[data-transition-pixel]", panel);
    const clipFrom = portrait
      ? "polygon(0% 0%,100% 0%,100% 0%,0% 0%)"
      : "polygon(0% 0%,0% 0%,0% 100%,0% 100%)";
    const clipTo = "polygon(0% 0%,100% 0%,100% 100%,0% 100%)";
    const clipStart = Math.min(fadeDur, transDur * 0.5);
    const clipDur = Math.max(0.001, transDur - 2 * clipStart);
    const stepDur = clipDur / Math.max(1, pxAmount);
    const endDelay = transDur / Math.max(1, pxAmount);

    gsap.set(allPix, { opacity: 0, willChange: "opacity" });
    gsap.set(panel, { opacity: 1, willChange: "opacity" });
    gsap.set(next, { autoAlpha: 1, clipPath: clipFrom, webkitClipPath: clipFrom, willChange: "clip-path", force3D: true, maxHeight: "100dvh" });

    lines.forEach((line, i) => {
      const pix = $$("[data-transition-pixel]", line);
      if (!pix.length) return;

      const reveal = clipStart + i * stepDur;
      const fillStart = Math.max(0, reveal - fadeDur);
      const fadeStart = Math.min(transDur, reveal + stepDur);
      const min = fadeDur / pix.length;
      const per = min * (1 - overlap) + fadeDur * overlap;
      const spread = Math.max(0, fadeDur - per);

      tl.to(pix, { opacity: 1, duration: Math.max(0.001, per), ease: "none", stagger: { amount: spread, from: "random" } }, fillStart);
      tl.to(pix, { opacity: 0, duration: Math.max(0.001, per), ease: "none", stagger: { amount: spread, from: "random" } }, fadeStart);
    });

    tl.to(next, { clipPath: clipTo, webkitClipPath: clipTo, ease: `steps(${pxAmount}, start)`, duration: clipDur }, clipStart);
    tl.set(next, { clearProps: "clipPath,webkitClipPath,willChange,force3D,maxHeight" }, clipStart + clipDur);
    tl.call(() => current.remove(), null, transDur + endDelay);
    tl.set(allPix, { clearProps: "willChange" }, transDur + endDelay);
    tl.set(panel, { clearProps: "willChange" }, transDur + endDelay);

    return tl;
  }

  function enterAnim(next) {
    const tl = gsap.timeline();
    const endDelay = transDur / Math.max(1, pxAmount);
    const ready = reducedMotion ? 0 : transDur + endDelay;

    tl.add("ready", ready);
    tl.call(resetPage, [next], "ready");

    return new Promise(resolve => tl.call(resolve, null, "ready"));
  }

  function preventBarba(el, href) {
    if (!el) return false;
    if ((window.__isCalendlyTrigger && window.__isCalendlyTrigger(el)) || el.closest("[data-barba-prevent]") || el.closest("[rd-cookieflow]") || el.hasAttribute("download") || el.target === "_blank") return true;
    if (!href) return false;
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return true;

    const url = new URL(href, location.href);
    return url.origin !== location.origin || (url.pathname === location.pathname && url.hash);
  }

  ensureTransitionMarkup();

  barba.hooks.beforeLeave(data => {
    closeMenu();
    cleanup(data.current?.container || document);
    document.body.dataset.pageRoute = "transitioning";
  });

  barba.hooks.beforeEnter(data => {
    updateMeta(data.next.html);

    if (data.current?.container) {
      gsap.set(data.current.container, { position: "relative", height: "100dvh", overflow: "hidden", zIndex: 1 });
    }

    const tw = $("[data-transition-wrap]");
    if (tw?.parentNode === document.body) tw.insertAdjacentElement("afterend", data.next.container);
    else document.body.appendChild(data.next.container);
    data.next.container.querySelectorAll(".footer-wrapper").forEach(el => el.remove());

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

    nextPage = data.next.container;
  });

  barba.hooks.afterLeave(() => {
    if (ST) ScrollTrigger.getAll().forEach(t => t.kill());
  });

  barba.hooks.enter(data => {
    syncNav(data.next.html);
    currentLinks();
  });

  barba.hooks.afterEnter(data => {
    nextPage = data.next.container;
    initAll(nextPage);
    currentLinks();
    requestAnimationFrame(() => requestAnimationFrame(webflow));
  });

  if (window.barbaPrefetch && !matchMedia("(hover: none) and (pointer: coarse)").matches) {
    barba.use(barbaPrefetch);
  }

  barba.init({
    debug: false,
    timeout: 15000,
    preventRunning: true,
    prevent: function (data) {
  return preventBarba(data.el, data.href);
},
    transitions: [{
      name: "osmo-pixel-transition",
      sync: true,
      once: data => {
        if (onceDone) return;
        onceDone = true;
        initAll(data.next.container);
        return onceAnim(data.next.container);
      },
      leave: data => leaveAnim(data.current.container, data.next.container),
      enter: data => enterAnim(data.next.container)
    }]
  });
})();

(() => {
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
      updateStickyStepsBasic(document);
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initStickyStepsBasic(document));
  } else {
    initStickyStepsBasic(document);
  }

  if (window.barba) {
    barba.hooks.afterEnter(data => {
      initStickyStepsBasic(data.next?.container || document);
    });
  }
})();
