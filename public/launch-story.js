/* A section-owned native sticky story. No scroll hijacking or animation dependency. */
(() => {
  const root=document.querySelector('.launch-story');
  if(!root)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const compact=matchMedia('(max-width: 700px)');
  const sticky=root.querySelector('.ls-sticky');
  const opening=root.querySelector('.ls-opening');
  const canvas=root.querySelector('.ls-canvas');
  const store=root.querySelector('.ls-store');
  const storeContent=root.querySelector('.ls-store-content');
  const products=root.querySelector('.ls-products');
  const ad=root.querySelector('.ls-ad');
  const content=root.querySelector('.ls-content');
  const tiles=[...root.querySelectorAll('.ls-editorial')];
  const system=root.querySelector('.ls-system-labels');
  const captions=[...root.querySelectorAll('.ls-chapter-copy li')];
  const final=root.querySelector('.ls-final');
  const progress=root.querySelector('.ls-progress');
  const buttons=[...progress.querySelectorAll('button')];
  const controlled=[opening,store,storeContent,products,ad,content,system,final,...tiles,...captions];
  const clamp=n=>Math.max(0,Math.min(1,n));
  const smooth=n=>{n=clamp(n);return n*n*(3-2*n)};
  const between=(p,a,b)=>smooth((p-a)/(b-a));
  const mix=(a,b,p)=>a+(b-a)*p;
  let enabled=false, failed=false, frame=0, measureFrame=0, start=0, range=1, width=1, active=-1;
  function reset(){
    root.classList.remove('is-story');root.removeAttribute('data-phase');
    controlled.forEach(el=>el.removeAttribute('style'));
    buttons.forEach(button=>button.removeAttribute('aria-current'));
    progress.hidden=true;active=-1;
  }
  function fallback(){
    failed=true;enabled=false;
    cancelAnimationFrame(frame);cancelAnimationFrame(measureFrame);
    frame=measureFrame=0;reset();
  }
  function render(){
    frame=0;
    if(!enabled||document.hidden)return;
    const p=clamp((scrollY-start)/range);
    const build=between(p,.02,.21), attention=between(p,.34,.53), momentum=between(p,.58,.78), complete=between(p,.83,.96);
    const mobile=compact.matches;
    opening.style.opacity=String(1-between(p,.09,.19));
    opening.style.transform=`translateY(${-between(p,.06,.2)*22}px)`;
    let scale=mix(.5,1,build);scale=mix(scale,.78,attention);scale=mix(scale,.57,momentum);
    let x=mix(0,mobile?-width*.15:-width*.17,attention);x=mix(x,mobile?-width*.19:-width*.245,momentum);
    let y=mix(mobile?60:105,0,build);y=mix(y,mobile?-8:-8,attention);y=mix(y,mobile?-52:-24,momentum);
    store.style.transform=`translate3d(${x}px,${y}px,0) scale(${scale})`;
    storeContent.style.clipPath=`inset(${(1-build)*100}% 0 0 0)`;
    products.style.opacity=String(between(p,.13,.24));
    ad.style.opacity=String(attention);
    ad.style.transform=`translate3d(${mix(0,mobile?-width*.08:-width*.16,momentum)-(1-attention)*width*.12}px,${mix(18,mobile?-9:-5,momentum)}px,0) scale(${mix(.84,.82,momentum)})`;
    // Arrives from the storefront's product area; remains in the composition afterward.
    content.style.opacity=String(momentum);
    content.style.transform=`translate3d(${(1-momentum)*-width*.12}px,${(1-momentum)*24}px,0)`;
    tiles.forEach((tile,i)=>{const reveal=between(p,.59+i*.025,.73+i*.025);tile.style.clipPath=`inset(${(1-reveal)*100}% 0 0 0)`});
    system.style.opacity=String(complete);
    captions.forEach((el,i)=>{
      const intervals=[[.14,.22,.33,.43],[.4,.49,.58,.68],[.65,.73,.81,.9]][i];
      const opacity=between(p,intervals[0],intervals[1])*(1-between(p,intervals[2],intervals[3]));
      el.style.opacity=String(opacity);
      el.style.transform=`translateY(${(1-opacity)*8}px)`;
    });
    final.style.opacity=String(complete);final.style.transform=`translateY(${(1-complete)*10}px)`;
    const chapter=p<.4?0:p<.65?1:2;
    if(chapter!==active){active=chapter;buttons.forEach((button,i)=>{if(i===chapter)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current')});}
    root.dataset.phase=p<.18?'opening':p<.4?'commerce':p<.65?'attention':p<.87?'momentum':'complete';
  }
  function schedule(){
    if(enabled&&!frame&&!document.hidden)frame=requestAnimationFrame(()=>{try{render()}catch{fallback()}});
  }
  function measure(){
    measureFrame=0;
    // Small/short screens use the complete, unpinned composition and linear story.
    enabled=!failed&&!reduced.matches&&innerHeight>=800&&typeof requestAnimationFrame==='function';
    if(!enabled){reset();return;}
    const headerHeight=document.querySelector('header').getBoundingClientRect().height;
    root.style.setProperty('--ls-top',`${Math.ceil(headerHeight)}px`);
    root.classList.add('is-story');progress.hidden=false;
    const box=root.getBoundingClientRect();
    start=box.top+scrollY-headerHeight;
    range=Math.max(1,root.offsetHeight-sticky.offsetHeight);
    width=canvas.clientWidth;
    schedule();
  }
  function scheduleMeasure(){
    if(!failed&&!measureFrame)measureFrame=requestAnimationFrame(()=>{try{measure()}catch{fallback()}});
  }
  buttons.forEach((button,i)=>button.addEventListener('click',()=>{
    if(!enabled)return;
    scrollTo({top:start+range*[.27,.53,.78][i],behavior:reduced.matches?'instant':'smooth'});
  }));
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',scheduleMeasure,{passive:true});
  reduced.addEventListener('change',scheduleMeasure);compact.addEventListener('change',scheduleMeasure);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0}else scheduleMeasure()});
  if(typeof ResizeObserver==='function'){
    // Expanding an earlier service changes this section's document position.
    const observer=new ResizeObserver(scheduleMeasure);observer.observe(document.body);observer.observe(sticky);
  }
  try{measure()}catch{fallback()}
})();
