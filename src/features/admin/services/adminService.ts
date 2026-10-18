import type {
  AdminUser,
  BuildingTypeItem,
  ConstraintRuleItem,
  MaterialFinishItem,
  ProductCategoryItem,
  PromptLibraryItem,
  RecentActivityItem,
  GenerationStatDay,
} from '@/types/admin';

export const INITIAL_ADMIN_USERS: AdminUser[] = [];

export const INITIAL_BUILDING_TYPES: BuildingTypeItem[] = [
  {
    id: 'bt-1',
    name: 'Townhouse (Nha pho)',
    enabled: true,
    statusText: 'Enabled',
  },
  {
    id: 'bt-2',
    name: 'Level-4 house (Nha cap 4)',
    enabled: true,
    statusText: 'Enabled',
  },
  {
    id: 'bt-3',
    name: 'Villa',
    enabled: false,
    statusText: 'Not supported in this version',
  },
  {
    id: 'bt-4',
    name: 'Commercial center',
    enabled: false,
    statusText: 'Not supported in this version',
  },
  {
    id: 'bt-5',
    name: 'Cultural house',
    enabled: false,
    statusText: 'Not supported in this version',
  },
];

export const INITIAL_PRODUCT_CATEGORIES: ProductCategoryItem[] = [
  { id: 'pc-1', name: 'Sofa', count: 12 },
  { id: 'pc-2', name: 'Chair', count: 18 },
  { id: 'pc-3', name: 'Table', count: 22 },
  { id: 'pc-4', name: 'Cabinet', count: 15 },
  { id: 'pc-5', name: 'Storage', count: 11 },
  { id: 'pc-6', name: 'Textile', count: 9 },
  { id: 'pc-7', name: 'Lighting', count: 14 },
];

export const INITIAL_MATERIALS_FINISHES: MaterialFinishItem[] = [
  { id: 'mf-1', name: 'Light oak', category: 'Wood', enabled: true, statusText: 'Used in AI palettes' },
  { id: 'mf-2', name: 'Walnut', category: 'Wood', enabled: true, statusText: 'Used in AI palettes' },
  { id: 'mf-3', name: 'Ash', category: 'Wood', enabled: true, statusText: 'Used in AI palettes' },
  { id: 'mf-4', name: 'Rattan', category: 'Natural fiber', enabled: true, statusText: 'Used in AI palettes' },
  { id: 'mf-5', name: 'Linen', category: 'Fabric', enabled: true, statusText: 'Used in AI palettes' },
  { id: 'mf-6', name: 'Black steel', category: 'Metal', enabled: true, statusText: 'Used in AI palettes' },
  { id: 'mf-7', name: 'Matte white paint', category: 'Paint', enabled: false, statusText: 'Not used by AI' },
];

export const INITIAL_CONSTRAINT_RULES: ConstraintRuleItem[] = [
  {
    id: 'cr-1',
    title: 'Layout',
    description: 'Fixed walls, stairs and wet areas cannot move',
    status: 'Blocks saving',
  },
  {
    id: 'cr-2',
    title: 'Size',
    description: 'Room sizes stay inside the lot boundary',
    status: 'Blocks saving',
  },
  {
    id: 'cr-3',
    title: 'Equipment',
    description: 'Only products that fit the room limits',
    status: 'Warns only',
  },
  {
    id: 'cr-4',
    title: 'Budget',
    description: 'The total estimate stays inside the contract budget range',
    status: 'Warns only',
  },
];

export const INITIAL_PROMPT_LIBRARY: PromptLibraryItem[] = [
  {
    id: 'pl-1',
    title: 'Direction suggestion (free)',
    version: 'v3',
    status: 'Active',
  },
  {
    id: 'pl-2',
    title: 'Concept render (designer)',
    version: 'v5',
    status: 'Active',
  },
  {
    id: 'pl-3',
    title: 'Mood board & palette',
    version: 'v2',
    status: 'Active',
  },
  {
    id: 'pl-4',
    title: 'Cost optimization',
    version: 'v2',
    status: 'Active',
  },
];

export const INITIAL_RECENT_ACTIVITY: RecentActivityItem[] = [
  {
    id: 'act-1',
    title: 'Le Trang accepted the invitation',
    role: 'Designer',
    time: '1 h ago',
  },
  {
    id: 'act-2',
    title: 'Partner account created: Viglacera Tiles',
    role: 'Supplier',
    time: '3 h ago',
  },
  {
    id: 'act-3',
    title: 'Minh Anh signed up',
    role: 'Homeowner',
    time: 'Today',
  },
  {
    id: 'act-4',
    title: 'Pham Duc role changed to Designer',
    role: 'Designer',
    time: 'Yesterday',
  },
];

export const GENERATION_STATS_WEEK: GenerationStatDay[] = [
  { day: 'Mon', count: 42 },
  { day: 'Tue', count: 58 },
  { day: 'Wed', count: 51 },
  { day: 'Thu', count: 76, isHighlight: true },
  { day: 'Fri', count: 64 },
  { day: 'Sat', count: 22 },
  { day: 'Sun', count: 18 },
];

export const adminService = {
  getUsers: async (): Promise<AdminUser[]> => {
    return Promise.resolve([...INITIAL_ADMIN_USERS]);
  },

  updateUser: async (_id: string, updates: Partial<AdminUser>): Promise<Partial<AdminUser>> => {
    return Promise.resolve(updates);
  },

  deactivateUser: async (_id: string): Promise<boolean> => {
    return Promise.resolve(true);
  },

  sendPasswordReset: async (_email: string): Promise<boolean> => {
    return Promise.resolve(true);
  },
};
