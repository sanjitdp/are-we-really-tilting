// Lightweight carousel — no dependencies.
// One instance per .carousel element on the page.

(function () {
    const carousels = document.querySelectorAll(".carousel");

    carousels.forEach((root) => {
        const track = root.querySelector(".carousel-track");
        const slides = Array.from(root.querySelectorAll(".slide"));
        const prevBtn = root.querySelector(".carousel-btn.prev");
        const nextBtn = root.querySelector(".carousel-btn.next");
        const dotsHost = root.querySelector(".carousel-dots");
        const autoplayMs = parseInt(root.dataset.autoplay || "0", 10);

        if (slides.length <= 1) {
            // Hide controls if only one slide
            if (prevBtn) prevBtn.style.display = "none";
            if (nextBtn) nextBtn.style.display = "none";
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

        function render() {
            track.style.transform = `translateX(-${index * 100}%)`;
            dots.forEach((d, i) => d.classList.toggle("active", i === index));
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

        prevBtn.addEventListener("click", () => prev(true));
        nextBtn.addEventListener("click", () => next(true));

        // Keyboard navigation when carousel is in viewport and focused
        root.tabIndex = 0;
        root.addEventListener("keydown", (e) => {
            if (e.key === "ArrowRight") { next(true); e.preventDefault(); }
            if (e.key === "ArrowLeft")  { prev(true); e.preventDefault(); }
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

        // Pause on hover
        root.addEventListener("mouseenter", stopAutoplay);
        root.addEventListener("mouseleave", () => {
            if (!userInteracted) startAutoplay();
        });

        render();

        // Defer autoplay until images have started loading and the carousel is in viewport
        if ("IntersectionObserver" in window) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        startAutoplay();
                    } else {
                        stopAutoplay();
                    }
                });
            }, { threshold: 0.25 });
            io.observe(root);
        } else {
            startAutoplay();
        }
    });
})();
