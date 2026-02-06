import {PermissionOp, PermissionSubject, SubjectPermissions, ParsedPermission} from "./interface";

const SUBJECT_MASK = 127; // 7 bits = 0b1111111

function parseSubject(value: number, shift: number): SubjectPermissions {
  const bits = (value >> shift) & SUBJECT_MASK;
  return {
    peek: (bits & PermissionOp.Peek) !== 0,
    read: (bits & PermissionOp.Read) !== 0,
    create: (bits & PermissionOp.Create) !== 0,
    update: (bits & PermissionOp.Update) !== 0,
    delete: (bits & PermissionOp.Delete) !== 0,
    execute: (bits & PermissionOp.Execute) !== 0,
    refer: (bits & PermissionOp.Refer) !== 0,
  };
}

function describeSubject(sp: SubjectPermissions): string {
  const ops: string[] = [];
  if (sp.peek) ops.push("peek");
  if (sp.read) ops.push("read");
  if (sp.create) ops.push("create");
  if (sp.update) ops.push("update");
  if (sp.delete) ops.push("delete");
  if (sp.execute) ops.push("execute");
  if (sp.refer) ops.push("refer");
  return ops.length > 0 ? ops.join(",") : "none";
}

// ---- Fluent Builder ----

export class PermissionBuilder {
  private guest: number = 0;
  private owner: number = 0;
  private group: number = 0;

  forGuest(ops: number): PermissionBuilder {
    this.guest = ops & SUBJECT_MASK;
    return this;
  }

  forOwner(ops: number): PermissionBuilder {
    this.owner = ops & SUBJECT_MASK;
    return this;
  }

  forGroup(ops: number): PermissionBuilder {
    this.group = ops & SUBJECT_MASK;
    return this;
  }

  get value(): number {
    return (this.guest) | (this.owner << PermissionSubject.Owner) | (this.group << PermissionSubject.Group);
  }
}

// ---- Static Permission namespace ----

export const Permission = {

  /** Start building a permission value with the fluent API */
  build(): PermissionBuilder {
    return new PermissionBuilder();
  },

  /** Compose a permission integer from three subject bitmasks (0-127 each) */
  combine(guest: number, owner: number, group: number): number {
    return (guest & SUBJECT_MASK)
      | ((owner & SUBJECT_MASK) << PermissionSubject.Owner)
      | ((group & SUBJECT_MASK) << PermissionSubject.Group);
  },

  /** Parse a permission integer into a human-readable object */
  parse(value: number): ParsedPermission {
    return {
      guest: parseSubject(value, PermissionSubject.Guest),
      owner: parseSubject(value, PermissionSubject.Owner),
      group: parseSubject(value, PermissionSubject.Group),
      raw: value,
    };
  },

  /** Check if a permission value grants a specific operation to a subject */
  can(value: number, subject: PermissionSubject, op: PermissionOp): boolean {
    return ((value >> subject) & op) !== 0;
  },

  /** Get a human-readable description of a permission value */
  describe(value: number): string {
    const p = Permission.parse(value);
    return "Guest: " + describeSubject(p.guest)
      + " | Owner: " + describeSubject(p.owner)
      + " | Group: " + describeSubject(p.group);
  },

  /** Common permission presets */
  Presets: {
    /** No access for anyone */
    NONE: 0,
    /** Owner: all 7 ops. Group: none. Guest: none. */
    OWNER_FULL: 127 << PermissionSubject.Owner,                       // 16256
    /** Read for everyone (guest + owner + group) */
    PUBLIC_READ: PermissionOp.Read
      | (PermissionOp.Read << PermissionSubject.Owner)
      | (PermissionOp.Read << PermissionSubject.Group),               // 33026
    /** Default: owner/group read, guest peek */
    DEFAULT: PermissionOp.Peek
      | ((PermissionOp.Peek | PermissionOp.Read) << PermissionSubject.Owner)
      | ((PermissionOp.Peek | PermissionOp.Read) << PermissionSubject.Group), // 49537
    /** Full access for everyone */
    UNIVERSAL: SUBJECT_MASK
      | (SUBJECT_MASK << PermissionSubject.Owner)
      | (SUBJECT_MASK << PermissionSubject.Group),                    // 2097151
    /** Owner full, group read, guest peek */
    OWNER_FULL_GROUP_READ: PermissionOp.Peek
      | (SUBJECT_MASK << PermissionSubject.Owner)
      | (PermissionOp.Read << PermissionSubject.Group),               // 49025
  },
};

export default Permission;
