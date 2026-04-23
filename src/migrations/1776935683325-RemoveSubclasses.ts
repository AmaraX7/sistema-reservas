import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveSubclasses1776935683325 implements MigrationInterface {
    name = 'RemoveSubclasses1776935683325'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_6ef375507e3ef53de4f0db5dbc"`);
        await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "capacity"`);
        await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "floor"`);
        await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "building"`);
        await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "hasCampusView"`);
        await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "hasTV"`);
        await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "brand"`);
        await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "ram"`);
        await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "storage"`);
        await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "os"`);
        await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "materialtype"`);
        await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "requirestraining"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "resources" ADD "requirestraining" boolean`);
        await queryRunner.query(`ALTER TABLE "resources" ADD "materialtype" character varying`);
        await queryRunner.query(`ALTER TABLE "resources" ADD "os" character varying`);
        await queryRunner.query(`ALTER TABLE "resources" ADD "storage" integer`);
        await queryRunner.query(`ALTER TABLE "resources" ADD "ram" integer`);
        await queryRunner.query(`ALTER TABLE "resources" ADD "brand" character varying`);
        await queryRunner.query(`ALTER TABLE "resources" ADD "hasTV" boolean`);
        await queryRunner.query(`ALTER TABLE "resources" ADD "hasCampusView" boolean`);
        await queryRunner.query(`ALTER TABLE "resources" ADD "building" character varying`);
        await queryRunner.query(`ALTER TABLE "resources" ADD "floor" integer`);
        await queryRunner.query(`ALTER TABLE "resources" ADD "capacity" integer`);
        await queryRunner.query(`CREATE INDEX "IDX_6ef375507e3ef53de4f0db5dbc" ON "resources" ("type") `);
    }

}
