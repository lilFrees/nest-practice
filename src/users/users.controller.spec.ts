import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { User } from './user.entity';
import { NotFoundException } from '@nestjs/common';
import { UserSession } from './user-session';

describe('UsersController', () => {
  let controller: UsersController;
  let fakeUsersService: Partial<UsersService>;
  let fakeAuthService: Partial<AuthService>;

  beforeEach(async () => {
    fakeUsersService = {
      getUser: (id) =>
        Promise.resolve({
          id,
          name: 'Miles',
          email: 'x@gmail.com',
          password: 'x',
        } as User),
      findUsers: (email?: string) =>
        Promise.resolve([
          { id: 1, email, name: 'TestName', password: 'x' } as User,
        ]),
    };
    fakeAuthService = {
      signin: (email: string, password) =>
        Promise.resolve({ id: 1, email, password, name: 'Miles' } as User),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: fakeUsersService },
        { provide: AuthService, useValue: fakeAuthService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAllUsers returns a list of users with the given email', async () => {
    const users = await controller.findAllUsers('x@gmail.com');
    expect(users.length).toEqual(1);
    expect(users[0].email).toEqual('x@gmail.com');
  });

  it('getUser returns the user with the given id', async () => {
    const user = await controller.getUser('1');
    expect(user.id).toEqual(1);
  });

  it('getUser throws if user with given id is not found', async () => {
    fakeUsersService.getUser = () => Promise.resolve(null);
    await expect(controller.getUser('1')).rejects.toThrow(NotFoundException);
  });

  it('login sets the user session with userId', async () => {
    const session: UserSession = {};

    await controller.login(
      { email: 'test@mail.ru', password: 'test' },
      session,
    );

    expect(session).toHaveProperty('userId');
  });
});
