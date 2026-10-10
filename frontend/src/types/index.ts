export type Role = 'ADMIN' | 'USER' | 'GUEST';

export type HouseholdRole = 'OWNER' | 'MEMBER';

export type HouseholdMembership = {
  householdId: string;
  householdName: string;
  role: HouseholdRole;
};

export type User = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  households: HouseholdMembership[];
  emailVerified: boolean;
  hasProfilePicture: boolean;
};

export type Household = {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
  taskCount: number;
  supplyCount: number;
  shoppingListCount: number;
  calendarEventCount: number;
  fileCount: number;
  storageUsedBytes: number;
  storageLimitBytes: number;
  createdAt: string;
};

export type AdminUser = User & {
  createdAt: string;
};

export type HouseholdMember = {
  userId: string;
  displayName: string;
  email: string;
  role: HouseholdRole;
};

export type HouseholdCreateRequest = {
  name: string;
};

export type HouseholdJoinRequest = {
  inviteCode: string;
};

export type HouseholdDetail = {
  household: Household;
  members: HouseholdMember[];
  tasks: Task[];
  supplies: Supply[];
  shoppingLists: ShoppingList[];
  calendarEvents: CalendarEvent[];
  files: HouseFile[];
};

export type UserDetail = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
  households: HouseholdMembership[];
  assignedTasks: Task[];
};

export type HouseFile = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadedById?: string;
  uploadedByName?: string;
  uploadedAt: string;
  folderId: string | null;
};

export type HouseFolder = {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
};

export type FolderContents = {
  folderId: string | null;
  folders: HouseFolder[];
  files: HouseFile[];
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type Task = {
  id: string;
  title: string;
  done: boolean;
  assignedTo?: string;
  dueDate?: string;
};

export type TaskRequest = {
  title: string;
  done: boolean;
  assignedTo?: string;
  dueDate?: string;
};

export type ShoppingListItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type ShoppingListItemRequest = {
  label: string;
  checked: boolean;
};

export type ShoppingList = {
  id: string;
  name: string;
  items: ShoppingListItem[];
};

export type ShoppingListRequest = {
  name: string;
};

export type Supply = {
  id: string;
  name: string;
  quantity: number;
  expiryDate: string;
};

export type SupplyRequest = {
  name: string;
  quantity: number;
  expiryDate: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
};

export type CalendarEventRequest = {
  title: string;
  start: string;
  end?: string;
};

export type AdminTask = {
  id: string;
  title: string;
  done: boolean;
  dueDate?: string;
  assignedToId?: string;
  assignedToName?: string;
  householdId: string;
  householdName: string;
};

export type AdminSupply = {
  id: string;
  name: string;
  quantity: number;
  expiryDate: string;
  householdId: string;
  householdName: string;
};

export type AdminShoppingList = {
  id: string;
  name: string;
  householdId: string;
  householdName: string;
  items: ShoppingListItem[];
};

export type AdminCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  householdId: string;
  householdName: string;
};

export type FeedbackType = 'BUG' | 'SUGGESTION';

export type FeedbackStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type FeedbackAttachment = {
  id: string;
  contentType: string;
  originalFilename: string;
};

export type FeedbackTicket = {
  id: string;
  type: FeedbackType;
  description: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
  attachments: FeedbackAttachment[];
};

// Kept as its own type (rather than inlining `submitter` on FeedbackTicket) so that if the
// backend's exact submitter field names shift once it lands, only this one type needs to change.
export type AdminFeedbackTicket = FeedbackTicket & {
  submitter: { id: string; email: string; name?: string };
};

export type ChatMessage = {
  id: string;
  householdId: string;
  senderId: string;
  senderDisplayName: string;
  text: string;
  createdAt: string;
};
