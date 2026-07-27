import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const failures=[];
const passes=[];
const warnings=[];
const check=(condition,message)=>{(condition?passes:failures).push(message)};
const requireText=(source,needle,message)=>check(source.includes(needle),message);
const forbidText=(source,needle,message)=>check(!source.includes(needle),message);

const requiredFiles=['index.html','sw.js','app/js/main.js','app/js/router.js','app/js/bill-entry.js','app/js/data.js','app/js/store.js'];
for(const file of requiredFiles)check(exists(file),`Required file exists: ${file}`);
if(failures.length){console.error('\nRepository verification failed before source checks:\n');failures.forEach(item=>console.error(`✗ ${item}`));process.exit(1)}

const index=read('index.html'),sw=read('sw.js'),main=read('app/js/main.js'),router=read('app/js/router.js'),bill=read('app/js/bill-entry.js'),data=read('app/js/data.js');

for(const file of requiredFiles.filter(file=>file.endsWith('.js'))){
  try{execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});passes.push(`JavaScript syntax: ${file}`)}
  catch(error){failures.push(`JavaScript syntax: ${file}\n${error.stderr?.toString()||error.message}`)}
}

const metaVersion=index.match(/meta name="app-version" content="([^"]+)"/)?.[1];
const deploymentVersion=index.match(/__BILLS_DEPLOYMENT__=\{version:'([^']+)'/)?.[1];
const mainVersion=index.match(/main\.js\?v=([0-9.]+)/)?.[1];
const swVersion=index.match(/sw\.js\?v=([0-9.]+)/)?.[1];
const cacheVersion=sw.match(/CACHE_NAME='ws-bills-shell-v([^']+)'/)?.[1];
const versions=[metaVersion,deploymentVersion,mainVersion,swVersion,cacheVersion];
check(versions.every(Boolean),'All application version markers are present');
check(new Set(versions).size===1,`Version markers match (${versions.join(', ')})`);
requireText(main,`./router.js?v=${metaVersion}`,'main.js imports the router at the current application version');

for(const id of ['billForm','vendor','date','billItems','addRow','subtotal','gstTotal','grandTotal'])requireText(bill,`id="${id}"`,`Bill Entry preserves #${id}`);
requireText(bill,"form.addEventListener('submit'",'Bill Entry owns form submission');
requireText(bill,"event.preventDefault()",'Bill Entry prevents native form navigation');
requireText(bill,"saveBillRecords([record])",'New bill save calls saveBillRecords');
requireText(bill,"updateBill(editing.id,record)",'Edit bill save calls updateBill');
requireText(bill,'data-confirm','Review modal has explicit confirmation control');
requireText(bill,'button.disabled=true','Save button is locked during database request');
requireText(bill,'button.disabled=false','Save button is restored after failure');
requireText(bill,"location.hash='#bills'",'Successful save returns to Bills');

forbidText(main,"closest('#addRow')",'main.js does not intercept Add Row');
forbidText(main,'#billForm','main.js does not control Bill Entry form');
forbidText(main,'installBillRowFallback','Emergency Add Row fallback is removed');
forbidText(router,"closest('#addRow')",'router.js does not intercept Add Row');

requireText(data,'compatibleRecord','Database writes use schema compatibility');
requireText(data,'saveBillRecords','Database layer exports new-bill save');
requireText(data,'insert(payload).select()','New bills are inserted and returned');
requireText(data,'if(error)throw error','Supabase errors are propagated');
requireText(data,'if(!payload.length)','Empty save payload is rejected');
for(const alias of ['bill_date','payment_status','payment_method','qty','pack_rate'])requireText(data,alias,`Save compatibility covers ${alias}`);

const broadIsolation="['pointerdown','mousedown','touchstart','click','focusin']";
const isolationCount=bill.split(broadIsolation).length-1;
check(isolationCount<=1,`No additional broad Bill Entry event blockers were introduced (${isolationCount}/1)`);
if(isolationCount===1)warnings.push('Existing broad Bill Entry propagation blocker remains technical debt; do not add another one.');

console.log('\nBills repository verification\n');
passes.forEach(item=>console.log(`✓ ${item}`));
warnings.forEach(item=>console.warn(`⚠ ${item}`));
if(failures.length){console.error(`\n${failures.length} check(s) failed:\n`);failures.forEach(item=>console.error(`✗ ${item}`));process.exit(1)}
console.log(`\nPASS — ${passes.length} checks completed. Deployment contract is intact.\n`);
