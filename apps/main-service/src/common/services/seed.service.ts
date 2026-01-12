import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { FncRoleService } from '../../fnc-roles/services/fnc-role.service';
import { WarehouseTransitionService } from '../../modules/warehouse-transitions/services/warehouse-transition.service';
import { WarehouseGroupService } from '../../modules/warehouse-groups/services/warehouse-group.service';
import { WarehouseService } from '../../modules/warehouses/services/warehouse.service';
import { UserService } from '../../users/services/user.service';
import { CategoriesService } from '../../modules/categories/services/categories.service';

interface RolePermissionData {
  name: string;
  code: string;
  permissions: string[];
}

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly fncRoleService: FncRoleService,
    private readonly warehouseGroupsService: WarehouseGroupService,
    private readonly warehousesService: WarehouseService,
    private readonly warehouseTransitionsService: WarehouseTransitionService,
    private readonly categoriesService: CategoriesService,
    private readonly usersService: UserService,
  ) { }

  async onModuleInit() {
    await this.seedRolesAndPermissions();
    await this.seedUsers();
    await this.seedCategories();
    await this.seedWarehouseData();
  }

  private async seedRolesAndPermissions() {
    try {
      this.logger.log('Starting to seed roles and permissions...');

      const defaultRoles: RolePermissionData[] = [
        {
          name: 'Super Admin',
          code: 'super_admin',
          permissions: [
            'manage_users',
            'create_user',
            'update_user',
            'delete_user',
            'get_user',
            'list_users',
            'manage_roles',
            'create_role',
            'update_role',
            'delete_role',
            'get_role',
            'list_roles',
            'manage_permissions',
            'manage_tokens',
            'view_system_logs',
            'manage_system_settings',
          ],
        },
        {
          name: 'Admin',
          code: 'admin',
          permissions: [
            'manage_users',
            'create_user',
            'update_user',
            'delete_user',
            'get_user',
            'list_users',
            'get_role',
            'list_roles',
            'manage_tokens',
          ],
        },
        {
          name: 'Editor',
          code: 'editor',
          permissions: [
            'create_user',
            'update_user',
            'get_user',
            'list_users',
            'get_role',
            'list_roles',
          ],
        },
        {
          name: 'Viewer',
          code: 'viewer',
          permissions: [
            'get_user',
            'list_users',
            'get_role',
            'list_roles',
          ],
        },
        {
          name: 'User',
          code: 'user',
          permissions: [
            'get_user',
            'update_own_profile',
            'change_own_password',
          ],
        },
      ];

      for (const roleData of defaultRoles) {
        // Check if role already exists
        const existingRoles = await this.fncRoleService.findAll();
        const existingRole = existingRoles.find((role: any) => role.code === roleData.code);

        if (!existingRole) {
          await this.fncRoleService.create({
            name: roleData.name,
            code: roleData.code,
            permissions: roleData.permissions,
          });
          this.logger.log(`Created role: ${roleData.name} (${roleData.code})`);
        } else {
          this.logger.log(`Role already exists: ${roleData.name} (${roleData.code})`);

          // Update permissions if they have changed
          const hasNewPermissions = roleData.permissions.some(
            permission => !existingRole.permissions.includes(permission)
          );

          if (hasNewPermissions) {
            await this.fncRoleService.update(existingRole.id || existingRole._id?.toString() || '', {
              permissions: roleData.permissions,
            });
            this.logger.log(`Updated permissions for role: ${roleData.name}`);
          }
        }
      }

      this.logger.log('Roles and permissions seeding completed successfully');
    } catch (error) {
      this.logger.error('Failed to seed roles and permissions', error);
    }
  }

  async createDefaultAdminUser() {
    // This method can be used to create a default admin user
    // You can call this from a CLI command or startup script
    try {
      const adminRole = await this.fncRoleService.findAll();
      const superAdminRole = adminRole.find((role: any) => role.code === 'super_admin');

      if (superAdminRole) {
        // Create admin user logic here
        // const adminUser = await this.userService.create({...});
        this.logger.log('Default admin user created');
      }
    } catch (error) {
      this.logger.error('Failed to create default admin user', error);
    }
  }

  // --- LOGIC SEED KHO  ---
  private async seedWarehouseData() {
    try {
      this.logger.log('Starting to seed Warehouse System...');

      // 1. Seed Warehouse Groups
      const groupInternal = await this.ensureGroup('Kho nội bộ', 1);
      const groupExported = await this.ensureGroup('Đã xuất khỏi kho', 2);

      // 2. Seed Warehouses 

      // Kho: PENDING_QC
      const pendingQC = await this.ensureWarehouse({
        name: 'Chờ QC',
        code: 'PENDING_QC',
        groupId: groupInternal._id.toString(),
        orderIndex: 1,
        color: 'blue',
        icon: 'clock-circle',
        config: {
          columns: [
            { key: 'serial', title: 'Số Serial', type: 'text' },
            { key: 'model', title: 'Model', type: 'text' },
            { key: 'importDate', title: 'Ngày nhập', type: 'date' },
            { key: 'importId', title: 'Phiếu nhập', type: 'link' },
          ],
          filters: [
            { key: 'serial', type: 'text', label: 'Tìm Serial' },
            { key: 'model', type: 'text', label: 'Model' },
          ],
          actions: ['scan', 'import_excel'], // Action đặc thù
          quickTransfers: [
            { to: 'READY_TO_EXPORT', label: 'QC Pass', style: 'success' },
            { to: 'DEFECT', label: 'QC Fail', style: 'danger' }
          ]
        }
      });

      // Kho: READY_TO_EXPORT
      const readyExport = await this.ensureWarehouse({
        name: 'Sẵn sàng xuất',
        code: 'READY_TO_EXPORT',
        groupId: groupInternal._id,
        orderIndex: 2,
        color: 'green',
        icon: 'check-circle',
        config: {
          columns: [
            { key: 'serial', title: 'Serial', type: 'text' },
            { key: 'model', title: 'Model', type: 'text' },
            { key: 'qcDate', title: 'Ngày QC', type: 'date' }
          ],
          filters: [],
          actions: ['export_create'],
          quickTransfers: []
        }
      });

      // Kho: DEFECT
      const defect = await this.ensureWarehouse({
        name: 'Lỗi - Chờ BH',
        code: 'DEFECT',
        groupId: groupInternal._id,
        orderIndex: 3,
        color: 'red',
        icon: 'close-circle',
        config: {
          columns: [{ key: 'serial', title: 'Serial', type: 'text' }],
          filters: [],
          actions: ['send_warranty'],
          quickTransfers: []
        }
      });

      // Kho: IN_WARRANTY
      const inWarranty = await this.ensureWarehouse({
        name: 'Đang BH NCC',
        code: 'IN_WARRANTY',
        groupId: groupInternal._id,
        orderIndex: 4,
        color: 'orange',
        icon: 'tool',
        config: {
          columns: [{ key: 'serial', title: 'Serial', type: 'text' }],
          filters: [],
          actions: ['receive_warranty'],
          quickTransfers: []
        }
      });

      // Kho: SOLD
      const sold = await this.ensureWarehouse({
        name: 'Đã xuất - Trong BH',
        code: 'SOLD_WARRANTY',
        groupId: groupExported._id,
        orderIndex: 1,
        color: 'purple',
        icon: 'export',
        config: {
          columns: [
            { key: 'serial', title: 'Serial', type: 'text' },
            { key: 'customer', title: 'Khách hàng', type: 'text' },
            { key: 'exportDate', title: 'Ngày xuất', type: 'date' }
          ],
          filters: [],
          actions: [],
          quickTransfers: []
        }
      });

      // 3. Seed Transitions

      // Rule 1: Import -> Pending QC
      await this.ensureTransition(null, pendingQC._id, 'IMPORT');

      // Rule 2: Pending QC -> Ready (QC Pass)
      await this.ensureTransition(pendingQC._id, readyExport._id, 'QC_PASS');

      // Rule 3: Pending QC -> Defect (QC Fail)
      await this.ensureTransition(pendingQC._id, defect._id, 'QC_FAIL');

      // Rule 4: Ready -> Sold (Export)
      await this.ensureTransition(readyExport._id, sold._id, 'EXPORT');

      // Rule 5: Defect -> In Warranty
      await this.ensureTransition(defect._id, inWarranty._id, 'SEND_WARRANTY');

      this.logger.log('Warehouse System seeding completed!');
    } catch (error) {
      this.logger.error('Failed to seed Warehouse System', error);
    }
  }

  private async ensureGroup(name: string, orderIndex: number) {
    const existing = await this.warehouseGroupsService.findAll();
    const found = existing.find((g: any) => g.name === name);
    if (found) return found;
    return await this.warehouseGroupsService.create({ name, orderIndex, isActive: true });
  }

  private async ensureWarehouse(data: any) {
    const existing = await this.warehousesService.findAll();
    const found = existing.find((w: any) => w.code === data.code);
    if (found) {
      await this.warehousesService.update(found._id.toString(), { config: data.config });
      return found;
    }
    return await this.warehousesService.create({ ...data, isActive: true });
  }

  private async ensureTransition(fromId: any, toId: any, type: string) {
    const all = await this.warehouseTransitionsService.findAll();
    const exists = all.find((t: any) =>
      String(t.fromWarehouseId) === String(fromId) &&
      String(t.toWarehouseId) === String(toId) &&
      t.type === type
    );

    if (!exists) {
      await this.warehouseTransitionsService.create({
        fromWarehouseId: fromId,
        toWarehouseId: toId,
        type,
        allowedRoles: ['super_admin', 'admin', 'editor'],
        isActive: true
      });
    }
  }

  private async seedCategories() {
    try {
      this.logger.log('Seeding Categories...');
      const categories = [
        { name: 'Camera IP', description: 'Camera giám sát mạng' },
        { name: 'Camera Analog', description: 'Camera đi dây đồng trục' },
        { name: 'Đầu ghi hình', description: 'NVR/DVR' },
        { name: 'Ổ cứng', description: 'HDD lưu trữ' },
        { name: 'Phụ kiện', description: 'Nguồn, Jack, Dây cáp' },
      ];

      const existing = await this.categoriesService.findAll();

      for (const cat of categories) {
        // Check theo tên (đơn giản)
        const found = existing.find((e: any) => e.name === cat.name);
        if (!found) {
          await this.categoriesService.create(cat);
          this.logger.log(`Created Category: ${cat.name}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to seed Categories', error);
    }
  }

  // --- 2. SEED NGƯỜI DÙNG MẪU ---
  private async seedUsers() {
    try {
      this.logger.log('Seeding Users...');

      // Lấy Role User mặc định để gán
      const roles = await this.fncRoleService.findAll();
      const userRole = roles.find((r: any) => r.code === 'user');
      const roleId = userRole ? (userRole as any)._id : null;

      const users = [
        {
          email: 'admin@alvar.vn',
          username: 'admin',
          name: 'Administrator',
          password: 'password123',
          role: '696459bd637e972bbbace1fb'
        },
        {
          email: 'kho@alvar.vn',
          username: 'nhanvienkho',
          name: 'Nhân viên Kho',
          password: 'password123',
          role: '696459bd637e972bbbace204'
        },
        {
          email: 'nhap@alvar.vn',
          username: 'user1',
          name: 'Nguyễn Văn Nhập',
          password: 'password123',
          role: '696459bd637e972bbbace20d'
        }
      ];

      const allUsers = await this.usersService.findAll();

      for (const u of users) {
        const exists = allUsers.find((dbUser: any) => dbUser.email === u.email);
        if (!exists) {
          await this.usersService.create(u as any);
          this.logger.log(`Created User: ${u.email}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to seed Users', error);
    }
  }
}
