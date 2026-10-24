import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {C64Computer} from '../src/world/C64Computer.js';
import {Interpreter} from '../src/vendor/basic-m6502/interpreter.js';
const execFileAsync=promisify(execFile),consoleIO={print(){},printLine(){},readLine:async()=>'',readChar:async()=>''};
async function scenario(mode){
 globalThis.document={exitPointerLock(){}};
 let authorized=true,expires=Infinity,pulses=0,resumed=0;const output=[];
 const computer=Object.create(C64Computer.prototype);
 Object.assign(computer,{app:{input:{suspend(){},resume(){resumed++;},requestLock(){}},canResume:()=>true,canCommand:async()=>authorized,canExecute:()=>authorized&&Date.now()<expires},active:false,loggedIn:true,commandGeneration:0,commandQueue:Promise.resolve(),interpreter:new Interpreter(consoleIO),dialog:{showModal(){},close(){}},input:{focus(){}},write:text=>output.push(String(text))});
 computer.open();await computer.enqueue('10 GOTO 10');const old=computer.interpreter,start=performance.now(),pulse=setInterval(()=>pulses++,4);
 if(mode==='expiry')expires=Date.now()+35;
 const running=computer.enqueue('RUN'),stale=computer.enqueue('PRINT "STALE QUEUED WORK"');
 if(mode==='revoke')setTimeout(()=>{authorized=false;computer.close({resume:false});},25);
 let watchdog=false;const guard=setTimeout(()=>{watchdog=true;computer.close({resume:false});},700);
 await running;await stale;clearTimeout(guard);clearInterval(pulse);
 assert(!watchdog,'execution must stop on authorization or cancellation without watchdog');
 assert(performance.now()-start<500,'lease loss must stop within the real timer bound');
 assert(pulses>0,'RUN must yield to real timers');
 assert.equal(old.state.running,false);assert.equal(old.state.continueState.canContinue,false);
 assert.equal(computer.active,false);assert(!output.join('').includes('STALE QUEUED WORK'),'old queue cannot execute');
 assert.equal(resumed,mode==='expiry'?1:0,'forced revoke does not thaw; healthy lease expiry obeys adapter');
 // Reopening uses a fresh execution generation and independent state, retaining editable source.
 authorized=true;expires=Infinity;computer.open();assert.notEqual(computer.interpreter,old);assert.equal(computer.interpreter.program.list()[0],'10 GOTO 10');
 await computer.enqueue('NEW');await computer.enqueue('10 FOR I=1 TO 3');await computer.enqueue('20 PRINT I');await computer.enqueue('30 NEXT I');await computer.enqueue('40 END');await computer.enqueue('RUN');
 assert.equal(computer.interpreter.state.running,false);assert(output.join('').includes(' 3 '),'authorized finite FOR still executes');
 // A command waiting for an old authorization receipt cannot resume in the new opening.
 let release;computer.app.canCommand=()=>new Promise(resolve=>release=resolve);
 const late=computer.enqueue('PRINT "LATE OLD COMMAND"');await new Promise(resolve=>setTimeout(resolve,5));computer.close({resume:false});computer.app.canCommand=async()=>true;computer.open();release(true);await late;
 assert(!output.join('').includes('LATE OLD COMMAND'));computer.close({resume:false});
}
if(process.env.ELSEMESH_BASIC_EXECUTION_CHILD==='1'){
 await scenario(process.argv[2]);process.stdout.write('PASS '+process.argv[2]+'\n');
}else{
 for(const mode of ['revoke','expiry'])test('real C64 infinite RUN yields, '+mode+' cancels execution and stale queues, fresh finite FOR works',{timeout:5000},async()=>{
  const {stdout}=await execFileAsync(process.execPath,[fileURLToPath(import.meta.url),mode],{timeout:3000,env:{...process.env,ELSEMESH_BASIC_EXECUTION_CHILD:'1'}});assert.match(stdout,/PASS/);
 });
}
