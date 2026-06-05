(function(){
  const qs = new URLSearchParams(window.location.search);
  const manifestParam = qs.get('manifest') || qs.get('slides') || 'slides.json';
  const titleParam = qs.get('title');
  const moduleParam = qs.get('module');

  const els = {
    title: document.getElementById('viewer-title'),
    moduleLabel: document.getElementById('viewer-module-label'),
    counter: document.getElementById('viewer-counter'),
    progress: document.getElementById('progress-fill'),
    container: document.getElementById('slide-container'),
    dots: document.getElementById('slide-dots'),
    prev: document.getElementById('prev-btn'),
    next: document.getElementById('next-btn'),
    sideTitle: document.getElementById('side-title'),
    sidePage: document.getElementById('side-page'),
    sideLos: document.getElementById('side-los'),
    sideNotes: document.getElementById('side-notes')
  };

  let slides = [];
  let current = 0;
  let manifestUrl = new URL(manifestParam, window.location.href);

  function absolutizeSlidePath(path){
    return new URL(path, manifestUrl).href;
  }

  async function loadManifest(){
    const res = await fetch(manifestUrl.href, {cache:'no-cache'});
    if(!res.ok) throw new Error(`Could not load manifest: ${manifestUrl.href}`);
    const manifest = await res.json();
    return Array.isArray(manifest) ? {slides: manifest} : manifest;
  }

  async function loadSlide(path, idx){
    const res = await fetch(absolutizeSlidePath(path), {cache:'no-cache'});
    if(!res.ok) throw new Error(`Could not load slide: ${path}`);
    const html = await res.text();
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const node = template.content.firstElementChild;
    if(!node) throw new Error(`Slide file is empty: ${path}`);
    node.classList.add('slide-page');
    node.classList.toggle('active', idx === 0);
    node.dataset.index = String(idx + 1);
    return node;
  }

  async function init(){
    try{
      const manifest = await loadManifest();
      if(titleParam) els.title.textContent = titleParam;
      else if(manifest.title) els.title.textContent = manifest.title;
      if(moduleParam) els.moduleLabel.textContent = moduleParam;
      else if(manifest.moduleLabel) els.moduleLabel.textContent = manifest.moduleLabel;

      const slidePaths = manifest.slides || [];
      if(!slidePaths.length) throw new Error('Manifest has no slides.');

      els.container.innerHTML = '';
      const nodes = await Promise.all(
  slidePaths.map((slide, idx) =>
    loadSlide(typeof slide === 'string' ? slide : slide.file, idx)
  )
);
      nodes.forEach(node => els.container.appendChild(node));
      slides = Array.from(els.container.querySelectorAll('.slide-page'));
      buildDots();
      bindEvents();
      showSlide(0);
    }catch(err){
      console.error(err);
      els.container.innerHTML = `<div class="loading-message">${err.message}</div>`;
    }
  }

  function buildDots(){
    els.dots.innerHTML = '';
    slides.forEach((_, idx) => {
      const btn = document.createElement('button');
      btn.className = 'dot';
      btn.type = 'button';
      btn.setAttribute('aria-label', `Go to slide ${idx + 1}`);
      btn.addEventListener('click', () => showSlide(idx));
      els.dots.appendChild(btn);
    });
  }

  function bindEvents(){
    els.prev.addEventListener('click', () => showSlide(current - 1));
    els.next.addEventListener('click', () => showSlide(current + 1));
    document.addEventListener('keydown', e => {
      if(e.key === 'ArrowRight' || e.key === 'PageDown') showSlide(current + 1);
      if(e.key === 'ArrowLeft' || e.key === 'PageUp') showSlide(current - 1);
      if(e.key === 'Home') showSlide(0);
      if(e.key === 'End') showSlide(slides.length - 1);
    });
  }

  function showSlide(idx){
    if(!slides.length) return;
    current = Math.max(0, Math.min(idx, slides.length - 1));
    slides.forEach((slide, i) => slide.classList.toggle('active', i === current));
    Array.from(els.dots.children).forEach((dot, i) => dot.classList.toggle('active', i === current));

    const slide = slides[current];
    const title = slide.dataset.title || slide.querySelector('.le-title')?.textContent?.trim() || `Slide ${current + 1}`;
    const lo = slide.dataset.lo || slide.querySelector('.le-tag')?.textContent?.trim() || '';
    const notes = slide.dataset.notes || slide.querySelector('[data-sidebar-notes]')?.textContent?.trim() || 'No notes for this slide.';

    els.counter.textContent = `Slide ${current + 1} of ${slides.length}`;
    els.progress.style.width = `${((current + 1) / slides.length) * 100}%`;
    els.prev.disabled = current === 0;
    els.next.disabled = current === slides.length - 1;
    els.sideTitle.textContent = title;
    els.sidePage.textContent = `${String(current + 1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
    els.sideNotes.textContent = notes;

    els.sideLos.innerHTML = '';
    lo.split(/[ ,|]+/).filter(Boolean).forEach(item => {
      const span = document.createElement('span');
      span.className = 'lo-badge';
      span.textContent = item;
      els.sideLos.appendChild(span);
    });

    if(window.renderMathInElement){
      renderMathInElement(slide, {delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]});
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();
