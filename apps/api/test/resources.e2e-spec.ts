// test/resources.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

interface AuthResponse {
  access_token: string;
}

interface ResourceResponse {
  id: number;
  name: string;
  status: string;
}

interface PaginatedResponse {
  data: ResourceResponse[];
  total: number;
}

describe('Resources (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let userToken: string;
  let companyId: number;
  let resourceId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    dataSource = moduleFixture.get(DataSource);

    const company = await dataSource.query<{ id: number }[]>(
      `INSERT INTO companies (name) VALUES ('Resources Test Company') RETURNING id`,
    );
    companyId = company[0].id;

const hashedPassword = await bcrypt.hash('password123', 10);
await dataSource.query(
  `INSERT INTO users (email, password, role, "companyId") VALUES ('admin@resourcestest.com', '${hashedPassword}', 'company_admin', ${companyId})`,
);
    const adminRes: Response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@resourcestest.com', password: 'password123' });
    adminToken = (adminRes.body as AuthResponse).access_token;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'user@resourcestest.com', password: 'password123' });
    const userRes: Response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@resourcestest.com', password: 'password123' });
    userToken = (userRes.body as AuthResponse).access_token;
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM resources WHERE "companyId" = ${companyId}`);
    await dataSource.query(`DELETE FROM users WHERE email LIKE '%resourcestest.com'`);
    await dataSource.query(`DELETE FROM companies WHERE id = ${companyId}`);
    await app.close();
  });

  it('POST /resources — admin crea recurso correctamente', async () => {
    const res: Response = await request(app.getHttpServer())
      .post('/resources')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Sala Test',
        status: 'AVAILABLE',
        location: 'Planta 1',
        type: 'meeting_room',
      });

    expect(res.status).toBe(201);
    resourceId = (res.body as ResourceResponse).id;
  });

  it('POST /resources — user normal recibe 403', async () => {
    const res: Response = await request(app.getHttpServer())
      .post('/resources')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Sala Test 2',
        status: 'AVAILABLE',
        location: 'Planta 1',
        type: 'meeting_room',
      });

    expect(res.status).toBe(403);
  });

  it('GET /resources — lista recursos públicamente', async () => {
    const res: Response = await request(app.getHttpServer()).get('/resources');
    console.log(res.body);
    expect(res.status).toBe(200);
    expect((res.body as PaginatedResponse).data).toBeDefined();
  });

  it('GET /resources/:id — devuelve recurso por id', async () => {
    const res: Response = await request(app.getHttpServer()).get(
      `/resources/${resourceId}`,
    );
    expect(res.status).toBe(200);
    expect((res.body as ResourceResponse).id).toBe(resourceId);
  });

  it('PATCH /resources/:id — admin actualiza recurso', async () => {
    const res: Response = await request(app.getHttpServer())
      .patch(`/resources/${resourceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Sala Test Actualizada' });

    expect(res.status).toBe(200);
  });

  it('DELETE /resources/:id — admin elimina recurso', async () => {
    const res: Response = await request(app.getHttpServer())
      .delete(`/resources/${resourceId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});