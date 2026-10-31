export const SHIFT_INTERVAL_MS=60000,SHIFT_TRANSITION_MS=2400,SHIFT_TOWER_COUNT=80;
export const SHIFT_THEMES=Object.freeze([
 {name:'RAIN CITY',accent:'#23eaff',second:'#ff369f',third:'#ffbe55',body:'#10202e'},
 {name:'CIRCUIT ARENA',accent:'#27faff',second:'#ff9c30',third:'#97fbff',body:'#071723'},
 {name:'ARCADE SKY',accent:'#f349ff',second:'#65ffe0',third:'#ffe864',body:'#25112f'}
]);
/** A backwards clock freezes the last presentation until wall time catches up.
 * Forward jumps go straight to the current minute, never replay missed shifts. */
export function createShiftClock(){let latest=0;return{advance(now){if(!Number.isFinite(now)||now<0)throw Error('Invalid shift time');latest=Math.max(latest,now);const generation=Math.floor(latest/SHIFT_INTERVAL_MS),phase=latest%SHIFT_INTERVAL_MS;return Object.freeze({generation,phase,blend:Math.min(1,phase/SHIFT_TRANSITION_MS),remaining:Math.ceil((SHIFT_INTERVAL_MS-phase)/1000),timestamp:latest});}};}
const clock=createShiftClock();let frame=clock.advance(Date.now());
export const advanceNeonShiftClock=now=>(frame=clock.advance(now));
export const neonShiftFrame=()=>frame;
export function neonShiftLayout(generation){
 if(!Number.isSafeInteger(generation)||generation<0)throw Error('Invalid shift generation');
 let seed=(Math.imul(generation^0x4e454f4e,0x45d9f3b)^0x13579bdf)>>>0;
 const random=()=>{seed+=0x6d2b79f5;let n=seed;n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return((n^n>>>14)>>>0)/4294967296;};
 const theme=generation%SHIFT_THEMES.length,towers=[];
 for(let i=0;i<SHIFT_TOWER_COUNT;i++){
  const side=i%4,along=(Math.floor(i/4)%10-4.5)*13+(random()-.5)*7,across=40+Math.floor(i/40)*27+(random()-.5)*6;
  const width=theme===1?3+random()*3:theme===2?7+random()*5:5+random()*5,depth=3+random()*6;
  towers.push({x:side===0?across:side===1?-across:along,z:side===2?across:side===3?-across:along,width,depth,height:theme===0?25+random()*75:theme===1?18+random()*55:12+random()*48,color:Math.floor(random()*3),side});
 }
 return{generation,theme,palette:SHIFT_THEMES[theme],towers};
}
