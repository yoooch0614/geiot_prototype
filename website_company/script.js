/* =========================================================
   PictuPath / すきのたね — top page interactions
   ========================================================= */
(function () {
  "use strict";

  const body = document.body;
  const YT_ID = (body.dataset.youtubeId || "").trim();          // 音付きで見せる本編
  const BG_ID = (body.dataset.youtubeBgId || "").trim() || YT_ID; // ヒーロー背景（無音ループ）

  /* ---------- Header solid on scroll + progress bar ---------- */
  const header = document.querySelector("[data-header]");
  const progress = document.querySelector("[data-progress]");
  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle("is-solid", y > 20);
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const menuBtn = document.querySelector("[data-menu]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");
  const closeMenu = () => { body.classList.remove("menu-open"); menuBtn?.setAttribute("aria-expanded", "false"); };
  menuBtn?.addEventListener("click", () => {
    const open = body.classList.toggle("menu-open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  mobileMenu?.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Footer year ---------- */
  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- PV (YouTube) hero background + modal ---------- */
  const hero = document.querySelector("[data-hero]");
  const heroVideo = document.querySelector("[data-hero-video]");
  const movieBtn = document.querySelector("[data-open-movie]");
  const modal = document.querySelector("[data-movie-modal]");
  const mount = document.querySelector("[data-movie-mount]");
  const closeBtn = document.querySelector("[data-close-movie]");

  if (BG_ID && hero && heroVideo) {
    // On phones, YouTube embeds keep showing tap controls, so use a static
    // poster frame instead of the live video (lighter + no controls).
    const isMobile = window.matchMedia("(max-width: 720px)").matches;
    if (isMobile) {
      const poster = new Image();
      const hq = "https://i.ytimg.com/vi/" + BG_ID + "/hqdefault.jpg";
      poster.onload = function () {
        heroVideo.style.backgroundImage = "url(" + poster.src + ")";
        heroVideo.style.backgroundSize = "cover";
        heroVideo.style.backgroundPosition = "center";
      };
      poster.onerror = function () { poster.onerror = null; poster.src = hq; };
      poster.src = "https://i.ytimg.com/vi/" + BG_ID + "/maxresdefault.jpg";
      hero.classList.add("has-video");
    } else {
      const bg = document.createElement("iframe");
      bg.src =
        "https://www.youtube-nocookie.com/embed/" + BG_ID +
        "?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&modestbranding=1&rel=0&showinfo=0&disablekb=1&playlist=" + BG_ID;
      bg.title = "PictuPath PV（背景）";
      bg.setAttribute("frameborder", "0");
      bg.allow = "autoplay; encrypted-media; picture-in-picture";
      heroVideo.appendChild(bg);
      hero.classList.add("has-video");
    }
  }
  // "ムービーを見る" modal button (needs the sound version)
  if (YT_ID && movieBtn) movieBtn.hidden = false;

  /* ---------- Inline movie window (click to play in place) ---------- */
  const inlineWin = document.querySelector("[data-yt-inline]");
  const inlinePoster = document.querySelector("[data-movie-poster]");
  const inlinePlay = document.querySelector("[data-play-inline]");
  if (YT_ID && inlineWin) {
    inlineWin.hidden = false;
    if (inlinePoster) {
      inlinePoster.src = "https://i.ytimg.com/vi/" + YT_ID + "/maxresdefault.jpg";
      inlinePoster.onerror = function () {
        inlinePoster.onerror = null;
        inlinePoster.src = "https://i.ytimg.com/vi/" + YT_ID + "/hqdefault.jpg";
      };
    }
    inlinePlay?.addEventListener("click", function () {
      const f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + YT_ID + "?autoplay=1&rel=0&modestbranding=1&playsinline=1";
      f.title = "PictuPath PV";
      f.setAttribute("frameborder", "0");
      f.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
      f.setAttribute("allowfullscreen", "");
      inlineWin.classList.add("playing");
      inlineWin.appendChild(f);
    });
  }

  const openMovie = () => {
    if (!modal || !mount || !YT_ID) return;
    mount.innerHTML =
      '<iframe src="https://www.youtube-nocookie.com/embed/' + YT_ID +
      '?autoplay=1&rel=0&modestbranding=1" title="PictuPath PV" frameborder="0" ' +
      'allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>';
    modal.classList.add("open");
    body.style.overflow = "hidden";
  };
  const closeMovie = () => {
    if (!modal || !mount) return;
    mount.innerHTML = "";
    modal.classList.remove("open");
    body.style.overflow = "";
  };
  movieBtn?.addEventListener("click", openMovie);
  closeBtn?.addEventListener("click", closeMovie);
  modal?.addEventListener("click", (e) => { if (e.target === modal) closeMovie(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMovie(); });
})();
