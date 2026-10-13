import type { DemoWorkspace, WorkspaceProduct } from '@/types/workspace';

const STORAGE_KEY = 'archsync-demo-workspace-v1';
const CHANGE_EVENT = 'archsync-demo-workspace-change';

export const initialDemoWorkspace: DemoWorkspace = {
  projects: [
    {id:'project-modern-thuduc',name:'Modern Townhouse · Thu Duc',homeowner:'Minh Anh',homeownerEmail:'homeowner.demo@archsync.test',designer:'Nguyen Linh',designerEmail:'designer.demo@archsync.test',staff:'Tran Nam',stage:'Concept',status:'Awaiting designer action',progress:60,currentRound:2,totalRounds:3,dueDate:'12 Dec 2026',style:'Japandi',buildingType:'Townhouse',area:80,floors:3,budgetMin:600000000,budgetMax:900000000,brief:'A family of four wants a warm, calm townhouse with an open kitchen and two quiet work areas. The narrow plot limits daylight in the middle; use light oak finishes and preserve the existing walls and stairs.',selectedProductSkus:['NTV-SF-203','NTV-DT-114','NTV-TV-031','NTV-LP-021'],currentVersion:3,updatedAt:'Today',constraints:[{id:'constraint-1',type:'Layout',rule:'Walls, stairs and wet areas stay fixed',source:'Site survey',locked:true},{id:'constraint-2',type:'Size',rule:'Sofa max 3.0 m (wall length)',source:'Homeowner',locked:true},{id:'constraint-3',type:'Size',rule:'Kitchen island max 2.0 m',source:'Designer',locked:true},{id:'constraint-4',type:'Equipment',rule:'Keep existing air-conditioner positions',source:'Homeowner',locked:true},{id:'constraint-5',type:'Budget',rule:'VND 600–900M in total',source:'Contract',locked:true}]},
    {id:'project-district7',name:'Townhouse 4×15 m · District 7',homeowner:'Pham family',homeownerEmail:'pham.family@example.test',designer:'Nguyen Linh',designerEmail:'designer.demo@archsync.test',staff:'Tran Nam',stage:'Concept',status:'Awaiting designer action',progress:40,currentRound:1,totalRounds:3,dueDate:'12 Oct 2026',style:'Minimalist',buildingType:'Townhouse',area:60,floors:3,budgetMin:500000000,budgetMax:750000000,brief:'A compact townhouse for a young family. Keep circulation clear and prioritize durable, low-maintenance finishes.',selectedProductSkus:['NTV-AC-077','NTV-CT-088'],currentVersion:1,updatedAt:'Today',constraints:[]},
    {id:'project-level4-thuduc',name:'Level-4 house · Thu Duc',homeowner:'Tran family',homeownerEmail:'tran.family@example.test',designer:'Pham Duc',designerEmail:'pham.duc@example.test',staff:'Tran Nam',stage:'Product selection',status:'Awaiting designer action',progress:65,currentRound:2,totalRounds:3,dueDate:'13 Oct 2026',style:'Scandinavian',buildingType:'Level-4 house',area:95,floors:1,budgetMin:700000000,budgetMax:1000000000,brief:'A bright single-floor family home with practical storage and a soft Scandinavian palette.',selectedProductSkus:['NTV-CR-009','NTV-BS-052'],currentVersion:2,updatedAt:'Yesterday',constraints:[]},
    {id:'project-binhthanh',name:'Townhouse 5×18 m · Binh Thanh',homeowner:'Le family',homeownerEmail:'le.family@example.test',designer:'Nguyen Linh',designerEmail:'designer.demo@archsync.test',staff:'Tran Nam',stage:'Design review',status:'In review',progress:80,currentRound:3,totalRounds:3,dueDate:'14 Oct 2026',style:'Modern',buildingType:'Townhouse',area:90,floors:3,budgetMin:900000000,budgetMax:1300000000,brief:'Modern townhouse design with a bright living zone and flexible bedrooms.',selectedProductSkus:['NTV-SF-203','NTV-AC-077'],currentVersion:3,updatedAt:'Yesterday',constraints:[]},
    {id:'project-govap',name:'Level-4 house · Go Vap',homeowner:'Nguyen family',homeownerEmail:'nguyen.family@example.test',designer:'Pham Duc',designerEmail:'pham.duc@example.test',staff:'Tran Nam',stage:'Handover',status:'Upload deliverables',progress:95,currentRound:3,totalRounds:3,dueDate:'20 Oct 2026',style:'Industrial',buildingType:'Level-4 house',area:105,floors:1,budgetMin:650000000,budgetMax:950000000,brief:'Industrial-inspired level-4 home with clear technical handover documents.',selectedProductSkus:['NTV-BS-052','NTV-TV-031'],currentVersion:3,updatedAt:'2 days ago',constraints:[]},
    {id:'project-district2',name:'Townhouse 4×12 m · District 2',homeowner:'Vo family',homeownerEmail:'vo.family@example.test',designer:'Nguyen Linh',designerEmail:'designer.demo@archsync.test',staff:'Tran Nam',stage:'Requirements',status:'New · assigned today',progress:20,currentRound:1,totalRounds:3,dueDate:'25 Oct 2026',style:'Indochine',buildingType:'Townhouse',area:48,floors:3,budgetMin:550000000,budgetMax:800000000,brief:'Indochine townhouse with handcrafted materials and a light-filled central stairwell.',selectedProductSkus:['NTV-AC-077','NTV-CT-088'],currentVersion:1,updatedAt:'Today',constraints:[]},
  ],
  products: [
    {id:'product-oak-sofa',name:'Oak sofa 3-seat',sku:'NTV-SF-203',supplier:'Noi That Viet',category:'Sofa',width:'2.8',depth:'0.95',height:'0.8',price:18500000,stock:24,leadTime:3,material:'Oak, linen',description:'Solid oak frame with removable linen covers.',model:'oak-sofa.glb',style:'Japandi'},
    {id:'product-walnut-table',name:'Walnut dining table',sku:'NTV-DT-114',supplier:'Noi That Viet',category:'Table',width:'1.6',depth:'0.9',height:'0.75',price:12900000,stock:3,leadTime:4,material:'Walnut',description:'Six-seat table with a matte oil finish.',model:'walnut-table.glb',style:'Japandi'},
    {id:'product-rattan-chair',name:'Rattan armchair',sku:'NTV-AC-077',supplier:'Noi That Viet',category:'Chair',width:'0.7',depth:'0.7',height:'0.8',price:3200000,stock:5,leadTime:2,material:'Rattan, ash',description:'Hand-woven rattan seat on an ash frame.',model:'rattan-chair.glb',style:'Indochine'},
    {id:'product-tv-cabinet',name:'TV cabinet oak 2.0 m',sku:'NTV-TV-031',supplier:'Noi That Viet',category:'Cabinet',width:'2.0',depth:'0.4',height:'0.5',price:7400000,stock:16,leadTime:3,material:'Oak',description:'Low cabinet with cable management.',model:'tv-cabinet.glb',style:'Japandi'},
    {id:'product-linen-curtain',name:'Linen curtain set',sku:'NTV-CR-009',supplier:'Noi That Viet',category:'Textile',width:'3.0',depth:'',height:'2.6',price:2100000,stock:0,leadTime:2,material:'Linen',description:'Two panels, 3.0 × 2.6 m, with rings.',style:'Scandinavian'},
    {id:'product-ash-bookcase',name:'Bookshelf ash 2.4 m',sku:'NTV-BS-052',supplier:'Noi That Viet',category:'Storage',width:'2.4',depth:'0.3',height:'2.1',price:9800000,stock:2,leadTime:4,material:'Ash',description:'Open shelving with adjustable boards.',model:'bookshelf.glb',style:'Minimalist'},
    {id:'product-coffee-table',name:'Oak coffee table',sku:'NTV-CT-088',supplier:'Noi That Viet',category:'Table',width:'1.0',depth:'0.6',height:'0.4',price:4600000,stock:18,leadTime:2,material:'Oak',description:'Round-edged coffee table in solid oak.',style:'Japandi'},
    {id:'product-pendant-lamp',name:'Pendant lamp oak',sku:'NTV-LP-021',supplier:'Noi That Viet',category:'Lighting',width:'0.5',depth:'0.5',height:'0.4',price:2400000,stock:40,leadTime:2,material:'Oak, fabric',description:'Pendant lamp with an oak ring and linen shade.',style:'Japandi'},
    {id:'product-linen-sofa',name:'Linen sofa 2-seat',sku:'VH-SF-020',supplier:'Viet Home',category:'Sofa',width:'2.0',depth:'0.9',height:'0.8',price:14200000,stock:12,leadTime:2,material:'Linen, ash',description:'Two-seat sofa with removable linen covers.',style:'Scandinavian'},
    {id:'product-flooring-oak',name:'Engineered oak flooring',sku:'VG-FL-080',supplier:'Viglacera Tiles',category:'Flooring',width:'',depth:'',height:'',price:1200000,stock:140,leadTime:2,material:'Engineered oak',description:'Warm oak flooring suitable for residential interiors.',style:'Japandi'},
    {id:'product-floor-wall-tiles',name:'Floor & wall tiles',sku:'VG-TL-120',supplier:'Viglacera Tiles',category:'Tile',width:'',depth:'',height:'',price:500000,stock:260,leadTime:1,material:'Porcelain',description:'Durable porcelain floor and wall tiles.',style:'Modern'},
    {id:'product-lighting-set',name:'Pendant light set',sku:'SL-LP-006',supplier:'Sang Lighting',category:'Lighting',width:'',depth:'',height:'',price:1400000,stock:28,leadTime:2,material:'Oak, fabric',description:'Coordinated pendant light set.',style:'Japandi'},
  ],
  comments: [
    {id:'comment-1',projectId:'project-modern-thuduc',room:'Living room',version:3,type:'Change request',text:'Can the sofa sit under the window instead? I want a clearer walkway to the kitchen.',createdAt:'10 min ago',status:'Open'},
    {id:'comment-2',projectId:'project-modern-thuduc',room:'Kitchen',version:3,type:'Change request',text:'Love the island. Could the stools be rattan instead of wood?',createdAt:'1 hour ago',status:'Open'},
    {id:'comment-3',projectId:'project-modern-thuduc',room:'Living room',version:3,type:'Change request',text:'The curtains look a bit dark. Something warmer?',createdAt:'2 hours ago',status:'Open'},
    {id:'comment-4',projectId:'project-modern-thuduc',room:'Master bedroom',version:3,type:'Question',text:'Is there space for more hidden storage near the bed?',createdAt:'Yesterday',status:'Open'},
    {id:'comment-5',projectId:'project-modern-thuduc',room:'Dining room',version:3,type:'Note',text:'The pendant lights are great. Please keep them.',createdAt:'Yesterday',status:'Open'},
    {id:'comment-6',projectId:'project-modern-thuduc',room:'Living room',version:2,type:'Change request',text:'The floor feels too dark.',createdAt:'28 Sep',status:'Resolved',reply:'Updated the palette in version 3.'},
  ],
  inquiries: [
    {id:'inquiry-1',projectId:'project-modern-thuduc',productSku:'NTV-SF-203',title:'Oak sofa 2.6 m version?',from:'Nguyen Linh',fromEmail:'designer.demo@archsync.test',time:'10:12 today',status:'New',body:'The living room wall is 3.0 m. Is the Oak sofa 3-seat available in a 2.6 m version so the client has more walkway?',facts:[['Room limit','Sofa max 3.0 m (wall)'],['Budget for sofa','VND 15–20M']]},
    {id:'inquiry-2',projectId:'project-level4-thuduc',productSku:'NTV-CR-009',title:'Lead time for linen curtains',from:'Pham Duc',fromEmail:'pham.duc@example.test',time:'09:40 today',status:'New',body:'We need 5 linen curtain sets for the new build. What is the lead time while the item is out of stock?',facts:[['Quantity','5 sets'],['Needed by','20 Nov']]},
    {id:'inquiry-3',projectId:'project-district7',title:'Bulk price for 80 m² oak flooring',from:'Le Trang',fromEmail:'le.trang@example.test',time:'Yesterday',status:'Open',body:'Do you offer a bulk price for 80 m² of oak flooring, delivered to District 7?',facts:[['Area','80 m²'],['Needed by','30 Nov']]},
    {id:'inquiry-4',projectId:'project-modern-thuduc',productSku:'NTV-DT-114',title:'Walnut table restock date',from:'Nguyen Linh',fromEmail:'designer.demo@archsync.test',time:'Yesterday',status:'Open',body:'Only 3 walnut dining tables are left. When is the next restock?',facts:[['Requested qty','1'],['Needed by','15 Nov']]},
    {id:'inquiry-5',projectId:'project-district7',productSku:'NTV-AC-077',title:'Alternative to rattan armchair',from:'Pham Duc',fromEmail:'pham.duc@example.test',time:'07 Oct',status:'Open',body:'The client asks for a similar armchair in a darker finish. Do you have an alternative?',facts:[['Original','Rattan armchair'],['Budget','VND 2.5–3.5M']]},
    {id:'inquiry-6',projectId:'project-govap',productSku:'NTV-BS-052',title:'Delivery to the Go Vap site',from:'Le Trang',fromEmail:'le.trang@example.test',time:'05 Oct',status:'Answered',body:'Can you deliver the ash bookshelf to the third floor in Go Vap?',facts:[['Floor','3rd floor'],['Access','Narrow alley']],reply:'Yes. Delivery includes carrying up to the 3rd floor. We need 2 days of notice.'},
    {id:'inquiry-7',projectId:'project-level4-thuduc',productSku:'NTV-AC-077',title:'Price for 4 rattan armchairs',from:'Pham Duc',fromEmail:'pham.duc@example.test',time:'03 Oct',status:'Answered',body:'What is the price for 4 rattan armchairs including delivery?',facts:[['Quantity','4'],['Delivery','Long An']],reply:'VND 12.2M for 4 armchairs, delivery included.'},
    {id:'inquiry-8',projectId:'project-govap',productSku:'NTV-BS-052',title:'Ash bookshelf finish options',from:'Le Trang',fromEmail:'le.trang@example.test',time:'01 Oct',status:'Answered',body:'Which finishes are available for the ash bookshelf?',facts:[['Product','Bookshelf ash 2.4 m'],['Style','Warm minimal']],reply:'Natural, white wash and smoked. All are the same price.'},
  ],
  versions: [
    {id:'version-1',projectId:'project-modern-thuduc',number:1,title:'Initial concept',style:'Japandi',createdAt:'28 Sep',status:'Archived',notes:'Initial layout and palette.'},
    {id:'version-2',projectId:'project-modern-thuduc',number:2,title:'Client feedback changes',style:'Japandi',createdAt:'01 Oct',status:'Archived',notes:'Dark floor palette revised.'},
    {id:'version-3',projectId:'project-modern-thuduc',number:3,title:'Living room concept',style:'Japandi',createdAt:'07 Oct',status:'Sent for review',notes:'Current version sent to the homeowner.'},
  ],
  files: [
    {id:'file-1',projectId:'project-modern-thuduc',name:'Floor plan 2D.pdf',type:'Homeowner upload',size:'2.4 MB',uploadedBy:'Minh Anh',uploadedAt:'07 Oct',visibility:'Team'},
    {id:'file-2',projectId:'project-modern-thuduc',name:'Facade photo.jpg',type:'Homeowner upload',size:'1.1 MB',uploadedBy:'Minh Anh',uploadedAt:'07 Oct',visibility:'Team'},
    {id:'file-3',projectId:'project-modern-thuduc',name:'Reference board.zip',type:'Homeowner upload',size:'8.6 MB',uploadedBy:'Minh Anh',uploadedAt:'07 Oct',visibility:'Team'},
    {id:'file-4',projectId:'project-modern-thuduc',name:'Brief (AI).pdf',type:'Design',size:'0.4 MB',uploadedBy:'System',uploadedAt:'07 Oct',visibility:'Homeowner'},
    {id:'file-5',projectId:'project-modern-thuduc',name:'Living room · v3.pdf',type:'Design',size:'2.4 MB',uploadedBy:'Nguyen Linh',uploadedAt:'01 Oct',visibility:'Homeowner'},
    {id:'file-6',projectId:'project-modern-thuduc',name:'Floor plans v3.dwg',type:'Design',size:'6.8 MB',uploadedBy:'Nguyen Linh',uploadedAt:'01 Oct',visibility:'Team'},
    {id:'file-7',projectId:'project-modern-thuduc',name:'Renders v3.zip',type:'Design',size:'24 MB',uploadedBy:'Nguyen Linh',uploadedAt:'01 Oct',visibility:'Homeowner'},
    {id:'file-8',projectId:'project-modern-thuduc',name:'Contract C-2026-014.pdf',type:'Contract',size:'0.3 MB',uploadedBy:'Tran Nam',uploadedAt:'03 Oct',visibility:'Homeowner'},
  ],
  selections: [
    {projectId:'project-modern-thuduc',productSku:'NTV-SF-203',quantity:1,room:'Living room',status:'Selected'},
    {projectId:'project-modern-thuduc',productSku:'NTV-DT-114',quantity:1,room:'Dining room',status:'Quoted'},
    {projectId:'project-modern-thuduc',productSku:'NTV-TV-031',quantity:1,room:'Living room',status:'Ordered'},
    {projectId:'project-modern-thuduc',productSku:'NTV-LP-021',quantity:6,room:'Dining room',status:'Selected'},
    {projectId:'project-district7',productSku:'NTV-AC-077',quantity:4,room:'Living room',status:'Quoted'},
    {projectId:'project-district7',productSku:'NTV-CT-088',quantity:1,room:'Living room',status:'Selected'},
    {projectId:'project-level4-thuduc',productSku:'NTV-CR-009',quantity:5,room:'Living room',status:'Selected'},
    {projectId:'project-level4-thuduc',productSku:'NTV-BS-052',quantity:1,room:'Bedroom',status:'Selected'},
    {projectId:'project-binhthanh',productSku:'NTV-SF-203',quantity:1,room:'Living room',status:'Ordered'},
    {projectId:'project-binhthanh',productSku:'NTV-AC-077',quantity:2,room:'Lounge',status:'Selected'},
    {projectId:'project-govap',productSku:'NTV-BS-052',quantity:1,room:'Living room',status:'Delivered'},
    {projectId:'project-govap',productSku:'NTV-TV-031',quantity:1,room:'Living room',status:'Delivered'},
    {projectId:'project-district2',productSku:'NTV-AC-077',quantity:2,room:'Living room',status:'Selected'},
    {projectId:'project-district2',productSku:'NTV-CT-088',quantity:1,room:'Living room',status:'Selected'},
  ],
  activity: [
    {id:'activity-1',projectId:'project-modern-thuduc',actor:'Nguyen Linh',role:'Designer',action:'Submitted v3 for review',target:'Modern Townhouse · Thu Duc',at:'Today 10:05'},
    {id:'activity-2',projectId:'project-modern-thuduc',actor:'Minh Anh',role:'Homeowner',action:'Signed up',target:'Modern Townhouse · Thu Duc',at:'Today 09:40'},
    {id:'activity-3',projectId:'project-modern-thuduc',actor:'Tran Nam',role:'Staff',action:'Created contract',target:'C-2026-014',at:'Today 10:24'},
  ],
  portfolio: [
    {id:'work-1',title:'Warm Japandi townhouse · Thu Duc',type:'Townhouse',style:'Japandi',area:80,year:2026,published:true},
    {id:'work-2',title:'Minimalist kitchen · District 2',type:'Kitchen',style:'Minimalist',area:18,year:2026,published:true},
    {id:'work-3',title:'Cozy living room · Binh Thanh',type:'Living room',style:'Japandi',area:42,year:2025,published:true},
    {id:'work-4',title:'Indochine villa lounge',type:'Villa',style:'Indochine',area:60,year:2025,published:false},
    {id:'work-5',title:'Scandinavian studio',type:'Apartment',style:'Scandinavian',area:35,year:2024,published:true},
    {id:'work-6',title:'Bright home office',type:'Office',style:'Modern',area:18,year:2025,published:true},
  ],
  qualifications: [
    {id:'qualification-1',name:'B.Arch · HCMC University of Architecture',year:'2018'},
    {id:'qualification-2',name:'Interior Design Certificate · Saigon Design Institute',year:'2020'},
    {id:'qualification-3',name:'Autodesk 3ds Max Associate',year:'2024'},
  ],
};

function loadWorkspace(): DemoWorkspace {
  if (typeof window === 'undefined') return initialDemoWorkspace;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialDemoWorkspace;
    const parsed = JSON.parse(saved) as Partial<DemoWorkspace>;
    return {...initialDemoWorkspace,...parsed};
  } catch { return initialDemoWorkspace; }
}

let workspace = loadWorkspace();
const listeners = new Set<() => void>();
let storageListenerAttached = false;

function notify() { listeners.forEach((listener)=>listener()); }
function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  workspace = loadWorkspace();
  notify();
}

export function getDemoWorkspace(): DemoWorkspace { return workspace; }
export function subscribeDemoWorkspace(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== 'undefined' && !storageListenerAttached) {
    window.addEventListener('storage',onStorage);
    window.addEventListener(CHANGE_EVENT,notify);
    storageListenerAttached=true;
  }
  return ()=>listeners.delete(listener);
}
export function updateDemoWorkspace(updater: (current: DemoWorkspace)=>DemoWorkspace): DemoWorkspace {
  workspace = updater(workspace);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY,JSON.stringify(workspace));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  notify();
  return workspace;
}
export function resetDemoWorkspace(): void {
  workspace = initialDemoWorkspace;
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
  notify();
}
export function saveWorkspaceProduct(product: WorkspaceProduct): void {
  updateDemoWorkspace((current)=>({...current,products:current.products.some((item)=>item.sku===product.sku)?current.products.map((item)=>item.sku===product.sku?product:item):[product,...current.products]}));
}
