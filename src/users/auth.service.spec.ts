import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let fakeUsersService: Partial<UsersService>;

  beforeEach(async () => {
    const users: User[] = [];
    fakeUsersService = {
      findUsers: (email?: string) =>
        Promise.resolve(
          email ? users.filter((user) => user.email === email) : users,
        ),
      create: (email, password, name) => {
        const user = {
          id: Math.floor(Math.random() * 999999999),
          email,
          password,
          name,
        } as User;
        users.push(user);
        return Promise.resolve(user);
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: fakeUsersService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a new user with hashed and salted password', async () => {
    const user = await service.signup({
      email: 'free@gmal.com',
      name: 'FREESBERG',
      password: 'test',
    });

    const [salt, hash] = user.password.split('.');
    expect(salt).toBeDefined();
    expect(hash).toBeDefined();
  });

  it('throws an error if user signs up with email that is in use', async () => {
    const email = 'test@gmail.com';

    await service.signup({
      email,
      name: 'Test',
      password: 'test123',
    });

    await expect(
      service.signup({ email, name: 'Second user', password: 'eeee' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws an error if user signs in with unused email', async () => {
    await expect(service.signin('ayo@gmail.com', 'test')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws if invalid password is provided', async () => {
    await service.signup({ email: 'aaa@a.com', name: 'aaab', password: 'aa' });
    await expect(service.signin('aaa@a.com', 'asd')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('returns user if correct email and password is provided', async () => {
    const email = 'fake@mail.ru';
    const password = 'fakeShit';

    await service.signup({
      email,
      name: 'fake',
      password,
    });
    const user = await service.signin(email, password);
    expect(user).toBeDefined();
  });
});
