import { mkdir, open, lstat, chmod, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const schema='CREATE TABLE owner_ledger (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL)';
const check=(value,message)=>{if(!value)throw Error(message);};
/** One process and one FULL-synchronous SQLite ledger per independently owned world. */
export class OwnerWorldLedger {
 #path; #state; #queue=Promise.resolve(); #lock; #fatal; #db;
 static async open(path,binding){
  const ledger=new OwnerWorldLedger();ledger.#path=resolve(path);
  await mkdir(dirname(ledger.#path),{recursive:true,mode:0o700});
  ledger.#lock=await open(ledger.#path+'.lock','wx',0o600);
  try{
   await ledger.#lock.writeFile(JSON.stringify({pid:process.pid,binding}));await ledger.#lock.sync();
   let existing=false;
   try{const info=await lstat(ledger.#path);check(info.isFile()&&!info.isSymbolicLink(),'Ledger must be an ordinary SQLite file');const file=await open(ledger.#path,'r');let header;try{header=Buffer.alloc(16);const result=await file.read(header,0,16,0);check(result.bytesRead===16,'Invalid existing ledger');}finally{await file.close();}check(header.toString('binary')==='SQLite format 3\0','Legacy JSON or invalid ledger requires explicit migration');existing=true;}catch(error){if(error.code!=='ENOENT')throw error;}
   ledger.#db=new DatabaseSync(ledger.#path);await chmod(ledger.#path,0o600);
   if(existing){const tables=ledger.#db.prepare("SELECT name,type,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").all();check(tables.length===1&&tables[0].name==='owner_ledger'&&tables[0].type==='table'&&tables[0].sql===schema,'Unexpected ledger schema');check(ledger.#db.prepare('PRAGMA user_version').get().user_version===1,'Unexpected ledger version');}
   const journal=ledger.#db.prepare('PRAGMA journal_mode=DELETE').get();ledger.#db.exec('PRAGMA synchronous=FULL');
   check(journal.journal_mode==='delete'&&ledger.#db.prepare('PRAGMA synchronous').get().synchronous===2,'Durable SQLite settings unavailable');
   if(!existing){const initial={version:1,binding,challenges:{},grants:{},members:{},transfers:{}};try{ledger.#db.exec('BEGIN IMMEDIATE');ledger.#db.exec(schema);ledger.#db.exec('PRAGMA user_version=1');ledger.#db.prepare('INSERT INTO owner_ledger(id,payload) VALUES(1,?)').run(JSON.stringify(initial));ledger.#db.exec('COMMIT');}catch(error){try{ledger.#db.exec('ROLLBACK');}catch{}ledger.#fatal=Error('Ledger initialization persistence uncertain',{cause:error});throw ledger.#fatal;}}
   const rows=ledger.#db.prepare('SELECT id,payload FROM owner_ledger').all();check(rows.length===1&&rows[0].id===1,'Unexpected ledger payload');ledger.#state=JSON.parse(rows[0].payload);
   check(JSON.stringify(ledger.#state.binding)===JSON.stringify(binding)&&ledger.#state.version===1&&['challenges','grants','members','transfers'].every(key=>ledger.#state[key]&&typeof ledger.#state[key]==='object'&&!Array.isArray(ledger.#state[key])),'Ledger binding/version mismatch');return ledger;
  }catch(error){await ledger.close();throw error;}
 }
 snapshot(){if(this.#fatal)throw this.#fatal;return structuredClone(this.#state);}
 transact(fn){const run=this.#queue.then(async()=>{if(this.#fatal)throw this.#fatal;const next=structuredClone(this.#state);const result=await fn(next);try{this.#db.exec('BEGIN IMMEDIATE');this.#db.prepare('UPDATE owner_ledger SET payload=? WHERE id=1').run(JSON.stringify(next));this.#db.exec('COMMIT');}catch(error){try{this.#db.exec('ROLLBACK');}catch{}this.#fatal=Error('Ledger persistence uncertain; restart reconciliation required',{cause:error});throw this.#fatal;}this.#state=next;return structuredClone(result);});this.#queue=run.catch(()=>{});return run;}
 async close(){await this.#queue;if(!this.#lock)return;try{this.#db?.close();this.#db=null;}catch(error){this.#fatal??=Error('Ledger close uncertain',{cause:error});}await this.#lock.close();this.#lock=null;if(!this.#fatal)await unlink(this.#path+'.lock');}
}
