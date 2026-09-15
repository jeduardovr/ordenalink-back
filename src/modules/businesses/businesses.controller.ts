import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';

@Controller('businesses')
export class BusinessesController {
  constructor(
    private readonly businessesService: BusinessesService,
  ) {}

  @Post()
  create(@Body() createBusinessDto: CreateBusinessDto) {
    return this.businessesService.create(createBusinessDto);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.businessesService.findBySlug(slug);
  }
}