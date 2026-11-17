-- AlterTable
ALTER TABLE "Poem" ADD COLUMN     "fame" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Poet" ADD COLUMN     "fame" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Poem_fame_idx" ON "Poem"("fame");

-- CreateIndex
CREATE INDEX "Poet_fame_idx" ON "Poet"("fame");
