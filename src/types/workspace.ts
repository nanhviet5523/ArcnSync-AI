export type ProjectStage = 'Requirements' | 'Concept' | 'Product selection' | 'Design review' | 'Handover';
export type WorkspaceInquiryStatus = 'New' | 'Open' | 'Answered';

export interface WorkspaceProject {
  id: string;
  name: string;
  homeowner: string;
  homeownerEmail: string;
  designer: string;
  designerEmail: string;
  staff: string;
  stage: ProjectStage;
  status: string;
  progress: number;
  currentRound: number;
  totalRounds: number;
  dueDate: string;
  style: string;
  buildingType: string;
  area: number;
  floors: number;
  budgetMin: number;
  budgetMax: number;
  brief: string;
  selectedProductSkus: string[];
  currentVersion: number;
  updatedAt: string;
  constraints: { id: string; type: 'Layout' | 'Size' | 'Equipment' | 'Budget'; rule: string; source: string; locked: boolean }[];
}

export interface WorkspaceProduct {
  id: string;
  name: string;
  sku: string;
  supplier: string;
  category: string;
  width: string;
  depth: string;
  height: string;
  price: number;
  stock: number;
  leadTime: number;
  material: string;
  description: string;
  model?: string;
  style: string;
}

export interface WorkspaceComment {
  id: string;
  projectId: string;
  room: string;
  version: number;
  type: 'Change request' | 'Question' | 'Note';
  text: string;
  createdAt: string;
  status: 'Open' | 'Resolved';
  reply?: string;
  task?: boolean;
}

export interface WorkspaceInquiry {
  id: string;
  projectId: string;
  productSku?: string;
  title: string;
  from: string;
  fromEmail: string;
  time: string;
  status: WorkspaceInquiryStatus;
  body: string;
  facts: [string, string][];
  reply?: string;
}

export interface WorkspaceVersion {
  id: string;
  projectId: string;
  number: number;
  title: string;
  style: string;
  createdAt: string;
  status: string;
  notes: string;
}

export interface WorkspaceFile {
  id: string;
  projectId: string;
  name: string;
  type: 'Homeowner upload' | 'Design' | 'Contract';
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  visibility: 'Team' | 'Homeowner';
}

export interface WorkspaceSelection {
  projectId: string;
  productSku: string;
  quantity: number;
  room: string;
  status: 'Selected' | 'Quoted' | 'Ordered' | 'Delivered';
}

export interface DemoWorkspace {
  projects: WorkspaceProject[];
  products: WorkspaceProduct[];
  comments: WorkspaceComment[];
  inquiries: WorkspaceInquiry[];
  versions: WorkspaceVersion[];
  files: WorkspaceFile[];
  selections: WorkspaceSelection[];
  activity: { id: string; projectId?: string; actor: string; role: string; action: string; target: string; at: string }[];
  portfolio: { id: string; title: string; type: string; style: string; area: number; year: number; published: boolean }[];
  qualifications: { id: string; name: string; year: string }[];
}
