import Cron from "croner";
import db from "@/services/db";

const resetCredit = async () => {
  await db.user.updateMany({
    data: {
      credits: 72, // reset to 72
    },
  });

  console.log("[🦊]: Credit resetted to 72");
};

const resetCreditJob = () => {
  return new Cron("0 0 * * 1", resetCredit, {
    name: "Reset Credit",
    timezone: "Asia/Jakarta",
    protect: true,
  });
};

export default resetCreditJob;
