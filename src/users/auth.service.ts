import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';
const scrypt = promisify(_scrypt);

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async signup(body: CreateUserDto) {
    const users = await this.usersService.findUsers(body.email);
    if (users.length) {
      throw new BadRequestException('Email in use');
    }

    const salt = randomBytes(8).toString('hex');

    const hash = (await scrypt(body.password, salt, 32)) as Buffer;

    const result = salt + '.' + hash.toString('hex');
    const user = await this.usersService.create(body.email, result, body.name);

    return user;
  }
}
