import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  create(email: string, password: string, name: string) {
    const user = this.repo.create({ email, name, password });

    return this.repo.save(user);
  }

  findUsers(email?: string) {
    return this.repo.find({ where: email ? { email } : {} });
  }

  getUser(id: number) {
    if (!id) {
      return null;
    }
    return this.repo.findOne({ where: { id } });
  }

  async update(id: number, attr: Partial<User>) {
    const user = await this.repo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User with that id does not exist');
    }

    Object.assign(user, attr);
    return this.repo.save(user);
  }

  async remove(id: number) {
    const user = await this.repo.findOne({ where: { id: id } });
    if (!user) {
      throw new NotFoundException('User with that id does not exist');
    }
    return this.repo.remove(user);
  }
}
