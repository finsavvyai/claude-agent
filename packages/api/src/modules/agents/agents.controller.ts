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
import { AgentsService } from './agents.service';
import {
  CreateAgentDto,
  UpdateAgentDto,
  AgentQueryDto,
  StartAgentDto
} from './dto/agent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('agents')
@Controller('agents')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new agent' })
  @ApiResponse({ status: 201, description: 'Agent created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Agent already exists' })
  @Roles('ADMIN', 'DEVELOPER')
  async create(@Body() createAgentDto: CreateAgentDto) {
    return this.agentsService.create(createAgentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all agents with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Agents retrieved successfully' })
  async findAll(@Query() query: AgentQueryDto) {
    return this.agentsService.findAll(query);
  }

  @Get('types')
  @ApiOperation({ summary: 'Get all available agent types' })
  @ApiResponse({ status: 200, description: 'Agent types retrieved successfully' })
  async getTypes() {
    return this.agentsService.getAgentTypes();
  }

  @Get('capabilities')
  @ApiOperation({ summary: 'Get all available agent capabilities' })
  @ApiResponse({ status: 200, description: 'Agent capabilities retrieved successfully' })
  async getCapabilities() {
    return this.agentsService.getAgentCapabilities();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get agent statistics' })
  @ApiResponse({ status: 200, description: 'Agent statistics retrieved successfully' })
  @Roles('ADMIN')
  async getStats() {
    return this.agentsService.getStats();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get health status of all agents' })
  @ApiResponse({ status: 200, description: 'Health statuses retrieved successfully' })
  async getAllHealthStatuses() {
    return this.agentsService.getAllHealthStatuses();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent by ID' })
  @ApiResponse({ status: 200, description: 'Agent retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Get health status of a specific agent' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getHealthStatus(@Param('id') id: string) {
    return this.agentsService.getHealthStatus(id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start an agent' })
  @ApiResponse({ status: 200, description: 'Agent started successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 409, description: 'Agent already running or unhealthy' })
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'DEVELOPER')
  async start(
    @Param('id') id: string,
    @Body() options?: StartAgentDto,
  ) {
    return this.agentsService.start(id, options);
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop an agent' })
  @ApiResponse({ status: 200, description: 'Agent stopped successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 409, description: 'Agent not running' })
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'DEVELOPER')
  async stop(@Param('id') id: string) {
    return this.agentsService.stop(id);
  }

  @Post(':id/restart')
  @ApiOperation({ summary: 'Restart an agent' })
  @ApiResponse({ status: 200, description: 'Agent restarted successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @Roles('ADMIN', 'DEVELOPER')
  async restart(@Param('id') id: string) {
    return this.agentsService.restart(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update agent by ID' })
  @ApiResponse({ status: 200, description: 'Agent updated successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @Roles('ADMIN', 'DEVELOPER')
  async update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
  ) {
    return this.agentsService.update(id, updateAgentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete agent by ID' })
  @ApiResponse({ status: 200, description: 'Agent deleted successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.agentsService.remove(id);
  }
}
