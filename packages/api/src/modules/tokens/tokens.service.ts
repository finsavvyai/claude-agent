import { Injectable } from '@nestjs/common';

@Injectable()
export class TokensService {
  async getUsage() {
    return { message: 'Tokens service - Coming soon!' };
  }
}
