-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "country" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "accountNumberLast4" TEXT NOT NULL,
    "accountNumberEnc" TEXT NOT NULL,
    "routingCodeEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankAccount_userId_idx" ON "BankAccount"("userId");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
