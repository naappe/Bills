export const INVENTORY_UNITS=Object.freeze([
  {value:'UNIT',label:'Unit'},
  {value:'CASE',label:'Case'},
  {value:'PCS',label:'Pieces (pcs)'},
  {value:'KG',label:'Kilograms (kg)'},
  {value:'G',label:'Grams (g)'},
  {value:'L',label:'Litres (L)'},
  {value:'ML',label:'Millilitres (ml)'}
]);

export const UNIT_VALUES=Object.freeze(INVENTORY_UNITS.map(unit=>unit.value));
export const CANONICAL_UNITS=UNIT_VALUES;

export function normalizeUnit(value){
  const raw=String(value||'').trim().toUpperCase();
  const aliases={
    UNITS:'UNIT',EA:'UNIT',EACH:'UNIT',
    CSE:'CASE',CTN:'CASE',CARTON:'CASE',
    PC:'PCS',PIECE:'PCS',PIECES:'PCS',
    KGS:'KG',KILOGRAM:'KG',KILOGRAMS:'KG',
    GRAM:'G',GRAMS:'G',GM:'G',GMS:'G',
    LTR:'L',LTRS:'L',LITER:'L',LITERS:'L',LITRE:'L',LITRES:'L',
    MILLILITER:'ML',MILLILITERS:'ML',MILLILITRE:'ML',MILLILITRES:'ML'
  };
  const normalized=aliases[raw]||raw;
  return UNIT_VALUES.includes(normalized)?normalized:'UNIT';
}

export function unitOptions(selected='UNIT'){
  const current=normalizeUnit(selected);
  return INVENTORY_UNITS.map(unit=>`<option value="${unit.value}" ${unit.value===current?'selected':''}>${unit.label}</option>`).join('');
}
