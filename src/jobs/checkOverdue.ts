import Cron from "croner";
import db from "@/services/db";

const checkOverdue = async () => {
  const activeRent = await db.renting.findMany({
    where: {
      status: "ACTIVE",
    },
  });

  const overdueRent = activeRent.filter((rent) => {
    const endTime = new Date(rent.endTime);
    const currentTime = new Date();

    return endTime < currentTime;
  });

  await db.renting.updateMany({
    where: {
      id: {
        in: overdueRent.map((rent) => rent.id),
      },
    },
    data: {
      status: "OVERDUE",
    },
  });

  console.log("[🦊]: Checked overdue rent");
};

const checkOverdueJob = () => {
  return new Cron("0 * * * *", checkOverdue, {
    name: "Check Overdue",
    timezone: "Asia/Jakarta",
    protect: true,
  });
};

export default checkOverdueJob;
