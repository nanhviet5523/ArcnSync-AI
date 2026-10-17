import type { DemoWorkspace, WorkspaceComment, WorkspaceContract, WorkspaceFile, WorkspaceInquiry, WorkspaceMessage, WorkspaceProduct } from '@/types/workspace';
import { saveWorkspaceProduct, updateDemoWorkspace } from '@/services/demoWorkspaceService';

const SIMULATED_LATENCY_MS = 220;

function delay(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, SIMULATED_LATENCY_MS));
}

function nowLabel(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function recordActivity(
  current: DemoWorkspace,
  projectId: string,
  actor: string,
  role: string,
  action: string,
  target: string,
): DemoWorkspace['activity'] {
  return [{ id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, projectId, actor, role, action, target, at: `Today ${nowLabel()}` }, ...current.activity];
}

function systemMessage(projectId: string, text: string): WorkspaceMessage {
  return { id: `message-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, projectId, sender: 'System', senderRole: 'System', text, sentAt: nowLabel(), isSystem: true };
}

export const workspaceApi = {
  async assignDesigner(projectId: string, designer: string, designerEmail: string, actor: string) {
    await delay();
    updateDemoWorkspace((current) => {
      const project = current.projects.find((item) => item.id === projectId);
      if (!project) return current;
      return {
        ...current,
        projects: current.projects.map((item) => item.id === projectId ? { ...item, designer, designerEmail, stage: 'Concept', status: 'Designer assigned', progress: Math.max(item.progress, 30), updatedAt: 'Just now' } : item),
        requests: current.requests.map((request) => request.projectId === projectId && request.status !== 'Signed' ? { ...request, status: 'Designer assigned' } : request),
        messages: [...current.messages, systemMessage(projectId, `Staff assigned ${designer} to this project.`)],
        activity: recordActivity(current, projectId, actor, 'Staff', 'Assigned designer', designer),
      };
    });
  },

  async saveContract(projectId: string, details: Omit<WorkspaceContract, 'id' | 'projectId' | 'updatedAt'>, actor: string) {
    await delay();
    let contractId = '';
    updateDemoWorkspace((current) => {
      const existing = current.contracts.find((contract) => contract.projectId === projectId);
      const nextNumber = Math.max(0, ...current.contracts.map((item) => Number(item.id.split('-').at(-1)) || 0)) + 1;
      contractId = existing?.id ?? `C-2026-${String(nextNumber).padStart(3, '0')}`;
      const contract: WorkspaceContract = { ...details, id: contractId, projectId, updatedAt: `Today, ${nowLabel()}` };
      const project = current.projects.find((item) => item.id === projectId);
      return {
        ...current,
        contracts: existing ? current.contracts.map((item) => item.id === existing.id ? contract : item) : [contract, ...current.contracts],
        requests: current.requests.map((request) => request.projectId === projectId ? { ...request, status: details.status === 'Signed' ? 'Signed' : 'Contract draft' } : request),
        messages: [...current.messages, systemMessage(projectId, details.status === 'Draft' ? `Staff saved contract ${contractId} as a draft.` : `Contract ${contractId} was sent to the homeowner for signature.`)],
        activity: recordActivity(current, projectId, actor, 'Staff', existing ? 'Updated contract' : 'Created contract', project?.name ?? contractId),
      };
    });
    return contractId;
  },

  async updateContractStatus(contractId: string, status: WorkspaceContract['status'], actor: string) {
    await delay();
    updateDemoWorkspace((current) => {
      const contract = current.contracts.find((item) => item.id === contractId);
      if (!contract) return current;
      return {
        ...current,
        contracts: current.contracts.map((item) => item.id === contractId ? { ...item, status, updatedAt: `Today, ${nowLabel()}` } : item),
        requests: current.requests.map((request) => request.projectId === contract.projectId ? { ...request, status: status === 'Signed' ? 'Signed' : 'Contract draft' } : request),
        messages: [...current.messages, systemMessage(contract.projectId, `Contract ${contractId} status changed to ${status}.`)],
        activity: recordActivity(current, contract.projectId, actor, 'Staff', `Contract ${status.toLowerCase()}`, contractId),
      };
    });
  },

  async sendMessage(projectId: string, sender: string, senderRole: string, text: string) {
    await delay();
    let message!: WorkspaceMessage;
    updateDemoWorkspace((current) => {
      const project = current.projects.find((item) => item.id === projectId);
      if (!project) return current;
      message = { id: `message-${Date.now()}`, projectId, sender, senderRole, text, sentAt: nowLabel() };
      return { ...current, messages: [...current.messages, message], activity: recordActivity(current, projectId, sender, senderRole, 'Sent a project message', text.slice(0, 80)) };
    });
    return message;
  },

  async sendSupplierInquiry(inquiry: WorkspaceInquiry, actor: string) {
    await delay();
    updateDemoWorkspace((current) => ({
      ...current,
      inquiries: [inquiry, ...current.inquiries],
      messages: [...current.messages, systemMessage(inquiry.projectId, `Designer asked Supplier about ${inquiry.title}.`)],
      activity: recordActivity(current, inquiry.projectId, actor, 'Designer', 'Sent supplier inquiry', inquiry.title),
    }));
  },

  async toggleProjectProduct(projectId: string, productSku: string, room: string, actor: string) {
    await delay();
    updateDemoWorkspace((current) => {
      const project = current.projects.find((item) => item.id === projectId);
      const product = current.products.find((item) => item.sku === productSku);
      if (!project || !product) return current;
      const exists = project.selectedProductSkus.includes(productSku);
      return {
        ...current,
        projects: current.projects.map((item) => item.id === projectId ? { ...item, selectedProductSkus: exists ? item.selectedProductSkus.filter((sku) => sku !== productSku) : [...item.selectedProductSkus, productSku], updatedAt: 'Just now' } : item),
        selections: exists ? current.selections.filter((item) => !(item.projectId === projectId && item.productSku === productSku)) : [...current.selections, { projectId, productSku, quantity: 1, room, status: 'Selected' as const }],
        activity: recordActivity(current, projectId, actor, 'Designer', exists ? 'Removed product selection' : 'Selected product', product.name),
      };
    });
  },

  async replyToDesignComment(commentId: string, reply: string, projectId: string, actor: string, room: string) {
    await delay();
    updateDemoWorkspace((current) => ({
      ...current,
      comments: current.comments.map((comment) => comment.id === commentId ? { ...comment, reply } : comment),
      messages: [...current.messages, systemMessage(projectId, `${actor} replied to homeowner feedback in ${room}.`)],
      activity: recordActivity(current, projectId, actor, 'Designer', 'Replied to homeowner feedback', room),
    }));
  },

  async updateCommentStatus(commentId: string, projectId: string, status: 'Open' | 'Resolved', actor: string, room: string) {
    await delay();
    updateDemoWorkspace((current) => ({
      ...current,
      comments: current.comments.map((comment) => comment.id === commentId ? { ...comment, status } : comment),
      activity: recordActivity(current, projectId, actor, 'Designer', status === 'Resolved' ? 'Resolved homeowner feedback' : 'Reopened homeowner feedback', room),
    }));
  },

  async saveDesignVersion(projectId: string, actor: string, style: string, notes: string, title = 'Designer update') {
    await delay();
    let versionNumber = 0;
    updateDemoWorkspace((current) => {
      const project = current.projects.find((item) => item.id === projectId);
      if (!project) return current;
      versionNumber = project.currentVersion + 1;
      const versionId = `version-${Date.now()}`;
      return {
        ...current,
        projects: current.projects.map((item) => item.id === projectId ? { ...item, currentVersion: versionNumber, style, updatedAt: 'Just now' } : item),
        versions: [{ id: versionId, projectId, number: versionNumber, title: `${title} v${versionNumber}`, style, createdAt: `Today ${nowLabel()}`, status: 'Draft', notes }, ...current.versions],
        activity: recordActivity(current, projectId, actor, 'Designer', `Saved design version v${versionNumber}`, project.name),
      };
    });
    return versionNumber;
  },

  async saveSupplierProduct(product: WorkspaceProduct, actor: string) {
    await delay();
    saveWorkspaceProduct(product);
    updateDemoWorkspace((current) => ({
      ...current,
      activity: recordActivity(current, '', actor, 'Supplier', 'Updated product catalog', `${product.name} · ${product.sku}`),
    }));
  },

  async uploadProjectFiles(projectId: string, files: Array<Omit<WorkspaceFile, 'id' | 'projectId' | 'uploadedAt'>>, actor: string) {
    await delay();
    updateDemoWorkspace((current) => {
      const project = current.projects.find((item) => item.id === projectId);
      if (!project) return current;
      const uploadedAt = `Today ${nowLabel()}`;
      const newFiles = files.map((file, index) => ({ ...file, id: `file-${Date.now()}-${index}`, projectId, uploadedAt }));
      return {
        ...current,
        files: [...newFiles, ...current.files],
        messages: [...current.messages, systemMessage(projectId, `${actor} uploaded ${newFiles.length} project file(s).`)],
        activity: recordActivity(current, projectId, actor, 'Designer', 'Uploaded project deliverables', newFiles.map((file) => file.name).join(', ')),
      };
    });
  },

  async updateSupplierPricing(updates: Array<{ id: string; price: number; stock: number }>, actor: string) {
    await delay();
    updateDemoWorkspace((current) => ({
      ...current,
      products: current.products.map((product) => {
        const update = updates.find((item) => item.id === product.id);
        return update ? { ...product, price: update.price, stock: update.stock } : product;
      }),
      activity: recordActivity(current, '', actor, 'Supplier', 'Updated product prices and stock', `${updates.length} catalog items`),
    }));
  },

  async submitComment(comment: WorkspaceComment, actor: string, role: string) {
    await delay();
    updateDemoWorkspace((current) => ({
      ...current,
      comments: [comment, ...current.comments],
      activity: recordActivity(current, comment.projectId, actor, role, 'Added design feedback', `${comment.room} · v${comment.version}`),
    }));
  },

  async replyToInquiry(inquiryId: string, reply: string, actor: string) {
    await delay();
    updateDemoWorkspace((current) => {
      const inquiry = current.inquiries.find((item) => item.id === inquiryId);
      if (!inquiry) return current;
      return {
        ...current,
        inquiries: current.inquiries.map((item) => item.id === inquiryId ? { ...item, status: 'Answered', reply } : item),
        messages: [...current.messages, systemMessage(inquiry.projectId, `Supplier answered: ${inquiry.title}.`)],
        activity: recordActivity(current, inquiry.projectId, actor, 'Supplier', 'Replied to supplier inquiry', inquiry.title),
      };
    });
  },

  async moveProjectToReview(projectId: string, actor: string) {
    await delay();
    updateDemoWorkspace((current) => {
      const project = current.projects.find((item) => item.id === projectId);
      if (!project) return current;
      return {
        ...current,
        projects: current.projects.map((item) => item.id === projectId ? { ...item, stage: 'Design review', status: 'In review', progress: Math.max(item.progress, 80), updatedAt: 'Just now' } : item),
        requests: current.requests.map((request) => request.projectId === projectId ? { ...request, status: 'Design review' } : request),
        versions: current.versions.map((version) => version.projectId === projectId && version.number === project.currentVersion ? { ...version, status: 'Sent for review' } : version),
        messages: [...current.messages, systemMessage(projectId, `${actor} submitted version ${project.currentVersion} for homeowner review.`)],
        activity: recordActivity(current, projectId, actor, 'Designer', 'Shared design for homeowner review', project.name),
      };
    });
  },
};

