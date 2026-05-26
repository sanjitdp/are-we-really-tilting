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

// Lightweight carousel — no dependencies.
(function () {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SWIPE_THRESHOLD = 24;     // px traversed before commit
    const DIRECTION_LOCK = 8;       // px before we decide axis

    const carousels = document.querySelectorAll(".carousel");

    carousels.forEach((root) => {
        const track = root.querySelector(".carousel-track");
        const slides = Array.from(root.querySelectorAll(".slide"));
        const dotsHost = root.querySelector(".carousel-dots");
        const id = root.id;
        const prevBtn = id ? document.querySelector(`.carousel-btn.prev[data-target="${id}"]`) : null;
        const nextBtn = id ? document.querySelector(`.carousel-btn.next[data-target="${id}"]`) : null;
        const requestedAutoplay = parseInt(root.dataset.autoplay || "0", 10);
        const autoplayMs = reducedMotion ? 0 : requestedAutoplay;

        if (slides.length <= 1) {
            if (prevBtn) prevBtn.style.visibility = "hidden";
            if (nextBtn) nextBtn.style.visibility = "hidden";
            if (dotsHost) dotsHost.style.display = "none";
            return;
        }

        // Build dot indicators
        slides.forEach((_, i) => {
            const dot = document.createElement("button");
            dot.type = "button";
            dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
            dot.addEventListener("click", () => goTo(i, true));
            dotsHost.appendChild(dot);
        });
        const dots = Array.from(dotsHost.children);

        // Numeric counter (visible on mobile via CSS)
        const counter = document.createElement("span");
        counter.className = "carousel-counter";
        counter.setAttribute("aria-hidden", "true");
        dotsHost.appendChild(counter);

        let index = 0;
        let timer = null;
        let userInteracted = false;

        function syncArrowPosition() {
            const shell = root.querySelector(".carousel-shell");
            if (!shell || (!prevBtn && !nextBtn)) return;
            // Arrows are hidden on small screens; skip the work.
            if (window.matchMedia("(max-width: 720px)").matches) return;

            const activeSlide = slides[index];
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

        function render(extraDx = 0) {
            const viewportWidth = track.parentElement.offsetWidth;
            const dragPct = viewportWidth ? (extraDx / viewportWidth) * 100 : 0;
            track.style.transform = `translateX(calc(${-index * 100}% + ${dragPct}%))`;
            dots.forEach((d, i) => d.classList.toggle("active", i === index));
            counter.textContent = `${index + 1} / ${slides.length}`;
            requestAnimationFrame(syncArrowPosition);
        }

        function goTo(i, fromUser = false) {
            index = (i + slides.length) % slides.length;
            render();
            if (fromUser) {
                userInteracted = true;
                stopAutoplay();
            }
        }

        function next(fromUser = false) { goTo(index + 1, fromUser); }
        function prev(fromUser = false) { goTo(index - 1, fromUser); }

        if (prevBtn) prevBtn.addEventListener("click", () => prev(true));
        if (nextBtn) nextBtn.addEventListener("click", () => next(true));

        // Keyboard navigation when carousel is focused
        root.tabIndex = 0;
        root.addEventListener("keydown", (e) => {
            if (e.key === "ArrowRight") { next(true); e.preventDefault(); }
            if (e.key === "ArrowLeft") { prev(true); e.preventDefault(); }
        });

        // Live touch drag with direction-locking. CSS sets touch-action: pan-y
        // on the track so vertical scrolling continues to work natively.
        let startX = null;
        let startY = null;
        let currentDx = 0;
        let dragging = false;
        let abandoned = false;

        function resetTouch() {
            startX = null;
            startY = null;
            currentDx = 0;
            dragging = false;
            abandoned = false;
        }

        track.addEventListener("touchstart", (e) => {
            if (e.touches.length !== 1) { resetTouch(); return; }
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            currentDx = 0;
            dragging = false;
            abandoned = false;
            track.style.transition = "none";
        }, { passive: true });

        track.addEventListener("touchmove", (e) => {
            if (startX == null || abandoned) return;
            const dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;

            if (!dragging) {
                if (Math.abs(dx) > DIRECTION_LOCK && Math.abs(dx) > Math.abs(dy)) {
                    dragging = true;
                } else if (Math.abs(dy) > DIRECTION_LOCK) {
                    // user is scrolling vertically — back out cleanly
                    abandoned = true;
                    track.style.transition = "";
                    return;
                }
            }

            if (dragging) {
                // Claim the gesture so the browser doesn't fire touchcancel
                // (e.g. iOS edge-back swipe, native horizontal pan heuristics).
                if (e.cancelable) e.preventDefault();
                currentDx = dx;
                render(dx);
            }
        }, { passive: false });

        function endTouch() {
            if (startX == null) {
                track.style.transition = "";
                return;
            }
            track.style.transition = "";
            if (dragging && Math.abs(currentDx) > SWIPE_THRESHOLD) {
                if (currentDx < 0) next(true); else prev(true);
            } else {
                render(); // snap back to current slide
            }
            resetTouch();
        }

        track.addEventListener("touchend", endTouch);
        track.addEventListener("touchcancel", endTouch);

        // Prevent default image drag so horizontal motion never gets stolen
        track.querySelectorAll("img").forEach((img) => {
            img.addEventListener("dragstart", (e) => e.preventDefault());
        });

        function startAutoplay() {
            if (autoplayMs > 0 && !userInteracted) {
                stopAutoplay();
                timer = setInterval(() => next(false), autoplayMs);
            }
        }
        function stopAutoplay() {
            if (timer) { clearInterval(timer); timer = null; }
        }

        root.addEventListener("mouseenter", stopAutoplay);
        root.addEventListener("mouseleave", () => {
            if (!userInteracted) startAutoplay();
        });
        root.addEventListener("focusin", stopAutoplay);
        root.addEventListener("focusout", () => {
            if (!userInteracted) startAutoplay();
        });
        window.addEventListener("resize", syncArrowPosition);
        slides.forEach((slide) => {
            slide.querySelectorAll("img").forEach((img) => {
                if (!img.complete) img.addEventListener("load", syncArrowPosition, { once: true });
            });
        });

        render();

        if ("IntersectionObserver" in window) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) startAutoplay(); else stopAutoplay();
                });
            }, { threshold: 0.25 });
            io.observe(root);
        } else {
            startAutoplay();
        }
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
