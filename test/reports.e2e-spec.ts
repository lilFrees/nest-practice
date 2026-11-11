/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

const baseReport = {
  make: 'toyota',
  model: 'corolla',
  year: 2018,
  mileage: 50_000,
  lat: 41.3,
  lng: 69.2,
  price: 12_000,
};

describe('Reports (e2e)', () => {
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

  /** Signs up a new user and returns an agent that keeps the session cookie. */
  const signedInAgent = async (email: string) => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/signup')
      .send({ email, password: 'password', name: 'Tester' })
      .expect(201);
    return agent;
  };

  /** There is no endpoint to promote a user, so flip the flag in the DB. */
  const signedInAdmin = async (email: string) => {
    const agent = await signedInAgent(email);
    await app
      .get(DataSource)
      .query('UPDATE user SET admin = 1 WHERE email = ?', [email]);
    return agent;
  };

  const createReport = async (
    agent: TestAgent,
    overrides: Partial<typeof baseReport> = {},
  ) => {
    const res = await agent
      .post('/reports')
      .send({ ...baseReport, ...overrides })
      .expect(201);
    return res.body as { id: number };
  };

  describe('POST /reports', () => {
    it('rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/reports')
        .send(baseReport)
        .expect(403);
    });

    it('creates a report and returns the serialized report', async () => {
      const agent = await signedInAgent('user@test.com');
      const { body: me } = await agent.get('/auth/whoami').expect(200);

      const { body } = await agent
        .post('/reports')
        .send(baseReport)
        .expect(201);

      expect(body).toMatchObject({
        ...baseReport,
        approved: false,
        userId: me.id,
      });
      expect(body).toHaveProperty('id');
      expect(body).not.toHaveProperty('user');
    });

    it('ignores an "approved" flag sent by the user', async () => {
      const agent = await signedInAgent('user@test.com');

      const { body } = await agent
        .post('/reports')
        .send({ ...baseReport, approved: true })
        .expect(201);

      expect(body.approved).toBe(false);
    });

    it.each([
      ['missing make', { make: undefined }],
      ['year too old', { year: 1900 }],
      ['year in the future', { year: new Date().getFullYear() + 1 }],
      ['negative mileage', { mileage: -1 }],
      ['mileage too high', { mileage: 1_000_001 }],
      ['invalid latitude', { lat: 91 }],
      ['invalid longitude', { lng: 181 }],
      ['negative price', { price: -5 }],
      ['price as string', { price: 'cheap' }],
    ])('returns 400 for %s', async (_label, overrides) => {
      const agent = await signedInAgent('user@test.com');

      await agent
        .post('/reports')
        .send({ ...baseReport, ...overrides })
        .expect(400);
    });
  });

  describe('PATCH /reports/:id', () => {
    it('rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .patch('/reports/1')
        .send({ approved: true })
        .expect(403);
    });

    it('rejects non-admin users', async () => {
      const agent = await signedInAgent('user@test.com');
      const report = await createReport(agent);

      await agent
        .patch(`/reports/${report.id}`)
        .send({ approved: true })
        .expect(403);
    });

    it('lets an admin approve a report', async () => {
      const user = await signedInAgent('user@test.com');
      const report = await createReport(user);
      const admin = await signedInAdmin('admin@test.com');

      const { body } = await admin
        .patch(`/reports/${report.id}`)
        .send({ approved: true })
        .expect(200);

      expect(body).toMatchObject({ id: report.id, approved: true });
    });

    it('lets an admin un-approve a report', async () => {
      const admin = await signedInAdmin('admin@test.com');
      const report = await createReport(admin);

      await admin
        .patch(`/reports/${report.id}`)
        .send({ approved: true })
        .expect(200);
      const { body } = await admin
        .patch(`/reports/${report.id}`)
        .send({ approved: false })
        .expect(200);

      expect(body.approved).toBe(false);
    });

    it('returns 404 for a report that does not exist', async () => {
      const admin = await signedInAdmin('admin@test.com');

      await admin.patch('/reports/9999').send({ approved: true }).expect(404);
    });

    it('returns 400 if approved is not a boolean', async () => {
      const admin = await signedInAdmin('admin@test.com');
      const report = await createReport(admin);

      await admin
        .patch(`/reports/${report.id}`)
        .send({ approved: 'yes' })
        .expect(400);
    });
  });

  describe('GET /reports (estimate)', () => {
    const estimateQuery = {
      make: 'toyota',
      model: 'corolla',
      year: 2018,
      mileage: 50_000,
      lat: 41.3,
      lng: 69.2,
    };

    it('rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/reports')
        .query(estimateQuery)
        .expect(403);
    });

    it('returns 400 for an invalid query', async () => {
      const agent = await signedInAgent('user@test.com');

      await agent
        .get('/reports')
        .query({ ...estimateQuery, make: undefined })
        .expect(400);
      await agent
        .get('/reports')
        .query({ ...estimateQuery, lat: 200 })
        .expect(400);
    });

    it('returns a null price when there are no matching reports', async () => {
      const agent = await signedInAgent('user@test.com');

      const { body } = await agent
        .get('/reports')
        .query(estimateQuery)
        .expect(200);

      expect(body.price).toBeNull();
    });

    it('ignores reports that are not approved', async () => {
      const agent = await signedInAgent('user@test.com');
      await createReport(agent);

      const { body } = await agent
        .get('/reports')
        .query(estimateQuery)
        .expect(200);

      expect(body.price).toBeNull();
    });

    it('averages the price of approved, similar reports only', async () => {
      const admin = await signedInAdmin('admin@test.com');
      const approve = (id: number) =>
        admin.patch(`/reports/${id}`).send({ approved: true }).expect(200);

      // similar + approved -> counted
      const similar = [
        await createReport(admin, { price: 10_000 }),
        await createReport(admin, { price: 20_000, year: 2016, lat: 43 }),
        await createReport(admin, { price: 30_000, year: 2020, lng: 66 }),
      ];
      // approved but not similar -> ignored
      const notSimilar = [
        await createReport(admin, { price: 999_000, make: 'honda' }),
        await createReport(admin, { price: 999_000, model: 'camry' }),
        await createReport(admin, { price: 999_000, year: 2010 }),
        await createReport(admin, { price: 999_000, lat: 30 }),
        await createReport(admin, { price: 999_000, lng: 80 }),
      ];
      // similar but not approved -> ignored
      await createReport(admin, { price: 999_000 });

      for (const r of [...similar, ...notSimilar]) await approve(r.id);

      const { body } = await admin
        .get('/reports')
        .query(estimateQuery)
        .expect(200);

      expect(body.price).toBe(20_000);
    });
  });
});
