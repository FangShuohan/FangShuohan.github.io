import 'katex/dist/katex.min.css';
import './style.css';
import './reader-motion.css';
import posts from '../public/data/posts.json';
import { logo, bootMarkContour } from './rhine/brand';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const base=import.meta.env.BASE_URL;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const stored=(key,fallback)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
const isDark=()=>document.documentElement.dataset.theme==='dark';
let scene, selected=0, inspecting=false, effects=stored('shuohan-effects','on')==='on', scenePending=false;
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2200);}
function themeLabel(){const button=$('.theme-toggle');button.setAttribute('aria-label',`切换${isDark()?'浅':'深'}色主题`);button.title=button.getAttribute('aria-label');}
themeLabel();

// Native dialogs keep focus within the overlay and restore it to the invoking control.
const searchDialog=$('#search-dialog'),input=$('#global-search');
function fillSearch(){
  const query=input.value.trim().toLocaleLowerCase();
  const matches=posts.filter(p=>!query||`${p.title} ${p.text} ${p.tags.join(' ')}`.toLocaleLowerCase().includes(query));
  $('.search-count').textContent=`${matches.length} 份档案${query?' · 全文检索':''}`;
  const results=$('.search-results');results.replaceChildren();
  for(const p of matches){
    const a=document.createElement('a');a.className='search-result';a.href=p.path;
    const id=document.createElement('small');id.textContent=`X-${p.id} / ${p.categories.join(' · ')}`;
    const title=document.createElement('strong');title.textContent=p.title;
    const description=document.createElement('p');
    const at=p.text.toLocaleLowerCase().indexOf(query);description.textContent=at>30?`…${p.text.slice(at-25,at+85)}…`:p.excerpt;
    a.append(id,title,description);results.append(a);
  }
  if(!matches.length){const empty=document.createElement('p');empty.className='search-empty';empty.textContent='没有匹配的档案。换个关键词再试试。';results.append(empty);}
}
function showSearch(){if(!searchDialog.open){searchDialog.showModal();fillSearch();input.focus();scene?.setActive(false);}}
input.addEventListener('input',fillSearch);
$$('dialog').forEach(dialog=>{
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>scene?.setActive(effects));
});
document.addEventListener('click',async event=>{
  const close=event.target.closest('[data-close]');if(close){close.closest('dialog').close();return;}
  const target=event.target.closest('[data-action]');if(!target)return;
  const action=target.dataset.action;
  if(action==='theme'){const dark=!isDark();document.documentElement.dataset.theme=dark?'dark':'light';save('shuohan-theme',dark?'dark':'light');scene?.theme(dark);themeLabel();}
  if(action==='search')showSearch();
  if(action==='next'||action==='previous')changeSelection((selected+(action==='next'?1:-1)+posts.length)%posts.length);
  if(action==='inspect'&&scene){inspecting=!inspecting;scene.inspect(inspecting);target.innerHTML=inspecting?'收回档案模型 <span>−</span>':'展开档案模型 <span>＋</span>';}
  if(action==='effects'){
    effects=!effects;save('shuohan-effects',effects?'on':'off');syncEffects();
    if(!effects&&scene){scene.dispose();scene=undefined;inspecting=false;$('.inspect-toggle').innerHTML='展开档案模型 <span>＋</span>';$('.inspect-toggle').disabled=true;$('#scene-status').textContent='静态档案视图';$('#archive-stage').classList.remove('scene-ready');$('#archive-stage').classList.add('effects-off');}
    else if(effects)await enableScene();
  }
  if(action==='copy-link'){
    try{await navigator.clipboard.writeText(location.href);toast('文章链接已复制');}catch{toast('请复制浏览器地址栏中的链接');}
  }
  if(action==='copy-code'){
    try{await navigator.clipboard.writeText(target.parentElement.querySelector('code').textContent);target.textContent='已复制';setTimeout(()=>target.textContent='复制',1800);}catch{toast('请选中代码后复制');}
  }
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&$('dialog[open]')){event.preventDefault();$('dialog[open]').close();return;}
  if(/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||event.target.isContentEditable)return;
  if(event.key==='/'&&!$('dialog[open]')){event.preventDefault();showSearch();}
  if(event.key==='Escape'&&inspecting){inspecting=false;scene?.inspect(false);$('.inspect-toggle').innerHTML='展开档案模型 <span>＋</span>';}
  if($('#archive-stage')&&!$('dialog[open]')&&window.scrollY<innerHeight/2){
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();changeSelection((selected+(event.key==='ArrowRight'?1:-1)+posts.length)%posts.length);}
  }
});

// Filtering preserves input focus and leaves all source articles present in the static HTML.
const cards=$$('.file-card'),indexInput=$('#index-search');
const params=new URLSearchParams(location.search);
let category=params.get('category')||'',tag=params.get('tag')||'';
function filterIndex(){
  if(!cards.length)return;
  const query=(indexInput?.value||'').trim().toLocaleLowerCase();let count=0;
  cards.forEach(card=>{const p=posts.find(x=>x.slug===card.dataset.slug);const match=(!category||p.categories.includes(category))&&(!tag||p.tags.includes(tag))&&(!query||`${p.title} ${p.text} ${p.tags.join(' ')}`.toLocaleLowerCase().includes(query));card.hidden=!match;if(match)count++;});
  $$('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===category)));
  $('.filter-status').textContent=query||category||tag?`${count} 份档案${category?' / '+category:''}${tag?' / #'+tag:''}`:'';
  $('.empty-state').hidden=count>0;
  $$('.taxonomy-links a').forEach(a=>a.classList.toggle('active',new URL(a.href).search===location.search));
}
$$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.filter;filterIndex();}));
indexInput?.addEventListener('input',filterIndex);filterIndex();
$$('.site-header nav>a').forEach(a=>{if(location.pathname.startsWith(new URL(a.href).pathname))a.setAttribute('aria-current','page');});

// Long-form reading tools work independently of the 3D homepage.
if($('.reader')){
  // Open the file once; deep links and history restoration keep their reading position.
  const layout=$('.reader-layout');
  const navigation=performance.getEntriesByType('navigation')[0];
  if(!reduced&&!location.hash&&navigation?.type!=='back_forward'){
    layout.classList.add('reader-opening');
    const finishOpening=()=>layout.classList.remove('reader-opening');
    setTimeout(finishOpening,1200);
    window.addEventListener('pageshow',event=>{if(event.persisted)finishOpening();});
    window.addEventListener('hashchange',finishOpening,{once:true});
  }
  const progress=$('.reading-progress i');
  const updateProgress=()=>{const reader=$('.reader'),max=reader.offsetTop+reader.offsetHeight-innerHeight;progress.style.width=`${Math.min(100,Math.max(0,scrollY/Math.max(1,max)*100))}%`;};
  window.addEventListener('scroll',updateProgress,{passive:true});window.addEventListener('resize',updateProgress);updateProgress();
  $$('.prose pre').forEach(pre=>{const button=document.createElement('button');button.dataset.action='copy-code';button.className='copy-code';button.textContent='复制';pre.append(button);});
  $$('.prose img').forEach(img=>{
    img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label',`查看原图：${img.alt||'文章插图'}`);
    const open=()=>{const dialog=$('#image-dialog');dialog.querySelector('img').src=img.src;dialog.querySelector('img').alt=img.alt;dialog.querySelector('a').href=img.src;dialog.showModal();};
    img.addEventListener('click',open);img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
  });
  // Wrap tables without altering the parsed cells or mathematical expressions.
  $$('.prose table').forEach(table=>{const wrapper=document.createElement('div');wrapper.className='table-scroll';wrapper.tabIndex=0;wrapper.setAttribute('role','region');wrapper.setAttribute('aria-label','表格，可横向滚动');table.before(wrapper);wrapper.append(table);});
  const headings=$$('.prose [id^="section-"]');
  const updateTOC=()=>{let current=headings[0];for(const h of headings)if(h.getBoundingClientRect().top<150)current=h;$$('.toc a').forEach(a=>a.classList.toggle('active',a.hash==='#'+current?.id));};
  window.addEventListener('scroll',updateTOC,{passive:true});updateTOC();
}

function paintSelected(index){
  if(!Number.isInteger(index)||!posts[index])return;
  selected=index;const p=posts[index];
  $('#selected-category').textContent=p.categories.join(' · ');
  $('#selected-id').textContent=`X-${p.id}`;$('#selected-number').textContent=String(index+1).padStart(2,'0');
  $('#selected-title').textContent=p.title;$('#selected-excerpt').textContent=p.excerpt.slice(0,95)||'这是一篇空白测试文章。';$('#selected-link').href=p.path;
  if(!reduced)$('#selected-title').animate([{transform:'translateY(12px)',opacity:0,filter:'blur(2px)'},{transform:'translateY(0)',opacity:1,filter:'blur(0)'}],{duration:360,easing:'cubic-bezier(.2,.7,.2,1)'});
  $$('[data-select]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.select)===index)));
}
function changeSelection(index){paintSelected(index);scene?.select(index);}
$$('[data-select]').forEach(b=>b.addEventListener('click',()=>changeSelection(Number(b.dataset.select))));
function syncEffects(){const b=$('[data-action="effects"]');if(b){b.textContent=`动效 ${effects?'开':'关'}`;b.setAttribute('aria-pressed',String(effects));}}
async function enableScene(){
  if(!$('#archive-scene')||scene||scenePending||!effects)return;
  scenePending=true;$('#scene-status').textContent='正在载入玻璃档案…';
  try{
    const {mountScene}=await import('./scene');
    const loaded=await mountScene($('#archive-scene'),{dark:isDark(),reduced,onSelect:paintSelected,onFailure:()=>{effects=false;syncEffects();$('#scene-status').textContent='使用静态档案视图';}});
    if(!effects){loaded.dispose();return;}
    scene=loaded;scene.select(selected);$('#archive-stage').classList.add('scene-ready');$('#archive-stage').classList.remove('effects-off');
    $('#scene-status').textContent='拖动浏览 · ← → 切换';$('.inspect-toggle').disabled=false;
  }catch(error){console.warn('3D archive unavailable:',error);$('#scene-status').textContent='使用静态档案视图';$('.inspect-toggle').disabled=true;}
  finally{scenePending=false;}
}
function boot(){
  if(reduced)return;
  try{if(sessionStorage.getItem('shuohan-entered'))return;sessionStorage.setItem('shuohan-entered','1');}catch{}
  const gate=document.createElement('div');gate.className='boot';gate.setAttribute('aria-label','进入个人档案库');
  gate.innerHTML=`<div class="boot-corner">SHUOHAN BLOG<small>PERSONAL KNOWLEDGE ARCHIVE</small></div><div class="boot-readout"><span>BOOT SEQUENCE</span><b>2026.09</b><i></i><span>MEMORY / 08 FILES</span></div><div class="boot-center"><div class="boot-signal"><span></span><span></span><span></span><span></span></div><svg class="boot-symbol" viewBox="0 0 310 145" aria-hidden="true"><path d="${bootMarkContour}" pathLength="1"/><path class="boot-plus" d="M44 70h50M69 45v50M219 70h44"/></svg><div class="boot-orbit"></div><p>ACCESS GRANTED <b>／ 01</b></p><h2>WELCOME TO<br>YOUR FIELD OF THOUGHTS<span>个人档案 · 开放阅读</span></h2></div><div class="boot-code"><span>INIT / MEMORY</span><span>SCAN / INDEX</span><span>READY / READ</span></div><button class="boot-skip">进入博客 ↗</button><span class="boot-footer">EST. 2026 <i></i> PERSONAL ARCHIVE</span>`;
  document.body.append(gate);
  let finished=false;
  const finish=()=>{if(finished)return;finished=true;gate.classList.add('leave');setTimeout(()=>gate.remove(),400);};
  gate.querySelector('button').onclick=finish;
  const keyboard=e=>{if(e.key==='Escape'||e.key==='Enter'){finish();}};document.addEventListener('keydown',keyboard);
  setTimeout(()=>{finish();document.removeEventListener('keydown',keyboard);},2600);
}
if($('#archive-stage')){syncEffects();$('.inspect-toggle').disabled=true;boot();if(effects)enableScene();else $('#archive-stage').classList.add('effects-off');}
window.addEventListener('pagehide',()=>scene?.setActive(false));
window.addEventListener('pageshow',()=>scene?.setActive(effects));
