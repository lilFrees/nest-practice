import { Body, Controller, Get, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('')
  getUsers() {
    return [];
  }

  @Post('')
  async createUser(@Body() body: CreateUserDto) {
    const user = await this.usersService.create(
      body.email,
      body.password,
      body.name,
    );

    return user;
  }
}
