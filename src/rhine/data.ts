import posts from '../../public/data/posts.json';
export const archiveColumns = [...new Set(posts.flatMap(p=>p.categories))];
export function columnFiles(lane:number) {
  const category=archiveColumns[((lane % archiveColumns.length)+archiveColumns.length)%archiveColumns.length];
  return posts.map((p,index)=>({p,index})).filter(({p})=>p.categories.includes(category)).map(({index})=>index);
}
export function fileLocation(index:number) {
  const lane=Math.max(0,archiveColumns.indexOf(posts[index].categories[0]));
  const row=12+columnFiles(lane).indexOf(index);
  return {lane,row,slot:lane*32+row};
}
export function fileAtSlot(slot:number) {
  const files=columnFiles(Math.floor(slot/32));
  return files[Math.max(0,Math.min(files.length-1,(slot%32)-12))];
}
