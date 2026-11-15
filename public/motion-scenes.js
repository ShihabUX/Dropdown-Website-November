/* Choreography for the existing static sections. Motion primitives live in motion.js. */
window.createMotionScenes = ({ animate, enter, tokens, preference }) => {
  const compact = matchMedia('(max-width: 767px), (pointer: coarse)');
  const clamp = value => Math.max(0, Math.min(1, value));
  const watched = new Map();
  const rowEntrances = new Map();
  let observer;
  function line(element, delay = 0) {
    return animate(element, [
      { opacity: .65, transform: `translateY(${compact.matches ? 12 : 22}px)`, clipPath: 'inset(0 0 15% 0)' },
      { opacity: 1, transform: 'none', clipPath: 'inset(-15% -4% -15% -4%)' }
    ], { duration: 800, delay });
  }
  function highlight(element, delay = 0) {
    return animate(element, [{ transform:'scaleX(0)' }, { transform:'scaleX(1)' }], { duration:600, delay });
  }
  function image(element, delay = 0) {
    return animate(element, [{ opacity:.3, transform:`translateY(${compact.matches ? 16 : 26}px) scale(.98)` }, { opacity:1, transform:'none' }], { duration:950, delay });
  }
  function rule(element, delay = 0) {
    // Animate the decorative rule only; the heading/card keeps its actual dimensions.
    return animate(element, [{ '--rule-progress':'0' }, { '--rule-progress':'1' }], { duration:600, delay });
  }
  function once(element, run) {
    if (!element) return;
    watched.set(element, run);
    if (observer) observer.observe(element);
  }
  if (typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || entry.target.hidden) return;
        observer.unobserve(entry.target);
        const run = watched.get(entry.target);
        watched.delete(entry.target);
        if (!preference.matches) run?.();
      });
    }, { threshold:.12 });
  }
  function heading(section) {
    section.querySelectorAll('h2 .motion-line').forEach((el, i) => line(el, 65 * i));
  }
  const intro = document.querySelector('.intro');
  once(intro, () => {
    enter(intro.querySelector('.eyebrow'),0,8);
    intro.querySelectorAll('.intro-line').forEach((el,i)=>line(el,80+i*85));
    enter(intro.querySelector('p'),230,20);
  });
  const services = document.querySelector('.expertise');
  once(services.querySelector('.section-top'), () => { heading(services); enter(services.querySelector('.section-top p'),150,12); });
  once(services.querySelector('.filters'), () => services.querySelectorAll('[data-filter]').forEach((el,i)=>enter(el,i*55,10)));
  services.querySelectorAll('.service').forEach((row,i)=>once(row,()=>{
    // Entrance is on the summary, so filtering can safely move the containing row.
    const animation=enter(row.querySelector('summary'),(i%3)*60,18);
    rowEntrances.set(row,animation);
    rule(row.querySelector('summary'),(i%3)*60);
  }));
  const manifesto=document.querySelector('.manifesto');
  once(manifesto.querySelector('h2'),()=>{
    heading(manifesto);
    enter(manifesto.querySelector('.eyebrow'),0,8);
  });
  once(manifesto.querySelector('.principles'),()=>manifesto.querySelectorAll('.principles p').forEach((el,i)=>{
    enter(el,i*75,16);enter(el.querySelector('b'),i*75,6);
  }));
  const process=document.querySelector('.approach');
  once(process.querySelector('.section-top'),()=>{heading(process);enter(process.querySelector('.section-top p'),150,12)});
  once(process.querySelector('.steps'),()=>process.querySelectorAll('article').forEach((el,i)=>{
    rule(el,i*70);
    [...el.children].forEach((child,j)=>enter(child,i*70+j*35,12));
  }));
  // Only the architectural study owns these annotation links and entrances.
  const room=document.querySelector('.question-room');
  if(room){
    const pins=[...room.querySelectorAll('.lb-pin')];
    const notes=[...room.querySelectorAll('.lb-note')];
    function markNote(){
      const index=notes.findIndex(note=>'#'+note.id===location.hash);
      const active=index<0?1:index;
      pins.forEach((pin,i)=>{pin.classList.toggle('is-active',i===active);if(i===active)pin.setAttribute('aria-current','location');else pin.removeAttribute('aria-current');});
      notes.forEach((note,i)=>note.classList.toggle('is-active',i===active));
    }
    // Real anchors preserve keyboard navigation, browser history and no-JS access.
    addEventListener('hashchange',markNote);
    markNote();
    once(room.querySelector('h2'),()=>enter(room.querySelector('h2'),0,12));
    once(room.querySelector('.lb-art'),()=>animate(room.querySelector('.lb-art'),[{opacity:.55,transform:'translateY(12px)'},{opacity:1,transform:'none'}],{duration:750}));
    notes.forEach((note,i)=>once(note,()=>enter(note,compact.matches?0:i*60,10)));
  }
  const faq=document.querySelector('.faq');
  once(faq.querySelector('h2'),()=>heading(faq));
  faq.querySelectorAll('details').forEach((el,i)=>once(el,()=>enter(el.querySelector('summary'),(i%3)*55,12)));
  const brief=document.querySelector('.brief');
  once(brief.querySelector('h2'),()=>{
    heading(brief);highlight(brief.querySelector('.highlight-plane'),220);
    enter(brief.querySelector('.eyebrow'),0,8);
  });
  once(brief.querySelector('form'),()=>brief.querySelectorAll('label, button[type="submit"]').forEach((el,i)=>{
    // Never animate a field while it is in use, including restored form focus.
    if (!el.contains(document.activeElement)) enter(el,i*55,12);
  }));
  document.querySelectorAll('.client-card').forEach((card,i)=>once(card,()=>enter(card,(i%2)*70,16)));
  once(document.querySelector('#clients .section-top'),()=>enter(document.querySelector('#clients .section-top'),0,16));
  once(document.querySelector('footer'),()=>[...document.querySelector('footer').children].forEach((el,i)=>enter(el,i*40,10)));

  function hero() {
    if (location.hash || scrollY>100) return;
    const header=document.querySelector('header');
    enter(header.querySelector('.wordmark'),0,6);
    header.querySelectorAll('nav a').forEach((el,i)=>enter(el,50+i*55,6));
    enter(header.querySelector('.nav-cta'),210,6);

  }

  // One compositor-driven loop, independent of scroll input and main-thread frames.
  const strip=document.querySelector('.strip');
  const track=strip.querySelector('.strip-track');
  const group=document.createElement('div');group.className='marquee-group';
  group.append(...track.childNodes);track.append(group);
  const duplicate=group.cloneNode(true);duplicate.setAttribute('aria-hidden','true');duplicate.inert=true;track.append(duplicate);
  const glass=document.createElement('span');
  glass.className='strip-glass';glass.setAttribute('aria-hidden','true');strip.prepend(glass);
  let ribbon=null, groupWidth=0, duration=0, inView=typeof IntersectionObserver!=='function', observedReduced=preference.matches;
  function syncRibbon() {
    if(!ribbon)return;
    if(preference.matches||document.hidden||!inView){
      ribbon.pause();track.style.removeProperty('will-change');
    }else{
      if(ribbon.playState!=='running')ribbon.play();
      track.style.willChange='transform';
    }
  }
  function sizeMarquee() {
    if(observedReduced!==preference.matches){
      observedReduced=preference.matches;
      document.dispatchEvent(new Event('motionpreferencechange'));
    }
    const enabled=!preference.matches&&typeof track.animate==='function';
    strip.classList.toggle('marquee-ready',enabled);
    duplicate.hidden=!enabled;
    if(!enabled){
      ribbon?.cancel();ribbon=null;groupWidth=0;duration=0;
      track.style.removeProperty('will-change');return;
    }
    const width=group.getBoundingClientRect().width;
    const nextDuration=width/(compact.matches?22:32)*1000;
    if(width<=0)return;
    if(ribbon&&Math.abs(width-groupWidth)<.25&&Math.abs(nextDuration-duration)<1){syncRibbon();return;}
    // Keep the position within the loop when a breakpoint or font changes its width.
    const phase=ribbon&&duration?((Number(ribbon.currentTime)||0)%duration)/duration:0;
    ribbon?.cancel();groupWidth=width;duration=nextDuration;
    try{
      ribbon=track.animate([{transform:'translate3d(0,0,0)'},{transform:`translate3d(${-groupWidth}px,0,0)`}],{duration,iterations:Infinity,easing:'linear'});
      ribbon.pause();ribbon.currentTime=phase*duration;syncRibbon();
    }catch{
      ribbon=null;strip.classList.remove('marquee-ready');duplicate.hidden=true;
      track.style.removeProperty('will-change');
    }
  }
  if(typeof IntersectionObserver==='function'){
    new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;syncRibbon()},{rootMargin:'80px'}).observe(strip);
  }
  preference.addEventListener('change',sizeMarquee);
  compact.addEventListener('change',sizeMarquee);
  document.addEventListener('visibilitychange',syncRibbon);
  if(typeof ResizeObserver==='function'){
    const sizing=new ResizeObserver(sizeMarquee);sizing.observe(group);sizing.observe(strip);
  }
  document.fonts?.ready.then(sizeMarquee);
  sizeMarquee();

  // Process emphasis remains driven by native page scrolling.
  const stages=[...process.querySelectorAll('.steps article')];
  let geometry={};
  function measure() {
    geometry.processTop=process.getBoundingClientRect().top+scrollY;
    geometry.processHeight=process.offsetHeight;
    sizeMarquee();
  }
  function update(position) {
    if(preference.matches){stages.forEach(el=>el.style.removeProperty('--stage-progress'));return;}
    const p=clamp((position+innerHeight*.8-geometry.processTop)/(geometry.processHeight+innerHeight*.2));
    stages.forEach((el,i)=>el.style.setProperty('--stage-progress',String(clamp(p*stages.length-i))));

  }
  hero();
  return {measure,update,finishRows(){
    rowEntrances.forEach(a=>{try{a?.finish()}catch{}});
    services.querySelectorAll('.service').forEach(row=>{observer?.unobserve(row);watched.delete(row)});
  }};
};
