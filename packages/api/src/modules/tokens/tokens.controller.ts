import { Controller } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('tokens')
@Controller('tokens')
export class TokensController {
  @Get()
  @ApiOperation({ summary: 'Get token usage' })
  @ApiResponse({ status: 200, description: 'Token usage retrieved successfully' })
  async getUsage() {
    return { message: 'Tokens module - Coming soon!' };
  }
}
