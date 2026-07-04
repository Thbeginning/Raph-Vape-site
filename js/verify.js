// =============================================
// verify.js — Product Verification Modal
// MUHAMEDDISPO Luxury Vape Site
// =============================================
// Security: all user input is sanitised before Supabase query.
// safeText() from supabase-client.js prevents XSS via textContent.

(function () {
  'use strict';

  // ── DOM references ────────────────────────────
  const modal         = document.getElementById('verify-modal');
  const openBtn       = document.getElementById('verify-btn');
  const closeBtn      = document.getElementById('verify-modal-close');
  const backdrop      = document.getElementById('verify-modal-backdrop');
  const tabScan       = document.getElementById('tab-scan');
  const tabManual     = document.getElementById('tab-manual');
  const panelScan     = document.getElementById('panel-scan');
  const panelManual   = document.getElementById('panel-manual');
  const startScanBtn  = document.getElementById('btn-start-scan');
  const qrVideo       = document.getElementById('qr-video');
  const qrCanvas      = document.getElementById('qr-canvas');
  const serialInput   = document.getElementById('serial-input');
  const verifyManBtn  = document.getElementById('btn-verify-manual');
  const resultPanel   = document.getElementById('verify-result');
  const resultIcon    = document.getElementById('verify-result-icon');
  const resultStatus  = document.getElementById('verify-result-status');
  const resultDetails = document.getElementById('verify-result-details');
  const retryBtn      = document.getElementById('btn-verify-retry');

  if (!modal || !openBtn) return;

  let scanStream    = null;
  let scanAnimFrame = null;
  let isScanning    = false;
  let jsQRLoaded    = false;

  // ── Open / Close ──────────────────────────────
  function openModal() {
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    showTab('scan');
    // Lazy-load jsQR only when user opens modal
    loadJsQR();
  }

  function closeModal() {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    stopCamera();
    resetAll();
  }

  openBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });

  // ── jsQR Lazy Loader ──────────────────────────
  // jsQR is only fetched when user first opens the modal — zero cost on initial page load
  function loadJsQR() {
    if (jsQRLoaded || window.jsQR) { jsQRLoaded = true; return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    script.onload = () => { jsQRLoaded = true; };
    document.head.appendChild(script);
  }

  // ── Tabs ──────────────────────────────────────
  function showTab(tab) {
    const isScan = tab === 'scan';
    tabScan.classList.toggle('active', isScan);
    tabManual.classList.toggle('active', !isScan);
    tabScan.setAttribute('aria-selected', String(isScan));
    tabManual.setAttribute('aria-selected', String(!isScan));
    panelScan.classList.toggle('active', isScan);
    panelManual.classList.toggle('active', !isScan);
    resultPanel.hidden = true;
    if (!isScan) stopCamera();
  }

  tabScan.addEventListener('click', () => showTab('scan'));
  tabManual.addEventListener('click', () => showTab('manual'));

  // ── Camera / QR Scanning ──────────────────────
  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Camera not supported on this browser. Please use the manual code entry.', 'error');
      showTab('manual');
      return;
    }
    startScanBtn.textContent = 'Starting camera…';
    startScanBtn.disabled = true;
    try {
      scanStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      qrVideo.srcObject = scanStream;
      await qrVideo.play();
      isScanning = true;
      qrVideo.classList.add('active');
      startScanBtn.textContent = 'Scanning…';
      document.getElementById('qr-hint').textContent = 'Point at the QR code on your product box';
      scanFrame();
    } catch {
      startScanBtn.textContent = 'Start Camera';
      startScanBtn.disabled = false;
      showToast('Camera access denied. Use the manual code entry tab instead.', 'error');
      showTab('manual');
    }
  }

  function stopCamera() {
    isScanning = false;
    if (scanAnimFrame) { cancelAnimationFrame(scanAnimFrame); scanAnimFrame = null; }
    if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
    if (qrVideo) { qrVideo.srcObject = null; qrVideo.classList.remove('active'); }
    if (startScanBtn) { startScanBtn.textContent = 'Start Camera'; startScanBtn.disabled = false; }
    if (document.getElementById('qr-hint')) {
      document.getElementById('qr-hint').textContent = 'Click below to activate your camera';
    }
  }

  function scanFrame() {
    if (!isScanning) return;
    if (qrVideo.readyState >= qrVideo.HAVE_ENOUGH_DATA && window.jsQR) {
      const ctx = qrCanvas.getContext('2d');
      qrCanvas.width  = qrVideo.videoWidth;
      qrCanvas.height = qrVideo.videoHeight;
      ctx.drawImage(qrVideo, 0, 0, qrCanvas.width, qrCanvas.height);
      const imageData = ctx.getImageData(0, 0, qrCanvas.width, qrCanvas.height);
      const result = window.jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
      if (result && result.data) {
        stopCamera();
        verifyCode(result.data.trim());
        return;
      }
    }
    scanAnimFrame = requestAnimationFrame(scanFrame);
  }

  startScanBtn.addEventListener('click', startCamera);

  // ── Manual Entry ──────────────────────────────
  function submitManual() {
    // Sanitise: uppercase, strip anything that is not alphanumeric or hyphen
    const raw  = (serialInput.value || '').trim().toUpperCase();
    const code = raw.replace(/[^A-Z0-9\-]/g, '').substring(0, 80);
    if (!code) {
      showToast('Please enter a verification code.', 'error');
      serialInput.focus();
      return;
    }
    verifyCode(code);
  }

  verifyManBtn.addEventListener('click', submitManual);
  serialInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitManual(); });

  // ── Supabase Lookup ───────────────────────────
  async function verifyCode(code) {
    showLoading();
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('serial_codes')
        .select('product_name, subgroup_name, batch_number, manufactured_date, is_authentic, first_verified_at, verify_count')
        .eq('code', code)
        .maybeSingle(); // maybeSingle() returns null instead of error when row not found

      if (error) throw error;
      if (!data || !data.is_authentic) { showResult(false, data); return; }

      showResult(true, data);

      // Increment verify_count + stamp first_verified_at — fire-and-forget
      sb.from('serial_codes')
        .update({
          first_verified_at: data.first_verified_at || new Date().toISOString(),
          verify_count: (data.verify_count || 0) + 1
        })
        .eq('code', code)
        .then(() => {}); // intentionally no await — UI doesn't need to wait for this

    } catch {
      showResult(false, null);
    }
  }

  // ── Result Rendering ──────────────────────────
  function showLoading() {
    panelScan.classList.remove('active');
    panelManual.classList.remove('active');
    resultPanel.hidden = false;
    resultPanel.className = 'verify-result loading';
    resultIcon.textContent = '';
    resultIcon.innerHTML = '<div class="verify-spinner"></div>';
    resultStatus.textContent = 'Verifying…';
    resultStatus.className = 'verify-result__status';
    resultDetails.innerHTML = '';
    retryBtn.hidden = true;
  }

  function showResult(authentic, data) {
    panelScan.classList.remove('active');
    panelManual.classList.remove('active');
    resultPanel.hidden = false;
    retryBtn.hidden = false;

    if (authentic && data) {
      resultPanel.className = 'verify-result authentic';
      resultIcon.innerHTML = '<div class="verify-result__checkmark">✓</div>';
      resultStatus.textContent = 'AUTHENTIC PRODUCT';
      resultStatus.className = 'verify-result__status authentic';

      const date = data.manufactured_date
        ? new Date(data.manufactured_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : null;

      // Build result rows using DOM API only — no innerHTML with user data (XSS safe)
      const rows = [
        ['Product',    data.product_name],
        ['Collection', data.subgroup_name],
        ['Batch',      data.batch_number],
        ['Produced',   date],
      ].filter(([, v]) => v);

      const frag = document.createDocumentFragment();

      rows.forEach(([label, value]) => {
        const row = document.createElement('div');
        row.className = 'result-row';
        const l = document.createElement('span');
        l.className = 'result-label';
        l.textContent = label;
        const v = document.createElement('span');
        v.className = 'result-value';
        v.textContent = value; // textContent = XSS safe
        row.appendChild(l);
        row.appendChild(v);
        frag.appendChild(row);
      });

      const badge = document.createElement('div');
      badge.className = 'result-badge';
      badge.textContent = '✓ Genuine MUHAMEDDISPO Product';
      frag.appendChild(badge);

      resultDetails.innerHTML = '';
      resultDetails.appendChild(frag);

    } else {
      resultPanel.className = 'verify-result not-authentic';
      resultIcon.innerHTML = '<div class="verify-result__cross">✕</div>';
      resultStatus.textContent = 'NOT VERIFIED';
      resultStatus.className = 'verify-result__status not-authentic';

      // Safe static content only — no user data in innerHTML here
      resultDetails.innerHTML =
        '<p class="result-warning">This code was not found in our system.</p>' +
        '<p class="result-warning-sub">This may indicate a <strong>counterfeit product</strong>. ' +
        'If you believe this is an error, please contact us immediately.</p>' +
        '<a href="mailto:contact@muhameddispo.com" class="btn-primary result-contact-btn">Contact Us</a>';
    }
  }

  function resetAll() {
    resultPanel.hidden = true;
    resultPanel.className = 'verify-result';
    if (serialInput) serialInput.value = '';
  }

  retryBtn.addEventListener('click', () => {
    resetAll();
    showTab('scan');
  });

})();
