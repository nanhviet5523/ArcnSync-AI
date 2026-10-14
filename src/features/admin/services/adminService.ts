import type {
  AdminUser,
  InviteUserPayload,
  BuildingTypeItem,
  ConstraintRuleItem,
  DesignStyleItem,
  MaterialFinishItem,
  ProductCategoryItem,
  PromptLibraryItem,
  RecentActivityItem,
  GenerationStatDay,
} from '@/types/admin';

export const INITIAL_ADMIN_USERS: AdminUser[] = [
  {
    id: 'usr-001',
    name: 'Minh Anh',
    email: 'minh.anh@gmail.com',
    role: 'Homeowner',
    status: 'Active',
    lastActive: 'Today',
    avatar: 'MA',
    avatarBgColor: 'bg-teal-600',
    permissions: ['View projects', 'Comment designs'],
  },
  {
    id: 'usr-002',
    name: 'Nguyen Linh',
    email: 'linh@archsync.vn',
    role: 'Designer',
    status: 'Active',
    lastActive: 'Today',
    avatar: 'NL',
    avatarBgColor: 'bg-blue-600',
    permissions: [
      'Edit designs & versions',
      'Use the AI design tool',
      'See budget & BOM',
    ],
  },
  {
    id: 'usr-003',
    name: 'Pham Duc',
    email: 'duc@archsync.vn',
    role: 'Designer',
    status: 'Active',
    lastActive: 'Yesterday',
    avatar: 'PD',
    avatarBgColor: 'bg-blue-600',
    permissions: [
      'Edit designs & versions',
      'Use the AI design tool',
      'See budget & BOM',
    ],
  },
  {
    id: 'usr-004',
    name: 'Tran Nam',
    email: 'nam@archsync.vn',
    role: 'Staff',
    status: 'Active',
    lastActive: 'Today',
    avatar: 'TN',
    avatarBgColor: 'bg-purple-600',
    permissions: [
      'Manage requests',
      'Create contracts',
      'Assign designers',
    ],
  },
  {
    id: 'usr-005',
    name: 'Noi That Viet',
    email: 'contact@noithatviet.vn',
    role: 'Supplier',
    status: 'Active',
    lastActive: '2 days ago',
    avatar: 'NV',
    avatarBgColor: 'bg-slate-900',
    permissions: ['Upload catalog', 'Update stock', 'Chat with designers'],
  },
  {
    id: 'usr-006',
    name: 'Sang Lighting',
    email: 'hello@sanglighting.vn',
    role: 'Supplier',
    status: 'Active',
    lastActive: 'Yesterday',
    avatar: 'SL',
    avatarBgColor: 'bg-purple-600',
    permissions: ['Upload catalog', 'Update stock', 'Chat with designers'],
  },
  {
    id: 'usr-007',
    name: 'Le Trang',
    email: 'trang@archsync.vn',
    role: 'Designer',
    status: 'Invited',
    lastActive: '—',
    avatar: 'LT',
    avatarBgColor: 'bg-blue-600',
    permissions: [
      'Edit designs & versions',
      'Use the AI design tool',
      'See budget & BOM',
    ],
  },
  {
    id: 'usr-008',
    name: 'Viglacera Tiles',
    email: 'sales@viglacera-tiles.vn',
    role: 'Supplier',
    status: 'Invited',
    lastActive: '—',
    avatar: 'VT',
    avatarBgColor: 'bg-purple-600',
    permissions: ['Upload catalog', 'Update stock', 'Chat with designers'],
  },
];

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

export const INITIAL_DESIGN_STYLES: string[] = [
  'Japandi',
  'Minimalist',
  'Indochine',
  'Scandinavian',
  'Contemporary',
  'Industrial',
  'Tropical Modern',
];

export const INITIAL_DESIGN_STYLES_ITEMS: DesignStyleItem[] = [
  {
    id: 'ds-1',
    name: 'Japandi',
    description: 'Warm timber, soft neutrals and calm, uncluttered shapes.',
    aiKeywords: 'warm timber, low furniture, paper lantern',
  },
  {
    id: 'ds-2',
    name: 'Minimalist',
    description: 'Clean lines, monochrome tones, maximum function with minimum clutter.',
    aiKeywords: 'clean lines, neutral tones, hidden storage, simple silhouettes',
  },
  {
    id: 'ds-3',
    name: 'Indochine',
    description: 'Blend of French colonial romance and traditional Vietnamese craft.',
    aiKeywords: 'dark wood, rattan, cement tiles, tropical foliage, brass accents',
  },
  {
    id: 'ds-4',
    name: 'Scandinavian',
    description: 'Bright interiors, functional simplicity, cozy textiles and blonde woods.',
    aiKeywords: 'white walls, light pine wood, cozy throws, organic ceramics',
  },
  {
    id: 'ds-5',
    name: 'Contemporary',
    description: 'Current trends with smooth lines, cutting-edge lighting and subtle textures.',
    aiKeywords: 'open spaces, sculptural lighting, mixed metals, textured fabric',
  },
  {
    id: 'ds-6',
    name: 'Industrial',
    description: 'Exposed materials, brickwork, metal beams and raw loft aesthetics.',
    aiKeywords: 'raw concrete, exposed pipes, weathered leather, iron fixtures',
  },
  {
    id: 'ds-7',
    name: 'Tropical Modern',
    description: 'Indoor-outdoor flow, natural airflow, lush greenery and warm earth tones.',
    aiKeywords: 'large glass doors, terracotta, indoor plants, teak wood, woven bamboo',
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

  inviteUser: async (payload: InviteUserPayload): Promise<AdminUser> => {
    const initials = payload.fullName
      .trim()
      .split(/\s+/)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join('');

    const colorMap: Record<string, string> = {
      Designer: 'bg-blue-600',
      Staff: 'bg-purple-600',
      Supplier: 'bg-slate-900',
      Homeowner: 'bg-teal-600',
    };

    const newUser: AdminUser = {
      id: `usr-${Date.now()}`,
      name: payload.fullName,
      email: payload.workEmail,
      role: payload.role,
      status: 'Invited',
      lastActive: '—',
      avatar: initials || 'US',
      avatarBgColor: colorMap[payload.role] || 'bg-blue-600',
      permissions: payload.permissions,
    };

    return Promise.resolve(newUser);
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
