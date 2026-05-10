// Show the top nav only after the user scrolls past the hero.
(function () {
    const nav = document.getElementById("topnav");
    if (!nav) return;

    const SHOW_AT = 240;     // px; roughly past the title + first lines
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

// Lightweight carousel — no dependencies.
// Each .carousel has an id; sibling buttons reference it via data-target.

(function () {
    const carousels = document.querySelectorAll(".carousel");

    carousels.forEach((root) => {
        const track = root.querySelector(".carousel-track");
        const slides = Array.from(root.querySelectorAll(".slide"));
        const dotsHost = root.querySelector(".carousel-dots");
        const id = root.id;
        const prevBtn = id ? document.querySelector(`.carousel-btn.prev[data-target="${id}"]`) : null;
        const nextBtn = id ? document.querySelector(`.carousel-btn.next[data-target="${id}"]`) : null;
        const autoplayMs = parseInt(root.dataset.autoplay || "0", 10);

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

        let index = 0;
        let timer = null;
        let userInteracted = false;

        function syncArrowPosition() {
            const shell = root.querySelector(".carousel-shell");
            if (!shell || (!prevBtn && !nextBtn)) return;

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

        function render() {
            track.style.transform = `translateX(-${index * 100}%)`;
            dots.forEach((d, i) => d.classList.toggle("active", i === index));
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

        // Touch swipe
        let startX = null;
        track.addEventListener("touchstart", (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });
        track.addEventListener("touchend", (e) => {
            if (startX == null) return;
            const dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 40) {
                if (dx < 0) next(true); else prev(true);
            }
            startX = null;
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
