import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

interface DbRow {
  id: number;
}

interface LoginResponse {
  access_token: string;
}

interface ReservationResponse {
  status: string;
}

describe('Reservations (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let resourceId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM reservations');
    await dataSource.query('DELETE FROM resources');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM companies');
    await app.close();
  });

  it('setup — crear company, user, resource y login', async () => {
    const company = await dataSource.query<DbRow[]>(
      `INSERT INTO companies (name) VALUES ('Test Company') RETURNING id`,
    );
    const companyId = company[0].id;

    const password = await bcrypt.hash('password123', 10);
    await dataSource.query(
      `INSERT INTO users (email, password, role, "companyId") VALUES ('test@test.com', '${password}', 'user', ${companyId})`,
    );

    const resource = await dataSource.query<DbRow[]>(
      `INSERT INTO resources (name, status, location, type, "companyId") VALUES ('Sala Test', 'AVAILABLE', 'Planta 1', 'meeting_room', ${companyId}) RETURNING id`,
    );
    resourceId = resource[0].id;

    const res: Response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'password123' });

    accessToken = (res.body as LoginResponse).access_token;
    expect(accessToken).toBeDefined();
  });

  it('POST /reservations — crea reserva correctamente', async () => {
    const res: Response = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        resourceId,
        startTime: '2026-05-01T09:00:00.000Z',
        endTime: '2026-05-01T11:00:00.000Z',
      });

    expect(res.status).toBe(201);
    expect((res.body as ReservationResponse).status).toBe('CONFIRMED');
  });

  it('POST /reservations — rechaza reserva solapada', async () => {
    const res: Response = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        resourceId,
        startTime: '2026-05-01T10:00:00.000Z',
        endTime: '2026-05-01T12:00:00.000Z',
      });

    expect(res.status).toBe(400);
  });

  it('POST /reservations — acepta reserva no solapada', async () => {
    const res: Response = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        resourceId,
        startTime: '2026-05-01T11:00:00.000Z',
        endTime: '2026-05-01T13:00:00.000Z',
      });

    expect(res.status).toBe(201);
  });
});
