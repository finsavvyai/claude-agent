import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectsService {
  async findAll() {
    return { message: 'Projects service - Coming soon!' };
  }
}
