// =============================================
// quiz.js — Find Your Strain Interactive Quiz
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  const openBtn = document.getElementById('open-quiz-btn');
  const closeBtn = document.getElementById('quiz-close-btn');
  const modal = document.getElementById('quiz-modal');
  const restartBtn = document.getElementById('quiz-restart-btn');
  
  if (!openBtn || !modal) return;

  const steps = [
    document.getElementById('quiz-step-1'),
    document.getElementById('quiz-step-2'),
    document.getElementById('quiz-step-3'),
    document.getElementById('quiz-step-loading'),
    document.getElementById('quiz-step-result')
  ];

  let currentStepIndex = 0;
  let answers = { vibe: '', flavor: '', time: '' };

  // Open Modal
  openBtn.addEventListener('click', () => {
    modal.classList.add('show');
    resetQuiz();
  });

  // Close Modal
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('show');
  });

  // Restart Quiz
  if (restartBtn) {
    restartBtn.addEventListener('click', resetQuiz);
  }

  // Handle options clicks
  document.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const answer = e.target.getAttribute('data-answer');
      
      if (currentStepIndex === 0) answers.vibe = answer;
      else if (currentStepIndex === 1) answers.flavor = answer;
      else if (currentStepIndex === 2) answers.time = answer;

      nextStep();
    });
  });

  function resetQuiz() {
    answers = { vibe: '', flavor: '', time: '' };
    currentStepIndex = 0;
    showStep(0);
  }

  function nextStep() {
    currentStepIndex++;
    if (currentStepIndex === 3) {
      // Show loading, then analyze
      showStep(3);
      setTimeout(analyzeResults, 1500);
    } else {
      showStep(currentStepIndex);
    }
  }

  function showStep(index) {
    steps.forEach((step, i) => {
      if (step) {
        if (i === index) {
          step.classList.add('active');
        } else {
          step.classList.remove('active');
        }
      }
    });
  }

  async function analyzeResults() {
    // Basic AI Logic
    let recommendedType = 'Hybrid'; // Default
    
    // Determine type based on vibe and time
    if (answers.vibe === 'energize' || answers.time === 'morning') {
      recommendedType = 'Sativa';
    } else if (answers.vibe === 'relax' || answers.time === 'night') {
      recommendedType = 'Indica';
    } else {
      recommendedType = 'Hybrid';
    }

    const typeEl = document.getElementById('quiz-result-type');
    if (typeEl) {
      typeEl.innerHTML = `Based on your profile, we recommend an <span>${recommendedType}</span>.`;
    }

    // Fetch matching products
    const sb = getSupabase();
    let productHTML = '';

    try {
      const { data: products, error } = await sb
        .from('products')
        .select('*, product_subgroups(name)')
        .eq('strain_type', recommendedType)
        .eq('in_stock', true)
        .limit(5);

      if (error) throw error;

      if (products && products.length > 0) {
        // Pick a random one from the matching results
        const p = products[Math.floor(Math.random() * products.length)];
        const subgroupName = p.product_subgroups ? p.product_subgroups.name : recommendedType;
        
        productHTML = `
          <a href="product-detail.html?id=${p.id}" class="product-card" style="text-decoration:none; display:block; max-width:280px; margin:0 auto; background:var(--bg-card); border-radius:12px; overflow:hidden; border:1px solid var(--border-gold);">
            <div class="product-card__img-wrap" style="position:relative; background:#111; padding:20px; aspect-ratio:1;">
              <img src="${p.image_url || 'Logo.png'}" alt="${p.name}" style="width:100%; height:100%; object-fit:contain;" />
              <div style="position:absolute; top:10px; left:10px; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); padding:4px 8px; border-radius:4px; font-size:10px; font-weight:bold; color:var(--gold); text-transform:uppercase;">${subgroupName}</div>
            </div>
            <div class="product-card__info" style="padding:16px;">
              <h3 style="font-size:18px; color:#fff; margin-bottom:8px; font-family:var(--font-heading);">${p.name}</h3>
              <p style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">${p.description ? p.description.substring(0, 50) + '...' : ''}</p>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#fff; font-weight:bold;">$${parseFloat(p.price || 0).toFixed(2)}</span>
                <span style="color:var(--gold); font-weight:bold;">View Details &rarr;</span>
              </div>
            </div>
          </a>
        `;
      } else {
        productHTML = `<p style="color:var(--text-muted); text-align:center;">No direct matches found, but our <a href="products.html?group=all-in-one" style="color:var(--gold);">All-In-One</a> line is perfect for you.</p>`;
      }
    } catch (err) {
      console.error('Quiz fetch error:', err);
      productHTML = `<p style="color:red; text-align:center;">Error loading recommendations.</p>`;
    }

    const container = document.getElementById('quiz-result-product');
    if (container) {
      container.innerHTML = productHTML;
    }

    // Show result step
    showStep(4);
  }
});
