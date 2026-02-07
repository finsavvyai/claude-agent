import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly prisma: PrismaClient;

  constructor(private readonly configService: ConfigService) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.configService.get('database.url'),
        },
      },
    });
  }

  async create(createUserDto: {
    email: string;
    name: string;
    password: string;
    role?: UserRole;
    bio?: string;
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: {
        email: createUserDto.email.toLowerCase(),
        name: createUserDto.name,
        password: hashedPassword,
        role: createUserDto.role || UserRole.DEVELOPER,
        bio: createUserDto.bio,
        isActive: true,
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        bio: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: {
      email?: string;
      name?: string;
      role?: UserRole;
      isActive?: boolean;
    };
    orderBy?: {
      name?: 'asc' | 'desc';
      createdAt?: 'asc' | 'desc';
    };
  }): Promise<{ users: User[]; total: number }> {
    const { skip = 0, take = 20, where, orderBy = { createdAt: 'desc' } } = params || {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        where: {
          ...where,
          email: where?.email?.toLowerCase(),
        },
        orderBy,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          bio: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async findOne(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        bio: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async update(id: string, updateUserDto: {
    name?: string;
    role?: UserRole;
    bio?: string;
  }): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        bio: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { password: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashedNewPassword },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async activate(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async deactivate(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async verifyEmail(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { emailVerified: true },
    });
  }

  async search(query: string, limit: number = 10): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { bio: { contains: query, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        bio: true,
        createdAt: true,
      },
    });
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<UserRole, number>;
  }> {
    const [total, active, inactive, byRole] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
    ]);

    const roleStats = byRole.reduce((acc, item) => {
      acc[item.role] = item._count;
      return acc;
    }, {} as Record<UserRole, number>);

    return {
      total,
      active,
      inactive,
      byRole: roleStats,
    };
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
