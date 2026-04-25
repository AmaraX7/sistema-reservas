import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteUsers1777030514871 implements MigrationInterface {
  name = 'AddSoftDeleteUsers1777030514871';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "deletedAt" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deletedAt"`);
  }
}
