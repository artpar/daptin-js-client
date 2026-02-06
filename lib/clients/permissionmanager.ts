import axios, {AxiosResponse} from "axios"
import {AppConfigProvider, TokenGetter, Usergroup, GroupMember, ParsedPermission} from "./interface";
import {Permission} from "./permission";

const JUNCTION_TABLE = "user_account_user_account_id_has_usergroup_usergroup_id";

export class PermissionManager {
  appConfig: AppConfigProvider;
  tokenGetter: TokenGetter;
  jsonApi: any;

  constructor(appConfig: AppConfigProvider, tokenGetter: TokenGetter, jsonApi: any) {
    this.appConfig = appConfig;
    this.tokenGetter = tokenGetter;
    this.jsonApi = jsonApi;
  }

  private authHeader(): object {
    return {"Authorization": "Bearer " + this.tokenGetter.getToken()};
  }

  // ──────────────────────────────────────────────
  //  Usergroup CRUD
  // ──────────────────────────────────────────────

  /** List usergroups with optional pagination */
  listUsergroups(page?: number, pageSize?: number): Promise<Usergroup[]> {
    const opts: any = {};
    if (page !== undefined || pageSize !== undefined) {
      opts.page = {number: page || 1, size: pageSize || 10};
    }
    return this.jsonApi.findAll("usergroup", opts).then(function (res) {
      return res.data || res;
    });
  }

  /** Get a single usergroup by reference_id */
  getUsergroup(referenceId: string): Promise<Usergroup> {
    return this.jsonApi.find("usergroup", referenceId).then(function (res) {
      return res.data || res;
    });
  }

  /** Create a new usergroup */
  createUsergroup(name: string): Promise<Usergroup> {
    return this.jsonApi.create("usergroup", {name: name}).then(function (res) {
      return res.data || res;
    });
  }

  /** Update a usergroup's attributes */
  updateUsergroup(referenceId: string, attrs: Partial<Usergroup>): Promise<Usergroup> {
    const payload = Object.assign({}, attrs, {id: referenceId});
    return this.jsonApi.update("usergroup", payload).then(function (res) {
      return res.data || res;
    });
  }

  /** Delete a usergroup */
  deleteUsergroup(referenceId: string): Promise<void> {
    return this.jsonApi.destroy("usergroup", referenceId);
  }

  // ──────────────────────────────────────────────
  //  Group Membership
  // ──────────────────────────────────────────────

  /** Add a user to a usergroup */
  addUserToGroup(userRefId: string, groupRefId: string): Promise<any> {
    const that = this;
    return new Promise(function (resolve, reject) {
      axios({
        url: that.appConfig.getEndpoint() + "/api/" + JUNCTION_TABLE,
        method: "POST",
        headers: Object.assign({"Content-Type": "application/vnd.api+json"}, that.authHeader()),
        data: {
          data: {
            type: JUNCTION_TABLE,
            attributes: {},
            relationships: {
              user_account_id: {
                data: {type: "user_account", id: userRefId}
              },
              usergroup_id: {
                data: {type: "usergroup", id: groupRefId}
              }
            }
          }
        }
      }).then(function (response: AxiosResponse) {
        resolve(response.data);
      }, function (response) {
        reject(response.response ? response.response.data : response);
      });
    });
  }

  /** Remove a user from a usergroup by the join record's reference_id */
  removeUserFromGroup(relationRefId: string): Promise<void> {
    const that = this;
    return new Promise(function (resolve, reject) {
      axios({
        url: that.appConfig.getEndpoint() + "/api/" + JUNCTION_TABLE + "/" + relationRefId,
        method: "DELETE",
        headers: that.authHeader(),
      }).then(function () {
        resolve();
      }, function (response) {
        reject(response.response ? response.response.data : response);
      });
    });
  }

  /** Get all usergroups a user belongs to */
  getUserGroups(userRefId: string): Promise<Usergroup[]> {
    const that = this;
    return new Promise(function (resolve, reject) {
      axios({
        url: that.appConfig.getEndpoint() + "/api/user_account/" + userRefId + "/usergroup_id",
        method: "GET",
        headers: that.authHeader(),
      }).then(function (response: AxiosResponse) {
        const body = response.data;
        resolve(body.data || body);
      }, function (response) {
        reject(response.response ? response.response.data : response);
      });
    });
  }

  /** Get all members of a usergroup */
  getGroupMembers(groupRefId: string): Promise<GroupMember[]> {
    const that = this;
    return new Promise(function (resolve, reject) {
      axios({
        url: that.appConfig.getEndpoint() + "/api/usergroup/" + groupRefId + "/user_account_id",
        method: "GET",
        headers: that.authHeader(),
      }).then(function (response: AxiosResponse) {
        const body = response.data;
        resolve(body.data || body);
      }, function (response) {
        reject(response.response ? response.response.data : response);
      });
    });
  }

  // ──────────────────────────────────────────────
  //  Record Permissions
  // ──────────────────────────────────────────────

  /** Get the parsed permission of a single record */
  getRecordPermission(entityType: string, refId: string): Promise<ParsedPermission> {
    return this.jsonApi.find(entityType, refId).then(function (res) {
      const record = res.data || res;
      const raw = parseInt(record.permission, 10) || 0;
      return Permission.parse(raw);
    });
  }

  /** Set the permission value on a record */
  setRecordPermission(entityType: string, refId: string, permission: number): Promise<void> {
    const that = this;
    return new Promise(function (resolve, reject) {
      axios({
        url: that.appConfig.getEndpoint() + "/api/" + entityType + "/" + refId,
        method: "PATCH",
        headers: Object.assign({"Content-Type": "application/vnd.api+json"}, that.authHeader()),
        data: {
          data: {
            type: entityType,
            id: refId,
            attributes: {
              permission: permission
            }
          }
        }
      }).then(function () {
        resolve();
      }, function (response) {
        reject(response.response ? response.response.data : response);
      });
    });
  }

  // ──────────────────────────────────────────────
  //  Table-Level Permissions
  // ──────────────────────────────────────────────

  /** Get the parsed permission of a table (world record) */
  getTablePermission(tableName: string): Promise<ParsedPermission> {
    const that = this;
    return new Promise(function (resolve, reject) {
      axios({
        url: that.appConfig.getEndpoint() + "/api/world",
        method: "GET",
        headers: that.authHeader(),
        params: {
          query: JSON.stringify([{column: "table_name", operator: "is", value: tableName}])
        }
      }).then(function (response: AxiosResponse) {
        const records = response.data.data;
        if (!records || records.length === 0) {
          reject({message: "Table not found: " + tableName});
          return;
        }
        const raw = parseInt(records[0].attributes.permission, 10) || 0;
        resolve(Permission.parse(raw));
      }, function (response) {
        reject(response.response ? response.response.data : response);
      });
    });
  }

  /** Set the permission value on a table (world record). Requires the world record's reference_id. */
  setTablePermission(worldRefId: string, permission: number): Promise<void> {
    const that = this;
    return new Promise(function (resolve, reject) {
      axios({
        url: that.appConfig.getEndpoint() + "/api/world/" + worldRefId,
        method: "PATCH",
        headers: Object.assign({"Content-Type": "application/vnd.api+json"}, that.authHeader()),
        data: {
          data: {
            type: "world",
            id: worldRefId,
            attributes: {
              permission: permission
            }
          }
        }
      }).then(function () {
        resolve();
      }, function (response) {
        reject(response.response ? response.response.data : response);
      });
    });
  }

  /** Set the permission on a table by table name (looks up the world record automatically) */
  setTablePermissionByName(tableName: string, permission: number): Promise<void> {
    const that = this;
    return new Promise(function (resolve, reject) {
      axios({
        url: that.appConfig.getEndpoint() + "/api/world",
        method: "GET",
        headers: that.authHeader(),
        params: {
          query: JSON.stringify([{column: "table_name", operator: "is", value: tableName}])
        }
      }).then(function (response: AxiosResponse) {
        const records = response.data.data;
        if (!records || records.length === 0) {
          reject({message: "Table not found: " + tableName});
          return;
        }
        const worldRefId = records[0].id;
        that.setTablePermission(worldRefId, permission).then(resolve, reject);
      }, function (response) {
        reject(response.response ? response.response.data : response);
      });
    });
  }

  // ──────────────────────────────────────────────
  //  High-Level: Share with Group
  // ──────────────────────────────────────────────

  /**
   * Share a record with a usergroup, handling both table-level and record-level permissions.
   *
   * This avoids the common "403 even though I set permission" footgun by ensuring
   * the table (world) also grants group access before setting the record permission.
   *
   * @param entityType  The entity/table name (e.g. "blog")
   * @param refId       The record's reference_id
   * @param groupRefId  The usergroup's reference_id
   * @param permission  Permission value to set on the record (default: group read + owner full)
   */
  shareWithGroup(entityType: string, refId: string, groupRefId: string, permission?: number): Promise<void> {
    const that = this;
    const perm = permission !== undefined ? permission : Permission.Presets.OWNER_FULL_GROUP_READ;

    return new Promise(function (resolve, reject) {
      // Step 1: Ensure the table-level (world) permission allows group access
      that.getTablePermission(entityType).then(function (tablePerm: ParsedPermission) {
        const tableNeedsUpdate = !tablePerm.group.read;

        const proceed = tableNeedsUpdate
          ? that.setTablePermissionByName(entityType,
              tablePerm.raw | (Permission.Presets.PUBLIC_READ & (127 << 14))) // add group read to existing
          : Promise.resolve();

        proceed.then(function () {
          // Step 2: Set the record-level permission
          that.setRecordPermission(entityType, refId, perm).then(resolve, reject);
        }, reject);
      }, reject);
    });
  }
}

export default PermissionManager;
