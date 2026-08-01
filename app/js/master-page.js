const HEADER_SELECTORS='.page-header,.page-head,.entry-hero';
const TOOLBAR_SELECTORS='.page-toolbar,.dashboard-commandbar,.bills-toolbar,.date-toolbar,.report-toolbar,.toolbar,.cost-workspace,.px-toolbar,.pm-top';

function installMasterPageStyles(){
  if(document.getElementById('masterPageStyles'))return;
  const style=document.createElement('style');
  style.id='masterPageStyles';
  style.textContent=`
    #content>.page-shell{width:100%;min-width:0;display:grid;align-content:start;gap:16px}
    #content>.page-shell>.page-header{width:100%;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0}
    #content>.page-shell>.page-header>.page-header__copy{min-width:0;flex:1 1 auto}
    #content>.page-shell>.page-header>.page-header__copy>h1{margin:0;color:var(--text-strong,#0f172a);font-size:clamp(22px,2vw,30px);line-height:1.15;letter-spacing:-.025em}
    #content>.page-shell>.page-header>.page-header__copy>p{max-width:760px;margin:5px 0 0;color:var(--text-muted,#64748b);font-size:13px;line-height:1.5}
    #content>.page-shell>.page-header>.page-header__actions{flex:0 0 auto;display:flex;align-items:center;gap:8px}
    #content>.page-shell>.page-toolbar{width:100%;min-width:0}
    #content>.page-shell>.page-content{width:100%;min-width:0;display:grid;align-content:start;gap:16px}
    #content>.page-shell>.page-content>:first-child{margin-top:0}
    #content>.page-shell>.page-content>:last-child{margin-bottom:0}
    @media(max-width:820px){
      #content>.page-shell{gap:14px}
      #content>.page-shell>.page-header{align-items:stretch;flex-direction:column}
      #content>.page-shell>.page-header>.page-header__actions{width:100%;justify-content:flex-start}
      #content>.page-shell>.page-header>.page-header__actions>.btn{width:100%}
    }
  `;
  document.head.appendChild(style);
}

function normalizeHeader(header){
  if(!header)return null;
  header.classList.add('page-header');
  header.removeAttribute('style');
  let copy=header.querySelector(':scope > .page-header__copy');
  let actions=header.querySelector(':scope > .page-header__actions');
  if(!copy){
    const existingActions=header.querySelector(':scope > .actions');
    const candidates=[...header.children].filter(child=>child!==existingActions);
    copy=document.createElement('div');
    copy.className='page-header__copy';
    candidates.forEach(child=>copy.appendChild(child));
    header.prepend(copy);
  }
  if(!actions){
    const legacy=header.querySelector(':scope > .actions');
    if(legacy){legacy.classList.add('page-header__actions');actions=legacy}
  }
  return header;
}

export function normalizeMasterPage(content=document.querySelector('#content')){
  installMasterPageStyles();
  if(!content)return;
  const existing=content.querySelector(':scope > .page-shell');
  if(existing){
    normalizeHeader(existing.querySelector(':scope > '+HEADER_SELECTORS.split(',').join(',:scope > ')));
    return;
  }

  const children=[...content.children];
  if(!children.length)return;

  const header=normalizeHeader(children.find(element=>element.matches(HEADER_SELECTORS))||null);
  const toolbar=children.find(element=>element!==header&&element.matches(TOOLBAR_SELECTORS))||null;
  if(toolbar)toolbar.classList.add('page-toolbar');

  const shell=document.createElement('section');
  shell.className='page-shell';
  shell.dataset.masterPage='true';

  if(header)shell.appendChild(header);
  if(toolbar)shell.appendChild(toolbar);

  const pageContent=document.createElement('section');
  pageContent.className='page-content';
  children.filter(element=>element!==header&&element!==toolbar).forEach(element=>pageContent.appendChild(element));
  shell.appendChild(pageContent);
  content.replaceChildren(shell);
}
