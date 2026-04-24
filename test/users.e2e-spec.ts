// test/users.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

interface UserResponse {
  id: number;
  email: string;
  role: string;
}

describe('Users (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userToken: string;
  let adminToken: string;
  let superAdminToken: string;
  let companyId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    dataSource = moduleFixture.get(DataSource);

    const company = await dataSource.query<{ id: number }[]>(
      `INSERT INTO companies (name) VALUES ('Users Test Company') RETURNING id`,
    );
    companyId = company[0].id;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'user@userstest.com', password: 'password123' });

    const userRes: Response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@userstest.com', password: 'password123' });
    userToken = (userRes.body as AuthResponse).access_token;

const hashedPassword = await bcrypt.hash('password123', 10);
await dataSource.query(
  `INSERT INTO users (email, password, role, "companyId") VALUES ('admin@userstest.com', '${hashedPassword}', 'company_admin', ${companyId})`,
);
    const adminRes: Response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@userstest.com', password: 'password123' });
    adminToken = (adminRes.body as AuthResponse).access_token;

await dataSource.query(
  `INSERT INTO users (email, password, role) VALUES ('superadmin@userstest.com', '${hashedPassword}', 'super_admin')`,
);
    const superRes: Response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'superadmin@userstest.com', password: 'password123' });
    superAdminToken = (superRes.body as AuthResponse).access_token;
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM users WHERE email LIKE '%userstest.com'`);
    await dataSource.query(`DELETE FROM companies WHERE id = ${companyId}`);
    await app.close();
  });

  it('GET /users/me — devuelve perfil propio', async () => {
    const res: Response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect((res.body as UserResponse).email).toBe('user@userstest.com');
  });

  it('GET /users/me — rechaza sin token', async () => {
    const res: Response = await request(app.getHttpServer()).get('/users/me');
    expect(res.status).toBe(401);
  });

  it('PATCH /users/me — actualiza perfil propio', async () => {
    const res: Response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ email: 'user@userstest.com' });

    expect(res.status).toBe(200);
  });

  it('GET /users — super_admin ve todos los usuarios', async () => {
    const res: Response = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
  });

  it('GET /users — user normal recibe 403', async () => {
    const res: Response = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });
});