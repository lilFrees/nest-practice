import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './user.entity';
import { AuthService } from './auth.service';
import { Serialize } from '../interceptors/serialize.interceptor';
import { UserDto } from './dto/user.dto';

@Controller('auth')
@Serialize(UserDto)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  @Get('/find')
  findAllUsers(@Query('email') email?: string) {
    return this.usersService.findUsers(email);
  }

  @Post('/signup')
  async createUser(@Body() body: CreateUserDto) {
    const user = await this.authService.signup(body);
    return user;
  }

  @Patch('/:id')
  async updateUser(@Param('id') id: string, @Body() attr: Partial<User>) {
    return this.usersService.update(id, attr);
  }

  @Get('/:id')
  async getUser(@Param('id') id: string) {
    return this.usersService.getUser(parseInt(id));
  }

  @Delete('/:id')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
