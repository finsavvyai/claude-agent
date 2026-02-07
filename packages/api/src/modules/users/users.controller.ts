import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@claude-agent/database';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @Roles('ADMIN')
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users (paginated)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @Roles('ADMIN')
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('email') email?: string,
    @Query('name') name?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
    @Query('orderBy') orderBy?: 'name' | 'createdAt',
    @Query('orderDirection') orderDirection?: 'asc' | 'desc',
  ) {
    const params = {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      where: {
        email,
        name,
        role: role as any,
        isActive: isActive ? isActive === 'true' : undefined,
      },
      orderBy: orderBy ? { [orderBy]: orderDirection || 'desc' } : undefined,
    };

    return this.usersService.findAll(params);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users by name, email, or bio' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @Roles('ADMIN')
  async search(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ): Promise<User[]> {
    return this.usersService.search(query, limit ? parseInt(limit, 10) : undefined);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'User statistics' })
  @Roles('ADMIN')
  async getStats() {
    return this.usersService.getStats();
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@CurrentUser() user: User): Promise<User> {
    return user;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Roles('ADMIN')
  async findOne(@Param('id') id: string): Promise<User | null> {
    return this.usersService.findOne(id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(user.id, updateUserDto);
  }

  @Patch('change-password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    await this.usersService.changePassword(
      user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate user account' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string): Promise<void> {
    await this.usersService.activate(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate user account' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id') id: string): Promise<void> {
    await this.usersService.deactivate(id);
  }

  @Patch(':id/verify-email')
  @ApiOperation({ summary: 'Verify user email' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Param('id') id: string): Promise<void> {
    await this.usersService.verifyEmail(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}
