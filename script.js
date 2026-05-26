// Show the top nav only after the user scrolls past the hero.
(function () {
    const nav = document.getElementById("topnav");
    if (!nav) return;

    const SHOW_AT = 240;
    let visible = false;

    function update() {
        const shouldShow = window.scrollY > SHOW_AT;
        if (shouldShow !== visible) {
            visible = shouldShow;
            nav.classList.toggle("visible", shouldShow);
        }
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
})();

// Highlight the current section in the top nav as the user scrolls.
(function () {
    const links = Array.from(document.querySelectorAll(".topnav-anchor"));
    if (!links.length || !("IntersectionObserver" in window)) return;

    const map = new Map();
    links.forEach((link) => {
        const href = link.getAttribute("href") || "";
        if (!href.startsWith("#")) return;
        const target = document.querySelector(href);
        if (target) map.set(target, link);
    });

    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const link = map.get(entry.target);
            if (!link) return;
            if (entry.isIntersecting) {
                links.forEach((l) => l.classList.remove("active"));
                link.classList.add("active");
            }
        });
    }, { rootMargin: "-25% 0px -65% 0px", threshold: 0 });

    map.forEach((_, section) => io.observe(section));
})();

// Carousel — backed by Embla (loaded via the CDN umd bundle in <head>).
// Embla handles pointer/touch/mouse gestures, transforms, snapping, and
// loop wrap-around; this file just wires up dots, counter, arrow buttons,
// keyboard nav, autoplay, and the prev/next-arrow vertical sync.
(function () {
    if (typeof EmblaCarousel === "undefined") {
        console.error("Embla failed to load");
        return;
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.querySelectorAll(".carousel").forEach((root) => {
        const viewport = root.querySelector(".carousel-viewport");
        const slides = Array.from(root.querySelectorAll(".slide"));
        const dotsHost = root.querySelector(".carousel-dots");
        const id = root.id;
        const prevBtn = id ? document.querySelector(`.carousel-btn.prev[data-target="${id}"]`) : null;
        const nextBtn = id ? document.querySelector(`.carousel-btn.next[data-target="${id}"]`) : null;
        const requestedAutoplay = parseInt(root.dataset.autoplay || "0", 10);
        const autoplayMs = reducedMotion ? 0 : requestedAutoplay;

        if (!viewport || slides.length === 0) return;
        if (slides.length <= 1) {
            if (prevBtn) prevBtn.style.visibility = "hidden";
            if (nextBtn) nextBtn.style.visibility = "hidden";
            if (dotsHost) dotsHost.style.display = "none";
            return;
        }

        const plugins = [];
        if (autoplayMs > 0 && typeof EmblaCarouselAutoplay !== "undefined") {
            plugins.push(EmblaCarouselAutoplay({
                delay: autoplayMs,
                stopOnInteraction: true,
                stopOnMouseEnter: true,
            }));
        }

        const embla = EmblaCarousel(viewport, {
            loop: true,
            align: "start",
            duration: 22,
            dragFree: false,
        }, plugins);

        // Build dots
        slides.forEach((_, i) => {
            const dot = document.createElement("button");
            dot.type = "button";
            dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
            dot.addEventListener("click", () => embla.scrollTo(i));
            dotsHost.appendChild(dot);
        });
        const dots = Array.from(dotsHost.children);

        // Numeric counter (visible on mobile via CSS)
        const counter = document.createElement("span");
        counter.className = "carousel-counter";
        counter.setAttribute("aria-hidden", "true");
        dotsHost.appendChild(counter);

        function syncArrowPosition() {
            const shell = root.querySelector(".carousel-shell");
            if (!shell || (!prevBtn && !nextBtn)) return;
            if (window.matchMedia("(max-width: 720px)").matches) return;

            const idx = embla.selectedScrollSnap();
            const activeSlide = slides[idx];
            if (!activeSlide) return;
            const imageNodes = Array.from(activeSlide.querySelectorAll(
                ".five-col-row img, .cover-row img, .ms-cells img, .slide > img"
            ));
            const imageRects = imageNodes
                .map((img) => img.getBoundingClientRect())
                .filter((rect) => rect.width > 0 && rect.height > 0);
            if (!imageRects.length) return;

            const shellRect = shell.getBoundingClientRect();
            const button = prevBtn || nextBtn;
            const buttonHeight = button ? button.getBoundingClientRect().height : 36;
            const imageTop = Math.min(...imageRects.map((rect) => rect.top));
            const imageBottom = Math.max(...imageRects.map((rect) => rect.bottom));
            const imageCenter = (imageTop + imageBottom) / 2 - shellRect.top;
            const arrowTop = Math.max(0, imageCenter - buttonHeight / 2);
            root.style.setProperty("--carousel-arrow-top", `${arrowTop}px`);
        }

        function syncIndicators() {
            const idx = embla.selectedScrollSnap();
            dots.forEach((d, i) => d.classList.toggle("active", i === idx));
            counter.textContent = `${idx + 1} / ${slides.length}`;
            requestAnimationFrame(syncArrowPosition);
        }

        embla.on("select", syncIndicators);
        embla.on("init", syncIndicators);
        embla.on("reInit", syncIndicators);
        syncIndicators();

        // Late-loaded slide images can change image positions — re-sync arrows
        slides.forEach((slide) => {
            slide.querySelectorAll("img").forEach((img) => {
                if (!img.complete) img.addEventListener("load", syncArrowPosition, { once: true });
            });
        });
        window.addEventListener("resize", syncArrowPosition);

        if (prevBtn) prevBtn.addEventListener("click", () => embla.scrollPrev());
        if (nextBtn) nextBtn.addEventListener("click", () => embla.scrollNext());

        // Keyboard navigation when carousel is focused
        root.tabIndex = 0;
        root.addEventListener("keydown", (e) => {
            if (e.key === "ArrowRight") { embla.scrollNext(); e.preventDefault(); }
            if (e.key === "ArrowLeft")  { embla.scrollPrev(); e.preventDefault(); }
        });
    });
})();

// Copy BibTeX — icon button that swaps copy ↔ check via the .copied class.
(function () {
    document.querySelectorAll(".bibtex-wrap").forEach((wrap) => {
        const btn = wrap.querySelector(".bibtex-copy");
        const code = wrap.querySelector("code");
        if (!btn || !code) return;
        let resetTimer = null;

        btn.addEventListener("click", async () => {
            const text = code.textContent.trim();
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(text);
                } else {
                    const ta = document.createElement("textarea");
                    ta.value = text;
                    ta.style.position = "fixed";
                    ta.style.opacity = "0";
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand("copy");
                    document.body.removeChild(ta);
                }
                btn.classList.add("copied");
                btn.setAttribute("aria-label", "Copied to clipboard");
                if (resetTimer) clearTimeout(resetTimer);
                resetTimer = setTimeout(() => {
                    btn.classList.remove("copied");
                    btn.setAttribute("aria-label", "Copy BibTeX");
                    resetTimer = null;
                }, 1500);
            } catch (err) {
                console.error("BibTeX copy failed", err);
            }
        });
    });
})();
