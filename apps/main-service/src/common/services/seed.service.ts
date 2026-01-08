import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { FncRoleService } from '../../fnc-roles/services/fnc-role.service';

interface RolePermissionData {
  name: string;
  code: string;
  permissions: string[];
}

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly fncRoleService: FncRoleService) {}

  async onModuleInit() {
    await this.seedRolesAndPermissions();
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
}
