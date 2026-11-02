/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { agent } from 'supertest';

describe('Authentication System', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('handles a signup request', async () => {
    const email = 'freesberg001@gmail.com';
    const name = 'Frees';

    const res = await agent(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password: 'tssss', name });

    expect(res.body).toMatchObject({ email, name });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('signup as a new user and get currently logged in user', async () => {
    const email = 'test@mail.com';

    const res = await agent(app.getHttpServer()).post('/auth/signup').send({
      email,
      password: 'test',
      name: 'free will',
    });

    const cookie = res.get('Set-Cookie');

    const { body } = await agent(app.getHttpServer())
      .get('/auth/whoami')
      .set('Cookie', cookie as string[])
      .expect(200);

    expect(body?.email).toEqual(email);
  });

  it('PATCH /auth/me changes users email and password', async () => {
    const email1 = 'em1@gmail.com';
    const email2 = 'em2@gmail.com';

    const res = await agent(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: email1, password: 'test', name: 'First' });

    expect(res.status).toEqual(201);
    expect(res.body?.email).toEqual(email1);

    const cookie = res.get('Set-Cookie') as string[];

    const res2 = await agent(app.getHttpServer())
      .patch('/auth/me')
      .send({ email: email2, password: 'NEW_PASSWORD_BITCH' })
      .set('Cookie', cookie);

    expect(res2.status).toEqual(200);
    expect(res2.body?.email).toEqual(email2);
  });

  it('DELETE /auth/me deletes current user', async () => {
    const res = await agent(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'test@gmail.com', password: 'test', name: 'FREES' });

    expect(res.status).toEqual(201);

    const cookie = res.get('Set-Cookie') as string[];

    await agent(app.getHttpServer())
      .delete('/auth/me')
      .set('Cookie', cookie)
      .expect(200);
  });

  it('POST /auth/signin does not work for deleted user', async () => {
    const email = 'test@gmail.com';
    const password = 'test';
    const res = await agent(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password, name: 'FREES' });

    expect(res.status).toEqual(201);

    const cookie = res.get('Set-Cookie') as string[];

    await agent(app.getHttpServer())
      .delete('/auth/me')
      .set('Cookie', cookie)
      .expect(200);

    await agent(app.getHttpServer())
      .post('/auth/signin')
      .send({ email, password })
      .expect(404);
  });
});
