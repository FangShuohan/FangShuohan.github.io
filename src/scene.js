import { ArchiveScene } from './rhine/scene';
import { qualityPresets } from './rhine/render-quality';
import { columnFiles, fileLocation, archiveColumns } from './rhine/data';

export async function mountScene(container, options) {
  const scene = new ArchiveScene(container);
  let active=true, visible=true, disposed=false, animation, last=0, selected=0;
  const layout=()=>{
    container.parentElement.dataset.layout=container.clientWidth/container.clientHeight<1.05?'portrait':'desktop';
    scene.resize();
  };
  try {
    scene.setQuality({...qualityPresets.original,scale:85,pixelRatio:1,aoSamples:16,aoResolution:0.5,depthOfField:35,transmission:0.5});
    scene.setReduced(options.reduced);
    scene.setTheme(options.dark,true);
    await scene.load();
    scene.setMode('archive');scene.select(0);layout();
  } catch(error) {scene.dispose();throw error;}
  const select=(index,navigation)=>{selected=index;scene.select(index,navigation);options.onSelect(index);};
  scene.onSelect=(index,cell)=>select(index,cell?{cell}:undefined);
  scene.onNavigate=(axis,direction)=>{
    const location=fileLocation(selected);
    const lane=axis==='lane'?(location.lane+direction+archiveColumns.length)%archiveColumns.length:location.lane;
    const files=columnFiles(lane),position=files.indexOf(selected);
    select(axis==='lane'?files[0]:files[(position+direction+files.length)%files.length],{axis,direction});
  };
  scene.onHover=index=>options.onHover?.(index);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{threshold:0.01});observer.observe(container);
  const resizeObserver=new ResizeObserver(layout);resizeObserver.observe(container);
  function tick(time){
    if(disposed)return;
    animation=requestAnimationFrame(tick);
    if(!active||!visible||document.hidden||time-last<(options.reduced?100:1000/30))return;
    last=time;scene.update(time/1000);
  }
  animation=requestAnimationFrame(tick);
  container.addEventListener('webglcontextlost',()=>options.onFailure?.(),{once:true});
  return {select, theme:dark=>scene.setTheme(dark,options.reduced), inspect:open=>scene.setMode(open?'detail':'archive'),
    setActive(value){active=value;},
    dispose(){disposed=true;cancelAnimationFrame(animation);observer.disconnect();resizeObserver.disconnect();scene.dispose();}
  };
}
