// test/auth.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

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
    await dataSource.query(`DELETE FROM users WHERE email = 'auth@test.com'`);
    await app.close();
  });

  it('POST /auth/register — registra un usuario correctamente', async () => {
    const res: Response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'auth@test.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect((res.body as AuthResponse).access_token).toBeDefined();
    expect((res.body as AuthResponse).refresh_token).toBeDefined();
  });

  it('POST /auth/register — rechaza email duplicado', async () => {
    const res: Response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'auth@test.com', password: 'password123' });

    expect(res.status).toBe(409);
  });

  it('POST /auth/login — login correcto', async () => {
    const res: Response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'auth@test.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect((res.body as AuthResponse).access_token).toBeDefined();
  });

  it('POST /auth/login — rechaza credenciales incorrectas', async () => {
    const res: Response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'auth@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('POST /auth/refresh — refresca el token correctamente', async () => {
    const loginRes: Response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'auth@test.com', password: 'password123' });

    const { refresh_token } = loginRes.body as AuthResponse;

    const res: Response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token });

    expect(res.status).toBe(201);
    expect((res.body as AuthResponse).access_token).toBeDefined();
  });

  it('POST /auth/refresh — rechaza token inválido', async () => {
    const res: Response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: 'token_invalido' });

    expect(res.status).toBe(401);
  });
});