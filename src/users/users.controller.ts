import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, AuthUser } from '../auth/user.decorator.js';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.usersService.findAll(user.id);
  }

  @Get('search')
  search(@Query('q') query: string, @CurrentUser() user: AuthUser) {
    return this.usersService.search(query || '', user.id);
  }
}
