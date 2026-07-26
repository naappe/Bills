const rules=[
  [/water|mineral|aqua/i,'Mineral Water','H₂O','#d9f2ff','#78c8ee'],
  [/milk|cream|yogurt|cheese|dairy/i,'Dairy','MILK','#fffaf0','#f3d7a0'],
  [/cola|coke|sprite|fanta|soda|drink|juice|beverage/i,'Beverage','DRINK','#ffe8e5','#e8877d'],
  [/oil/i,'Cooking Oil','OIL','#fff7d6','#e9c34a'],
  [/rice|flour|sugar|salt|grain/i,'Dry Grocery','PANTRY','#f5ead8','#c89a5b'],
  [/brownie|cake|bread|biscuit|cookie|bakery/i,'Bakery','BAKED','#f6e2d2','#bd7b4f'],
  [/chicken|beef|fish|tuna|meat|sausage/i,'Protein','FOOD','#ffe4df','#d8796d'],
  [/vegetable|fruit|tomato|onion|potato|carrot/i,'Fresh Produce','FRESH','#e6f5df','#78b86a'],
  [/coffee|tea|cocoa/i,'Hot Beverage','CAFÉ','#eee0d5','#9a6a4b']
];
const esc=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const shorten=(value,max)=>{const clean=String(value||'').trim();return clean.length>max?`${clean.slice(0,max-1)}…`:clean};
export function generateProductImage(product){
  const source=`${product.name} ${product.description} ${product.pack}`;
  const match=rules.find(([pattern])=>pattern.test(source))||[null,'Food & Beverage','F&B','#edf2f7','#95a9bc'];
  const [,category,symbol,a,b]=match,name=esc(shorten(product.name,24)),pack=esc(shorten(product.pack||product.unit,18));
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="520" viewBox="0 0 720 520"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="720" height="520" rx="46" fill="#f8fbfd"/><circle cx="610" cy="80" r="135" fill="${a}" opacity=".72"/><circle cx="95" cy="450" r="170" fill="${b}" opacity=".22"/><rect x="210" y="70" width="300" height="310" rx="42" fill="url(#g)"/><rect x="235" y="96" width="250" height="258" rx="30" fill="#fff" fill-opacity=".86"/><rect x="290" y="58" width="140" height="48" rx="18" fill="${b}"/><text x="360" y="202" text-anchor="middle" font-family="Arial" font-size="48" font-weight="800" fill="#15385f">${symbol}</text><text x="360" y="252" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#52667b">${esc(category)}</text><line x1="275" y1="280" x2="445" y2="280" stroke="#d7e0e8" stroke-width="3"/><text x="360" y="318" text-anchor="middle" font-family="Arial" font-size="17" font-weight="700" fill="#15385f">${pack}</text><text x="360" y="430" text-anchor="middle" font-family="Arial" font-size="27" font-weight="800" fill="#0d2f55">${name}</text><text x="360" y="466" text-anchor="middle" font-family="Arial" font-size="15" fill="#61758a">Generated catalogue illustration</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}