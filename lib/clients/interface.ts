export interface TokenGetter {
  getToken(): string
}

export interface AppConfigProvider {
  [propName: string]: any;
}

export interface LocalStorage {
  getItem(key): string

  setItem(key, value)
}

export class InMemoryLocalStorage {
  data: object;

  getItem(key) {
    return this.data[key]
  }

  setItem(key, value) {
    this.data[key] = value;
  }
}

// ---- Permission Operations (bit flags) ----
export enum PermissionOp {
  Peek    = 1,
  Read    = 2,
  Create  = 4,
  Update  = 8,
  Delete  = 16,
  Execute = 32,
  Refer   = 64,
}

// ---- Permission Subjects (bit shift offsets) ----
export enum PermissionSubject {
  Guest = 0,
  Owner = 7,
  Group = 14,
}

// ---- Parsed permission for a single subject ----
export interface SubjectPermissions {
  peek: boolean;
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  execute: boolean;
  refer: boolean;
}

// ---- Full parsed permission ----
export interface ParsedPermission {
  guest: SubjectPermissions;
  owner: SubjectPermissions;
  group: SubjectPermissions;
  raw: number;
}

// ---- Usergroup ----
export interface Usergroup {
  reference_id: string;
  name: string;
  [key: string]: any;
}

// ---- Group member (returned from relationship endpoint) ----
export interface GroupMember {
  reference_id: string;
  relation_reference_id: string;
  [key: string]: any;
}

