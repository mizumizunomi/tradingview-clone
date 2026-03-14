import { Controller, Get, Param, Query } from '@nestjs/common';
import { AssetsService } from './assets.service';

@Controller('assets')
export class AssetsController {
  constructor(private assetsService: AssetsService) {}

  @Get()
  findAll(@Query('category') category?: string) {
    return this.assetsService.findAll(category);
  }

  @Get('search')
  search(@Query('q') q: string, @Query('category') category?: string) {
    return this.assetsService.search(q || '', category);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }
}
