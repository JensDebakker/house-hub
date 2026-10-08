export type User = {
  id: string;
  email: string;
  displayName: string;
  householdId: string;
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

export type ShoppingListItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type ShoppingList = {
  id: string;
  name: string;
  items: ShoppingListItem[];
};

export type Supply = {
  id: string;
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
