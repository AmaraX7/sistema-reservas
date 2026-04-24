import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveSubclasses1776935683325 implements MigrationInterface {
    name = 'RemoveSubclasses1776935683325'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // migración legacy, no aplica a BD nueva
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // migración legacy, no aplica a BD nueva
    }
}