import Cron from "croner";
import db from "@/services/db";

const resetCredit = async () => {
  await db.user.updateMany({
    data: {
      credits: {
        increment: 3, // increment 3 jam
      },
    },
  });

  console.log("[🦊]: Credit resetted to 24");
};

const resetCreditJob = () => {
  return new Cron("0 0 * * 1", resetCredit, {
    name: "Reset Credit",
    timezone: "Asia/Jakarta",
    protect: true,
  });
};

export default resetCreditJob;
