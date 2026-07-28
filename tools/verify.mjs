import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const walk=directory=>fs.readdirSync(path.join(root,directory),{withFileTypes:true}).flatMap(entry=>{const relative=path.join(directory,entry.name);return entry.isDirectory()?walk(relative):[relative.replaceAll('\\','/')]});
const failures=[];
const passes=[];
const warnings=[];
const check=(condition,message)=>{(condition?passes:failures).push(message)};
const requireText=(source,needle,message)=>check(source.includes(needle),message);
const forbidText=(source,needle,message)=>check(!source.includes(needle),message);

const coreFiles=['index.html','app/js/main.js','app/js/router.js','app/js/bill-entry.js','app/js/data.js','app/js/store.js','.github/workflows/verify.yml'];
for(const file of coreFiles)check(exists(file),`Required file exists: ${file}`);
if(failures.length){console.error('\nRepository verification failed before source checks:\n');failures.forEach(item=>console.error(`✗ ${item}`));process.exit(1)}

const jsFiles=walk('app/js').filter(file=>file.endsWith('.js'));
const index=read('index.html'),main=read('app/js/main.js'),router=read('app/js/router.js'),bill=read('app/js/bill-entry.js'),data=read('app/js/data.js'),store=read('app/js/store.js');
const pageFiles=['dashboard.js','bills.js','bill-entry.js','products.js','vendors.js','cost.js','reports.js','settings.js','admin.js'];

for(const file of jsFiles){
  try{execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});passes.push(`JavaScript syntax: ${file}`)}
  catch(error){failures.push(`JavaScript syntax: ${file}\n${error.stderr?.toString()||error.message}`)}
}

const metaVersion=index.match(/meta name="app-version" content="([^"]+)"/)?.[1];
const deploymentVersion=index.match(/__BILLS_DEPLOYMENT__=\{version:'([^']+)'/)?.[1];
const mainCacheToken=index.match(/main\.js\?v=([^"']+)/)?.[1];
check(Boolean(metaVersion&&deploymentVersion&&mainCacheToken),'All application version and cache markers are present');
check(metaVersion===deploymentVersion,`Deployment markers match (${metaVersion}, ${deploymentVersion})`);
check(/^[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9._-]+)?$/.test(mainCacheToken||''),`main.js has a valid cache token (${mainCacheToken||'missing'})`);
requireText(index,'type="module" src="./app/js/main.js?v=','Index loads main.js directly as a module');
forbidText(index,'manifest.webmanifest','Manifest is disabled during stability recovery');
forbidText(index,'serviceWorker.register','Service worker registration is disabled');
check(/from ['"]\.\/router\.js\?v=[^'"]+['"]/.test(main),'main.js imports router.js with a cache token');
for(const page of pageFiles)check(new RegExp(`from ['"]\\.\\/${page.replace('.','\\.')}\\?v=[^'"]+['"]`).test(router),`router imports ${page} with a cache token`);

requireText(main,"closest('a[data-route],button[data-route]')",'Global routing only accepts explicit links and buttons');
forbidText(main,"closest('[data-route]')",'Page containers cannot become route triggers');
requireText(router,'content.dataset.currentRoute=store.route','Router stores current route without data-route');
forbidText(router,'content.dataset.route=store.route','Router never marks the content container as navigation');
forbidText(router,"querySelectorAll(':scope > .page-head')",'Router preserves page headings and page actions');
requireText(main,'escapeHtml(message)','Workspace errors are safely escaped');
requireText(main,"window.addEventListener('unhandledrejection'",'Unhandled promise failures are recorded');
requireText(index,'method="post"','Login form does not use browser GET submission');

for(const helper of ['itemsOf','productName','itemCategory','lineTotal','billComputedTotal','today'])requireText(store,`export const ${helper}`,`Shared store exports ${helper}`);
for(const file of ['dashboard.js','vendors.js','reports.js'])requireText(read(`app/js/${file}`),'itemsOf',`${file} processes every item in a bill`);
requireText(read('app/js/dashboard.js'),'today','Dashboard uses the shared local business date');
requireText(read('app/js/reports.js'),'today','Reports use the shared local business date');
forbidText(read('app/js/dashboard.js'),'new Date().toISOString().slice(0,10)','Dashboard avoids UTC business dates');
forbidText(read('app/js/reports.js'),'new Date().toISOString().slice(0,10)','Reports avoid UTC business dates');
requireText(read('app/js/reports.js'),'lineTotal','Reports aggregate item-level values');
check(/export\s+(?:async\s+)?function\s+adminPage\s*\(/.test(read('app/js/admin.js')),'Admin page exports a valid renderer');
requireText(read('app/js/admin.js'),'activityRows','Admin activity rendering is separated from the page template');
requireText(read('app/js/admin.js'),"db.rpc('admin_user_overview')",'Admin loads authenticated users through the protected overview RPC');
requireText(read('app/js/admin.js'),"db.rpc('admin_update_user_role'",'Admin updates user access through the protected RPC');
requireText(read('app/js/admin.js'),'data-toggle-user','Admin exposes active and inactive account controls');
requireText(read('app/js/admin.js'),'data-user-role','Admin exposes user access levels');

for(const id of ['billForm','vendor','date','billItems','addRow','subtotal','gstTotal','grandTotal'])requireText(bill,`id="${id}"`,`Bill Entry preserves #${id}`);
requireText(bill,"form.addEventListener('submit'",'Bill Entry owns form submission');
requireText(bill,'saveBillRecords([record])','New bill save calls saveBillRecords');
requireText(bill,'updateBill(editing.id,record)','Edit bill save calls updateBill');
requireText(bill,'data-confirm','Review modal has explicit confirmation');
requireText(bill,'button.disabled=true','Save button is locked during database writes');
requireText(bill,'button.disabled=false','Save button is restored after failure');
requireText(bill,"location.hash='#bills'",'Successful save returns to Bills');
forbidText(main,"closest('#addRow')",'main.js does not intercept Add Row');
forbidText(main,'#billForm','main.js does not control Bill Entry');

requireText(data,'compatibleRecord','Database writes use schema compatibility');
requireText(data,'assertPayload','Database rejects empty or incompatible payloads');
requireText(data,'insert(payload).select()','New bills are inserted and returned');
requireText(data,'if(!data?.length)','Save requires a returned Supabase record');
for(const alias of ['bill_date','payment_status','payment_method','qty','pack_rate'])requireText(data,alias,`Save compatibility covers ${alias}`);
requireText(data,'let billsLoadPromise=null','Bill loading has a shared in-flight request');
requireText(data,'if(!force&&billsLoaded)','Loaded bill data is reused during the session');
requireText(data,'if(!force&&billsLoadPromise)','Concurrent bill loads share one promise');
requireText(data,'invalidateBillsCache','Account changes explicitly invalidate loaded data');
requireText(data,'billsFetchCount++','Bill data fetches are measurable for diagnostics');
requireText(data,"from('user_roles').select('role,is_active')",'Sign-in verifies the database-backed account role and status');
requireText(data,'Your account has been deactivated','Inactive accounts are rejected during authentication');
const adminAccessMigration=read('supabase/migrations/20260728140000_align_bills_admin_with_user_roles.sql');
requireText(adminAccessMigration,"r.role = 'admin'",'Bill-level administration follows the managed database role');
requireText(adminAccessMigration,'r.is_active = true','Inactive admins cannot retain bill-level administration');

const broadIsolation="['pointerdown','mousedown','touchstart','click','focusin']";
const isolationCount=bill.split(broadIsolation).length-1;
check(isolationCount<=1,`No duplicate broad Bill Entry event blockers (${isolationCount}/1)`);
if(isolationCount===1)warnings.push('Bill Entry still contains one legacy propagation blocker. Remove it only with authenticated browser regression testing.');


for(const legacy of ['app/js/rates.js','app/css/rates.css','app/js/pages.js','assets/js/core/rates-page.js','assets/js/core/rates-legacy-compatibility.js','assets/js/core/product-pricing-v10.js','assets/js/core/catalog-list-redesign.js','assets/js/core/procurement-rebuild-v3.js','assets/js/core/inventory-rebuild.js','assets/js/core/hash-router.js','assets/js/core/ui-foundation.js','assets/css/breathing-room.css','tools/apply_stable_build.py','assets/js/core/view-registry.js','assets/js/core/product-editor-v8.js','assets/js/core/view-renderers.js'])check(!exists(legacy),`Legacy price-history file removed: ${legacy}`);
forbidText(router,"ratesPage",'Router contains no legacy rates renderer');
forbidText(router,"Price Intelligence",'Router contains no legacy Price Intelligence label');
const cost=read('app/js/cost.js');
for(const feature of ['store.rows','itemsOf','base_quantity','packInfo','costSearch','Product cost comparison','Pack-price history'])requireText(cost,feature,`Cost page includes ${feature}`);
requireText(cost,"baseUnit=weight?'G':volume?'ML':'PCS'",'Cost page separates weight, volume and count packing');
requireText(cost,"/^(l|ltr|litres?|liters?|ml)$/.test(unit)",'Cost page recognizes litre and millilitre packing');
requireText(cost,'signature:`${baseUnit}:${amount}`','Cost page separates product histories by normalized pack size');
requireText(cost,'if(!packing)continue;','Cost page excludes products without entered packing');
requireText(cost,"largeLabel:'MVR per kg'",'Cost comparison shows MVR per kilogram');
requireText(cost,"smallLabel:'MVR per gram'",'Cost comparison shows MVR per gram');
requireText(cost,"largeLabel:'MVR per litre'",'Cost comparison shows MVR per litre');
requireText(cost,"smallLabel:'MVR per ml'",'Cost comparison shows MVR per millilitre');
requireText(cost,'maximumFractionDigits:6','Small-unit prices preserve useful precision');
requireText(cost,'points.length===1','Cost graph shows a single latest price point');
requireText(cost,'function demoProducts()','Cost page provides isolated example products');
requireText(cost,'View professional example','Cost page exposes the example-mode control');
requireText(cost,'50 temporary products','Cost page identifies all example products');
for(const category of ['Milk','Tuna / Fish','Rice','Cooking Oil','Water'])requireText(cost,category,`Cost example includes ${category}`);
requireText(cost,'Nothing was added to Supabase','Example mode is clearly separated from live data');
requireText(cost,"demoMode?demoProducts():liveProducts",'Example mode can return to live products');
requireText(cost,'`${keyOf(product.category)}|${product.pack.baseUnit}`','Cost comparison prevents unrelated category ranking');
requireText(cost,'data-edit-source','Cost page can open the original bill for editing');

console.log('\nBills repository verification\n');
passes.forEach(item=>console.log(`✓ ${item}`));
warnings.forEach(item=>console.warn(`⚠ ${item}`));
if(failures.length){console.error(`\n${failures.length} check(s) failed:\n`);failures.forEach(item=>console.error(`✗ ${item}`));process.exit(1)}
console.log(`\nPASS — ${passes.length} checks completed across ${jsFiles.length} JavaScript modules.\n`);
