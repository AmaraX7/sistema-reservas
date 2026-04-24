import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchemaInicial1777022421903 implements MigrationInterface {
  name = 'SchemaInicial1777022421903';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // tablas base
    await queryRunner.query(
      `CREATE TABLE "companies" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_3dacbb3eb4f095e29372ff8e131" UNIQUE ("name"), CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'company_admin', 'super_admin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "companyId" integer, CONSTRAINT "UQ_users_email" UNIQUE ("email"), CONSTRAINT "PK_users" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."resources_status_enum" AS ENUM('AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "resources" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "status" "public"."resources_status_enum" NOT NULL, "location" character varying NOT NULL, "type" character varying NOT NULL, "capacity" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "companyId" integer NOT NULL, CONSTRAINT "PK_resources" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reservations_status_enum" AS ENUM('CONFIRMED', 'CANCELLED', 'COMPLETED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reservations" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "resourceId" integer NOT NULL, "status" "public"."reservations_status_enum" NOT NULL DEFAULT 'CONFIRMED', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "startTime" TIMESTAMP NOT NULL, "endTime" TIMESTAMP NOT NULL, CONSTRAINT "PK_reservations" PRIMARY KEY ("id"))`,
    );

    // foreign keys
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "resources" ADD CONSTRAINT "FK_resources_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "FK_reservations_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "FK_reservations_resource" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT "FK_reservations_resource"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT "FK_reservations_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resources" DROP CONSTRAINT "FK_resources_company"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_company"`,
    );
    await queryRunner.query(`DROP TABLE "reservations"`);
    await queryRunner.query(`DROP TYPE "public"."reservations_status_enum"`);
    await queryRunner.query(`DROP TABLE "resources"`);
    await queryRunner.query(`DROP TYPE "public"."resources_status_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TABLE "companies"`);
  }
}
