const IMAGE_KEY='bills.productImages.v1';
const $=s=>document.querySelector(s);
const text=v=>String(v??'').trim();
const keyOf=value=>text(value).toLowerCase().replace(/\s+/g,' ');
const readImages=()=>{try{return JSON.parse(localStorage.getItem(IMAGE_KEY)||'{}')}catch{return{}}};
const writeImages=value=>localStorage.setItem(IMAGE_KEY,JSON.stringify(value));

function resizeImage(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('Could not read image'));
    reader.onload=()=>{
      const image=new Image();
      image.onerror=()=>reject(new Error('Unsupported image'));
      image.onload=()=>{
        const max=420,scale=Math.min(1,max/Math.max(image.width,image.height));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(image.width*scale));
        canvas.height=Math.max(1,Math.round(image.height*scale));
        canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL('image/jpeg',.78));
      };
      image.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function enhanceRow(row){
  if(row.dataset.imageReady)return;
  row.dataset.imageReady='1';
  const productInput=row.querySelector('[data-field="description"]');
  if(!productInput)return;
  const label=document.createElement('label');
  label.className='item-image-field';
  label.innerHTML='<span>Image <small>(optional)</small></span><input type="file" accept="image/*" data-field="image-file"><span class="item-image-preview">No image</span>';
  const remove=row.querySelector('[data-remove]');
  row.insertBefore(label,remove||null);
  const input=label.querySelector('input');
  const preview=label.querySelector('.item-image-preview');
  input.onchange=async()=>{
    const file=input.files?.[0];
    if(!file)return;
    if(file.size>8*1024*1024){alert('Choose an image smaller than 8 MB.');input.value='';return}
    try{
      preview.textContent='Preparing…';
      const data=await resizeImage(file);
      row.dataset.productImage=data;
      preview.innerHTML=`<img src="${data}" alt=""><span>${file.name}</span>`;
    }catch(error){preview.textContent='Image failed';alert(error.message)}
  };
}

function enhanceBillForm(){
  const container=$('#billItems');
  if(!container)return;
  container.querySelectorAll('.bill-row').forEach(enhanceRow);
  if(container.dataset.imageObserver)return;
  container.dataset.imageObserver='1';
  new MutationObserver(()=>container.querySelectorAll('.bill-row').forEach(enhanceRow)).observe(container,{childList:true,subtree:true});
}

function saveSelectedImages(){
  const images=readImages();
  document.querySelectorAll('#billItems .bill-row').forEach(row=>{
    const name=text(row.querySelector('[data-field="description"]')?.value);
    const data=row.dataset.productImage;
    if(name&&data)images[keyOf(name)]={data,name,updatedAt:new Date().toISOString()};
  });
  writeImages(images);
}

document.addEventListener('click',event=>{
  if(event.target.closest('[data-confirm]'))saveSelectedImages();
},true);

new MutationObserver(enhanceBillForm).observe(document.body,{childList:true,subtree:true});
enhanceBillForm();
