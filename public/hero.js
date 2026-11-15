/* The hero owns its entrance, ambient loops and optional desktop pointer depth. */
(() => {
  const root=document.querySelector('.hero-studio');
  if(!root)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const pointer=matchMedia('(hover: hover) and (pointer: fine) and (min-width: 901px)');
  const preview=root.querySelector('.hs-preview-pointer');
  const entrances=new Set();
  let visible=typeof IntersectionObserver!=='function', frame=0, targetX=0, targetY=0, x=0, y=0;
  function settlePointer(){
    cancelAnimationFrame(frame);frame=0;targetX=targetY=x=y=0;preview.style.removeProperty('transform');
  }
  function sync(){
    root.classList.toggle('hs-motion',!reduced.matches);
    root.classList.toggle('hs-running',!reduced.matches&&visible&&!document.hidden);
    if(reduced.matches||document.hidden||!visible){
      settlePointer();
      entrances.forEach(animation=>animation.cancel());entrances.clear();
    }
  }
  function enter(element,delay,distance=16,duration=720){
    if(!element||reduced.matches||document.hidden||typeof element.animate!=='function')return;
    try{
      const animation=element.animate([{opacity:.25,transform:`translate3d(0,${distance}px,0)`},{opacity:1,transform:'translate3d(0,0,0)'}],{duration,delay,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
      entrances.add(animation);animation.finished.then(()=>entrances.delete(animation),()=>entrances.delete(animation));
    }catch{/* Content is visible without enhancement. */}
  }
  function move(){
    frame=0;
    if(!pointer.matches||reduced.matches||!visible||document.hidden){settlePointer();return;}
    x+=(targetX-x)*.12;y+=(targetY-y)*.12;
    preview.style.transform=`translate3d(${x}px,${y}px,0) rotateX(${-y*.15}deg) rotateY(${x*.12}deg)`;
    if(Math.abs(x-targetX)+Math.abs(y-targetY)>.025)frame=requestAnimationFrame(move);
  }
  root.addEventListener('pointermove',event=>{
    if(!pointer.matches||reduced.matches||!visible||document.hidden||event.pointerType==='touch')return;
    targetX=(event.clientX/innerWidth-.5)*6;targetY=(event.clientY/innerHeight-.5)*4;
    if(!frame)frame=requestAnimationFrame(move);
  },{passive:true});
  root.addEventListener('pointerleave',()=>{targetX=targetY=0;if(!frame&&pointer.matches&&!reduced.matches)frame=requestAnimationFrame(move)});
  pointer.addEventListener('change',settlePointer);
  reduced.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  if(typeof IntersectionObserver==='function'){
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()},{rootMargin:'80px'}).observe(root);
  }
  sync();
  // One prompt entrance; native anchors/back navigation never replay it.
  if(!location.hash&&scrollY<100){
    enter(root.querySelector('.hs-eyebrow'),20,8,520);
    root.querySelectorAll('.hs-title-line').forEach((line,index)=>enter(line,80+index*90,18,760));
    enter(root.querySelector('.hs-description'),230,12,650);
    root.querySelectorAll('.hs-actions a').forEach((button,index)=>enter(button,280+index*50,10,620));
    enter(root.querySelector('.hs-footnote'),360,8,600);
    enter(root.querySelector('.hs-preview-enter'),200,24,900);
  }
})();
