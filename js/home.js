// =============================================
// home.js — Homepage Logic
// =============================================

document.addEventListener('DOMContentLoaded', async () => {
  initHeroSlideshow();
  await loadGroupsRail();
  initNewsletterForm();
});

// =============================================
// HERO SLIDESHOW
// =============================================
const heroSlides = [
  {
    eyebrow: 'Inhale Excellence',
    title: 'The Gold<br/>Standard',
    sub: 'Experience MUHAMEDDISPO in motion. Precision craftsmanship, refined distillates, and a legacy built on excellence.'
  },
  {
    eyebrow: 'Premium Vaping Hardware',
    title: 'Inhale<br/>Excellence',
    sub: 'Precision-engineered hardware meets the world\'s most refined distillates. Experience the gold standard of urban luxury.'
  },
  {
    eyebrow: 'Unmatched Purity',
    title: 'Elevate<br/>Your Senses',
    sub: 'Discover the apex of flavor profiles crafted from exclusively sourced, top-tier cannabis. A journey of taste awaits.'
  },
  {
    eyebrow: 'Exclusive Drops',
    title: 'The Apex<br/>Collection',
    sub: 'Limited batches of our most sought-after strains. Engineered for those who demand nothing but the absolute best.'
  }
];

function initHeroSlideshow() {
  const bgs = document.querySelectorAll('.hero-bg');
  const bgContainer = document.getElementById('hero-bg-container');
  const textWrap = document.getElementById('hero-text-wrap');
  const eyebrow = document.getElementById('hero-eyebrow');
  const title = document.getElementById('hero-title');
  const sub = document.getElementById('hero-sub');
  const heroVideo = document.getElementById('hero-video');

  if (!bgs.length || !textWrap || !bgContainer) return;

  // === Create the gold shimmer sweep element ===
  const shimmer = document.createElement('div');
  shimmer.className = 'hero-transition-shimmer';
  bgContainer.appendChild(shimmer);

  let currentIndex = 0;
  const videoIndex = 0; // Video is the first slide

  // Helper: manage video play/pause safely
  function manageVideo(isActive) {
    if (!heroVideo) return;
    if (isActive) {
      heroVideo.play().catch(() => {}); // Catch autoplay policy rejections silently
    } else {
      heroVideo.pause();
      heroVideo.currentTime = 0;
    }
  }

  // Helper: fire the gold shimmer sweep animation
  function triggerShimmer() {
    shimmer.classList.remove('shimmer-play');
    void shimmer.offsetWidth; // Force reflow so animation restarts cleanly
    shimmer.classList.add('shimmer-play');
    shimmer.addEventListener('animationend', () => {
      shimmer.classList.remove('shimmer-play');
    }, { once: true });
  }

  // Video is the first active slide — start playing immediately
  manageVideo(true);

  setInterval(() => {
    const fromIndex = currentIndex;
    const isLeavingVideo = (fromIndex === videoIndex);

    // 1. Fade out text overlay
    textWrap.classList.add('fade-out');

    // 2. Outgoing slide: add leaving class (push-scale + fade) instead of just removing active
    bgs[fromIndex].classList.remove('slide-active');
    bgs[fromIndex].classList.add('slide-leaving');

    // 3. Pause video if leaving video slide
    if (isLeavingVideo) {
      manageVideo(false);
      // Fire gold shimmer sweep for the premium video→photo moment
      setTimeout(() => triggerShimmer(), 100);
    }

    // 4. Advance index
    currentIndex = (currentIndex + 1) % bgs.length;

    // 5. Activate incoming slide (slight delay lets the leaving animation begin first)
    const activateDelay = isLeavingVideo ? 180 : 80;
    setTimeout(() => {
      bgs[currentIndex].classList.add('slide-active');
      if (currentIndex === videoIndex) manageVideo(true);
    }, activateDelay);

    // 6. Clean up leaving class once transition completes
    const cleanupDelay = 1600;
    setTimeout(() => {
      bgs[fromIndex].classList.remove('slide-leaving');
    }, cleanupDelay);

    // 7. Update text content while hidden, then fade back in
    setTimeout(() => {
      const slide = heroSlides[currentIndex];
      eyebrow.innerHTML = slide.eyebrow;
      title.innerHTML = slide.title;
      sub.innerHTML = slide.sub;
      textWrap.classList.remove('fade-out');
    }, 800);

  }, 6000); // Advance every 6 seconds
}


// =============================================
// Load Product Groups into Rail
// =============================================
async function loadGroupsRail() {
  const rail = document.getElementById('groups-rail');
  if (!rail) return;

  try {
    const groups = await fetchGroups();
    rail.replaceChildren(); // XSS-safe clear

    if (groups.length === 0) {
      const msg = document.createElement('p');
      msg.textContent = 'Products coming soon. Check back shortly.';
      msg.style.cssText = 'color:var(--text-muted);padding:40px;';
      rail.appendChild(msg);
      return;
    }

    groups.forEach(group => {
      const card = buildGroupCard(group);
      rail.appendChild(card);
    });

    initRailButtons('groups-rail', 'groups-prev', 'groups-next', 296);
  } catch (err) {
    // Display generic error — do not expose details to user
    console.error('Failed to load product groups');
    const msg = document.createElement('p');
    msg.textContent = 'Unable to load products. Please try again later.';
    msg.style.cssText = 'color:var(--text-muted);padding:40px;';
    rail.replaceChildren(msg);
  }
}

// Build group card using DOM APIs only (no innerHTML with data)
function buildGroupCard(group) {
  const a = document.createElement('a');
  a.href = 'products.html?group=' + encodeURIComponent(group.slug);
  a.className = 'group-card';
  a.setAttribute('role', 'listitem');
  a.setAttribute('aria-label', group.name + ' — ' + (group.tagline || ''));

  // Media
  const mediaWrap = document.createElement('div');
  mediaWrap.className = 'group-card__media';

  if (group.video_url) {
    const vid = document.createElement('video');
    vid.src = group.video_url;
    vid.autoplay = true;
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.setAttribute('aria-hidden', 'true');
    mediaWrap.appendChild(vid);
  } else if (group.hero_image_url) {
    const img = document.createElement('img');
    img.src = group.hero_image_url;
    img.alt = group.name;
    img.loading = 'lazy';
    mediaWrap.appendChild(img);
  } else {
    // Fallback SVG placeholder
    const placeholder = document.createElement('div');
    placeholder.style.cssText = 'width:80px;height:80px;border-radius:50%;background:rgba(197,179,111,0.1);border:1px solid rgba(197,179,111,0.3);';
    mediaWrap.appendChild(placeholder);
  }
  a.appendChild(mediaWrap);

  // Name
  const name = document.createElement('div');
  name.className = 'group-card__name';
  name.textContent = safeText(group.name);
  a.appendChild(name);

  // Tagline
  if (group.tagline) {
    const tag = document.createElement('div');
    tag.className = 'group-card__tagline';
    tag.textContent = safeText(group.tagline);
    a.appendChild(tag);
  }

  // Description
  if (group.description) {
    const desc = document.createElement('div');
    desc.className = 'group-card__desc';
    desc.textContent = safeText(group.description);
    a.appendChild(desc);
  }

  // CTA
  const cta = document.createElement('div');
  cta.className = 'group-card__cta';

  const shimmer = document.createElement('div');
  shimmer.className = 'shimmer-line';
  cta.appendChild(shimmer);

  const ctaRow = document.createElement('div');
  ctaRow.className = 'group-card__cta-text';
  const ctaText = document.createElement('span');
  ctaText.textContent = 'Shop ' + safeText(group.name);
  const arrow = document.createElement('span');
  arrow.className = 'group-card__cta-arrow';
  arrow.textContent = '→';
  ctaRow.appendChild(ctaText);
  ctaRow.appendChild(arrow);
  cta.appendChild(ctaRow);
  a.appendChild(cta);

  return a;
}

// =============================================
// Newsletter Form
// =============================================
function initNewsletterForm() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('nl-email');
    const email = (emailInput.value || '').trim();

    // Validate email format
    const emailRegex = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) {
      showToast('Please enter a valid email address.', 'error');
      emailInput.focus();
      return;
    }

    // TODO: Wire to Supabase email list or newsletter service
    emailInput.value = '';
    showToast('You\'re on the list! Welcome to the circle.', 'success');
  });
}

// Story Animation Observer
document.addEventListener('DOMContentLoaded', () => {
  const storyElements = document.querySelectorAll('.story-anim-element');
  
  if ('IntersectionObserver' in window) {
    const storyObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    storyElements.forEach(el => storyObserver.observe(el));
  } else {
    // Fallback for older browsers
    storyElements.forEach(el => el.classList.add('in-view'));
  }
});
