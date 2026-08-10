export const INVENTORY_UNITS=Object.freeze([
  {value:'CSE',label:'Case (cse)'},
  {value:'PCS',label:'Pieces (pcs)'},
  {value:'KG',label:'Kilograms (kg)'},
  {value:'GRAMS',label:'Grams'},
  {value:'L',label:'Litres (L)'},
  {value:'ML',label:'Millilitres (ml)'}
]);

export const UNIT_VALUES=Object.freeze(INVENTORY_UNITS.map(unit=>unit.value));
export const CANONICAL_UNITS=UNIT_VALUES;

export function normalizeUnit(value){
  const raw=String(value||'').trim().toUpperCase();
  const aliases={
    UNIT:'PCS',UNITS:'PCS',EA:'PCS',EACH:'PCS',
    CASE:'CSE',CTN:'CSE',CARTON:'CSE',
    PC:'PCS',PIECE:'PCS',PIECES:'PCS',
    KGS:'KG',KILOGRAM:'KG',KILOGRAMS:'KG',
    G:'GRAMS',GRAM:'GRAMS',GM:'GRAMS',GMS:'GRAMS',
    LTR:'L',LTRS:'L',LITER:'L',LITERS:'L',LITRE:'L',LITRES:'L',
    MILLILITER:'ML',MILLILITERS:'ML',MILLILITRE:'ML',MILLILITRES:'ML'
  };
  const normalized=aliases[raw]||raw;
  return UNIT_VALUES.includes(normalized)?normalized:'PCS';
}

export function unitOptions(selected='PCS'){
  const current=normalizeUnit(selected);
  return INVENTORY_UNITS.map(unit=>`<option value="${unit.value}" ${unit.value===current?'selected':''}>${unit.label}</option>`).join('');
}
