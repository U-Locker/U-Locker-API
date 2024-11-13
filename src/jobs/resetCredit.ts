import Cron from "croner";
import db from "@/services/db";

const resetCredit = async () => {
  // add 3 free credits to all users
  const users = await db.user.findMany({
    select: {
      id: true,
    },
  });

  const trx = users.map(
    async (user) =>
      await db.transaction.create({
        data: {
          userId: user.id,
          amount: 3,
          type: "IN",
          transactionID: crypto.randomUUID(),
          validatedAt: new Date(),
        },
      })
  );

  await Promise.all(trx);

  console.log("[🦊]: Added 3 free weekly credits");
};

const resetCreditJob = () => {
  return new Cron("0 0 * * 1", resetCredit, {
    name: "Reset Credit",
    timezone: "Asia/Jakarta",
    protect: true,
  });
};

export default resetCreditJob;
