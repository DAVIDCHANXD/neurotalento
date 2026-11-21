CREATE TABLE "FamilyInvitation" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "creatorId" UUID NOT NULL,
  "courseKey" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FamilyInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FamilyInvitation_code_key" ON "FamilyInvitation"("code");
CREATE INDEX "FamilyInvitation_creatorId_courseKey_idx" ON "FamilyInvitation"("creatorId", "courseKey");
ALTER TABLE "FamilyInvitation" ADD CONSTRAINT "FamilyInvitation_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
