// MUGEN DISTRICT — Archive interactions (scoped)
(() => {
  const root = document.querySelector(".archive-root");
  if (!root) return;

  // Custom cursor
  const cursor = document.createElement("div");
  cursor.className = "cursor";
  root.appendChild(cursor);

  let cx = 0, cy = 0, tx = 0, ty = 0;
  const follow = () => {
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    requestAnimationFrame(follow);
  };
  follow();

  window.addEventListener("mousemove", (e) => {
    tx = e.clientX;
    ty = e.clientY;
  });

  // Parallax hero bg
  const heroBg = document.querySelector(".archive-root .hero-bg");
  window.addEventListener("scroll", () => {
    if (!heroBg) return;
    const y = window.scrollY || 0;
    heroBg.style.transform = `translate3d(0, ${y * 0.08}px, 0)`;
  }, { passive: true });

  // Magnetic buttons
  const mags = document.querySelectorAll(".archive-root .btn");
  mags.forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      btn.style.transform = `translate3d(${x * 0.12}px, ${y * 0.18}px, 0)`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = `translate3d(0,0,0)`;
    });
  });

  // Slam reveal
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) en.target.classList.add("on");
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(".archive-root .reveal").forEach(el => io.observe(el));
})();