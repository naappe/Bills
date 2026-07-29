export const DESIGN_USER={id:'design-admin',email:'design@whitesaffron.local'};

const today=new Date();
const isoDay=offset=>{const d=new Date(today);d.setDate(d.getDate()+offset);return d.toISOString().slice(0,10)};
const createdAt=offset=>`${isoDay(offset)}T09:30:00.000Z`;

export const DESIGN_ROWS=[
  {id:'D-1001',bill_date:isoDay(-2),vendor:'Sunlite Pvt Ltd',bill_no:'WS-1001',payment_status:'Paid',category:'Cooking Oil',amount:540,created_at:createdAt(-2),updated_at:createdAt(-2),items:[{description:'Sunlite Sunflower Oil',unit:'btl',qty:12,pack_format:'1 L Bottle',pack_rate:45,row_total:540,gst:0}]},
  {id:'D-1002',bill_date:isoDay(-4),vendor:'Makfa Traders',bill_no:'WS-1002',payment_status:'Paid',category:'Rice',amount:642.5,created_at:createdAt(-4),updated_at:createdAt(-4),items:[{description:'Makfa Basmati Rice',unit:'kg',qty:5,pack_format:'5 KG Bag',pack_rate:128.5,row_total:642.5,gst:0}]},
  {id:'D-1003',bill_date:isoDay(-6),vendor:'Valhomus Pvt Ltd',bill_no:'WS-1003',payment_status:'Pending',category:'Canned Food',amount:384,created_at:createdAt(-6),updated_at:createdAt(-6),items:[{description:'Valhomus Tuna Flakes',unit:'pcs',qty:12,pack_format:'185 g Can',pack_rate:32,row_total:384,gst:0}]},
  {id:'D-1004',bill_date:isoDay(-8),vendor:'Fonterra Brands',bill_no:'WS-1004',payment_status:'Paid',category:'Dairy',amount:516,created_at:createdAt(-8),updated_at:createdAt(-8),items:[{description:'Anchor Milk Powder',unit:'pkt',qty:6,pack_format:'1 KG Pack',pack_rate:86,row_total:516,gst:0}]},
  {id:'D-1005',bill_date:isoDay(-10),vendor:'Akbar Brothers',bill_no:'WS-1005',payment_status:'Paid',category:'Beverages',amount:250,created_at:createdAt(-10),updated_at:createdAt(-10),items:[{description:'Akbar Ceylon Tea',unit:'pkt',qty:10,pack_format:'100 Tea Bags',pack_rate:25,row_total:250,gst:0}]},
  {id:'D-1006',bill_date:isoDay(-12),vendor:'Universal Enterprises',bill_no:'WS-1006',payment_status:'Paid',category:'Sugar',amount:360,created_at:createdAt(-12),updated_at:createdAt(-12),items:[{description:'White Sugar',unit:'kg',qty:20,pack_format:'1 KG Pack',pack_rate:18,row_total:360,gst:0}]},
  {id:'D-1007',bill_date:isoDay(-14),vendor:'Maldivian Eggs Pvt Ltd',bill_no:'WS-1007',payment_status:'Pending',category:'Eggs',amount:420,created_at:createdAt(-14),updated_at:createdAt(-14),items:[{description:'Fresh White Eggs',unit:'tray',qty:10,pack_format:'30 Eggs Tray',pack_rate:42,row_total:420,gst:0}]},
  {id:'D-1008',bill_date:isoDay(-16),vendor:'Nestle Maldives',bill_no:'WS-1008',payment_status:'Paid',category:'Noodles',amount:225,created_at:createdAt(-16),updated_at:createdAt(-16),items:[{description:'Maggi 2-Min Noodles',unit:'pkt',qty:30,pack_format:'70 g Pack',pack_rate:7.5,row_total:225,gst:0}]}
];

const productRows=DESIGN_ROWS.map((row,index)=>({
  id:`P-${index+1}`,
  name:row.items[0].description,
  image_url:null,
  is_active:true,
  deleted_at:null,
  current_rate:row.items[0].pack_rate
}));

function resultFor(table,operation,payload){
  if(table==='products'&&operation==='select')return productRows;
  if(table==='user_roles'&&operation==='single')return{role:'admin',is_active:true};
  if(operation==='insert')return Array.isArray(payload)?payload:[payload].filter(Boolean);
  if(operation==='single')return Array.isArray(payload)?payload[0]||null:payload||null;
  return[];
}

function query(table){
  let operation='select',payload=null;
  const builder={
    select(){operation='select';return builder},insert(value){operation='insert';payload=value;return builder},update(value){operation='update';payload=value;return builder},delete(){operation='delete';return builder},upsert(value){operation='insert';payload=value;return builder},
    eq(){return builder},neq(){return builder},is(){return builder},in(){return builder},order(){return builder},range(){return builder},limit(){return builder},filter(){return builder},or(){return builder},match(){return builder},
    single(){operation='single';return Promise.resolve({data:resultFor(table,operation,payload),error:null})},maybeSingle(){operation='single';return Promise.resolve({data:resultFor(table,operation,payload),error:null})},
    then(resolve,reject){return Promise.resolve({data:resultFor(table,operation,payload),error:null}).then(resolve,reject)}
  };
  return builder;
}

export function createDesignDb(){
  return{
    from:table=>query(table),
    rpc:async()=>({data:[],error:null}),
    auth:{
      getSession:async()=>({data:{session:{user:DESIGN_USER}},error:null}),
      signInWithPassword:async()=>({data:{user:DESIGN_USER,session:{user:DESIGN_USER}},error:null}),
      signOut:async()=>({error:null}),
      resetPasswordForEmail:async()=>({error:null}),
      updateUser:async()=>({data:{user:DESIGN_USER},error:null})
    },
    storage:{from:()=>({upload:async()=>({data:{path:'design-mode'},error:null}),getPublicUrl:path=>({data:{publicUrl:String(path||'')}})})}
  };
}
