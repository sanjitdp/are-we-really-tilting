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

        // Live-drag swipe using Pointer Events (unified across touch / mouse /
        // pen). The track follows the finger; on release we either commit to
        // a new slide or snap back. setPointerCapture, applied once the
        // direction is locked to horizontal, keeps events flowing to this
        // element even if the finger leaves the track — without it,
        // pointer events would route to whatever's currently under the
        // pointer instead, and a swipe past the carousel edge would die.
        let pState = null;
        // pState = { id, startX, startY, dx, axis: null|'h'|'v' } when active

        function resetPointer() { pState = null; }

        track.addEventListener("pointerdown", (e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return; // left btn
            pState = { id: e.pointerId, startX: e.clientX, startY: e.clientY, dx: 0, axis: null };
            track.style.transition = "none";
        });

        track.addEventListener("pointermove", (e) => {
            if (!pState || e.pointerId !== pState.id) return;
            const dx = e.clientX - pState.startX;
            const dy = e.clientY - pState.startY;

            if (pState.axis == null) {
                if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
                    pState.axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
                    if (pState.axis === "h") {
                        // Lock the gesture to this element so we keep getting
                        // events even past the carousel edges.
                        try { track.setPointerCapture(pState.id); } catch (_) {}
                    } else {
                        // Vertical: let the browser handle scrolling; we're done.
                        track.style.transition = "";
                        pState = null;
                        return;
                    }
                }
            }

            if (pState && pState.axis === "h") {
                if (e.cancelable) e.preventDefault();
                pState.dx = dx;
                render(dx);
            }
        });

        function endPointer(e) {
            if (!pState || e.pointerId !== pState.id) return;
            const { axis, dx } = pState;
            try { if (track.hasPointerCapture(pState.id)) track.releasePointerCapture(pState.id); } catch (_) {}
            pState = null;
            track.style.transition = "";
            if (axis === "h") {
                if (Math.abs(dx) > 50) {
                    if (dx < 0) next(true); else prev(true);
                } else {
                    render(); // snap back to current slide
                }
            }
        }

        track.addEventListener("pointerup", endPointer);
        track.addEventListener("pointercancel", endPointer);

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
