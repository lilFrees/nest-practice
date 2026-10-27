import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Session,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './user.entity';
import { AuthService } from './auth.service';
import { Serialize } from '../interceptors/serialize.interceptor';
import { UserDto } from './dto/user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthGuard } from '../guards/auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { type UserSession } from './user-session';

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

  @Get('/whoami')
  @UseGuards(AuthGuard)
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @Post('/signup')
  async createUser(
    @Body() body: CreateUserDto,
    @Session() session: { userId?: number },
  ) {
    const user = await this.authService.signup(body);
    session.userId = user.id;
    return user;
  }

  @Post('/signin')
  async login(
    @Body() body: LoginUserDto,
    @Session() session: { userId?: number },
  ) {
    const user = await this.authService.signin(body.email, body.password);

    session.userId = user.id;

    return user;
  }

  @Post('/signout')
  signOut(@Session() session: { userId?: number }) {
    session.userId = undefined;
  }

  @Patch('/me')
  @UseGuards(AuthGuard)
  async updateUser(
    @Session() session: { userId: number },
    @Body() attr: UpdateUserDto,
  ) {
    if (attr.password) {
      attr.password = await this.authService.hashPassword(attr.password);
    }

    if (attr.email) {
      const foundUsers = await this.usersService.findUsers(attr.email);

      if (
        foundUsers.length &&
        foundUsers.some((u) => u.id !== session.userId)
      ) {
        throw new BadRequestException('Email already in use');
      }
    }
    return this.usersService.update(session.userId, attr);
  }

  @Get('/:id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.getUser(parseInt(id));
    if (!user) throw new NotFoundException('user not found');
    return user;
  }

  @Delete('/me')
  @UseGuards(AuthGuard)
  async deleteUser(@Session() session: UserSession) {
    const user = this.usersService.remove(session.userId!);
    session.userId = undefined;
    return user;
  }
}
