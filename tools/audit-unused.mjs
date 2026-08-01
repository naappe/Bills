import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const SOURCE_EXTENSIONS=new Set(['.html','.js','.mjs','.css','.json','.md','.yml','.yaml']);
const CANDIDATE_EXTENSIONS=new Set(['.js','.mjs','.css','.png','.jpg','.jpeg','.webp','.svg','.ico','.woff','.woff2','.json']);
const EXCLUDED_DIRECTORIES=new Set(['.git','node_modules','dist','coverage']);
const REQUIRED_FILES=new Set(['index.html','app/js/main.js','app/js/router.js','app/js/data.js','app/js/store.js','app/js/bill-entry.js','app/js/cost.js','app/css/cost.css','tools/verify.mjs','.github/workflows/verify.yml']);

async function walk(directory){
  const entries=await readdir(directory,{withFileTypes:true});
  const files=[];
  for(const entry of entries){
    if(EXCLUDED_DIRECTORIES.has(entry.name))continue;
    const absolute=path.join(directory,entry.name);
    if(entry.isDirectory())files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files;
}

const relative=file=>path.relative(ROOT,file).replaceAll(path.sep,'/');
const escapeRegExp=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function patternsFor(file){
  const rel=relative(file),name=path.basename(file),withoutApp=rel.replace(/^app\//,'');
  return [...new Set([name,rel,`./${rel}`,withoutApp,`./${withoutApp}`])].filter(Boolean);
}

function riskFor(file){
  if(REQUIRED_FILES.has(file)||/^(index\.html|app\/js\/(main|router|data|store|bill-entry)\.js|tools\/verify\.mjs|\.github\/)/.test(file))return'critical';
  if(/app\/js\//.test(file))return'high';
  if(/\.css$/.test(file))return'medium';
  return'low';
}

async function main(){
  const all=await walk(ROOT);
  const readable=all.filter(file=>SOURCE_EXTENSIONS.has(path.extname(file).toLowerCase()));
  const candidates=all.filter(file=>CANDIDATE_EXTENSIONS.has(path.extname(file).toLowerCase()));
  const sources=new Map();
  for(const file of readable){
    try{sources.set(file,await readFile(file,'utf8'))}catch{}
  }

  const records=[];
  for(const candidate of candidates){
    const file=relative(candidate),risk=riskFor(file);
    if(REQUIRED_FILES.has(file)){
      records.push({file,risk,status:'required',references:[],notes:'Protected core or verification file.'});
      continue;
    }
    const references=[];
    for(const [source,content] of sources){
      if(source===candidate)continue;
      const matched=patternsFor(candidate).some(pattern=>new RegExp(`(^|[\\s\"'(=:/])${escapeRegExp(pattern)}([\\s\"'?#),;]|$)`).test(content));
      if(matched)references.push(relative(source));
    }
    records.push({
      file,
      risk,
      status:references.length?'referenced':'review-required',
      references:[...new Set(references)].sort(),
      notes:references.length?'At least one detectable static reference exists.':'Candidate only. Dynamic routing, templates, selectors, GitHub Pages, or authenticated runtime may still use this file.'
    });
  }

  const report={
    generatedAt:new Date().toISOString(),
    policy:'docs/cleanup-policy.md',
    warning:'This report never marks files confirmed-unused automatically. Manual and authenticated runtime review is required.',
    summary:records.reduce((result,item)=>{result[item.status]=(result[item.status]||0)+1;return result},{}),
    records:records.sort((a,b)=>a.file.localeCompare(b.file))
  };
  await writeFile(path.join(ROOT,'unused-audit.json'),`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log('Unused-file audit completed.');
  console.log(report.summary);
  console.log('Review unused-audit.json. No files were deleted.');
}

main().catch(error=>{console.error('Unused-file audit failed.',error);process.exitCode=1});
