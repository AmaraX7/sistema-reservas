// test/companies.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

interface AuthResponse {
  access_token: string;
}

interface CompanyResponse {
  id: number;
  name: string;
}

describe('Companies (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let superAdminToken: string;
  let userToken: string;
  let companyId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    dataSource = moduleFixture.get(DataSource);

    const hashedPassword = await bcrypt.hash('password123', 10);
    await dataSource.query(
    `INSERT INTO users (email, password, role) VALUES ('superadmin@companiestest.com', '${hashedPassword}', 'super_admin')`,
    );

    const superRes: Response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'superadmin@companiestest.com', password: 'password123' });
    superAdminToken = (superRes.body as AuthResponse).access_token;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'user@companiestest.com', password: 'password123' });
    const userRes: Response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@companiestest.com', password: 'password123' });
    userToken = (userRes.body as AuthResponse).access_token;
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM users WHERE email LIKE '%companiestest.com'`);
    if (companyId) {
      await dataSource.query(`DELETE FROM companies WHERE id = ${companyId}`);
    }
    await app.close();
  });

  it('POST /companies — super_admin crea empresa', async () => {
    const res: Response = await request(app.getHttpServer())
      .post('/companies')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Test Company E2E' });

    expect(res.status).toBe(201);
    companyId = (res.body as CompanyResponse).id;
  });

  it('POST /companies — user normal recibe 403', async () => {
    const res: Response = await request(app.getHttpServer())
      .post('/companies')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Otra Company' });

    expect(res.status).toBe(403);
  });

  it('GET /companies — super_admin lista empresas', async () => {
    const res: Response = await request(app.getHttpServer())
      .get('/companies')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
  });

  it('GET /companies/:id — super_admin obtiene empresa por id', async () => {
    const res: Response = await request(app.getHttpServer())
      .get(`/companies/${companyId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect((res.body as CompanyResponse).id).toBe(companyId);
  });

  it('PATCH /companies/:id — super_admin actualiza empresa', async () => {
    const res: Response = await request(app.getHttpServer())
      .patch(`/companies/${companyId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Test Company E2E Actualizada' });

    expect(res.status).toBe(200);
  });

  it('DELETE /companies/:id — super_admin elimina empresa', async () => {
    const res: Response = await request(app.getHttpServer())
      .delete(`/companies/${companyId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    companyId = 0;
  });
});