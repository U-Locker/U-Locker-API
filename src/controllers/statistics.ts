import type { Request, Response } from "express";
import db from "@/services/db";
import { success, badRequest } from "@/utils/responses";

export const dashboardStatistic = async (req: Request, res: Response) => {
  const totalLocker = await db.locker.count();
  const totalActiveRent = await db.renting.count({
    where: {
      status: {
        in: ["ACTIVE", "OVERDUE"],
      },
    },
  });
  const clients = await db.user.count();
  const totalRoom = await db.rooms.count();
  const totalCashflowIn = await db.transaction.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      type: "IN",
    },
  });

  const totalCashflowOut = await db.transaction.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      type: "OUT",
    },
  });

  return success(res, "Dashboard Statistics", {
    totalLocker,
    totalActiveRent,
    clients,
    totalRoom,
    totalCashflowIn: totalCashflowIn._sum.amount,
    totalCashflowOut: totalCashflowOut._sum.amount,
  });
};

export const totalEarning = async (req: Request, res: Response) => {
  const totalCashflowIn = await db.transaction.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      type: "IN",
      validatedAt: {
        not: null,
      },
    },
  });

  return success(res, "Total Earning", totalCashflowIn._sum.amount);
};

export const mostUsedLocker = async (req: Request, res: Response) => {
  const mostUsedLocker = await db.renting.groupBy({
    by: ["roomId"],
    _count: {
      roomId: true,
    },

    orderBy: {
      _count: {
        roomId: "desc",
      },
    },
  });

  return success(res, "Most Used Locker", mostUsedLocker[0]);
};

export const totalRented = async (req: Request, res: Response) => {
  const { period } = req.query;

  const allowedPeriod = ["daily", "weekly", "monthly"];
  if (!allowedPeriod.includes(period as string)) {
    return badRequest(res, "Invalid period");
  }

  if (period === "daily") {
    const totalRented = await db.renting.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59)),
        },
      },
    });

    return success(res, "Total Rented daily", totalRented);
  }

  if (period === "weekly") {
    const totalRented = await db.renting.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 7)),
        },
      },
    });

    return success(res, "Total Rented weekly", totalRented);
  }

  // by default, monthly
  const totalRented = await db.renting.count({
    where: {
      createdAt: {
        gte: new Date(new Date().setDate(new Date().getDate() - 30)),
      },
    },
  });

  return success(res, "Total Rented monthly", totalRented);
};

export const leaderboard = async (req: Request, res: Response) => {
  const leaderboard = await db.renting.groupBy({
    by: ["userId"],
    _count: {
      userId: true,
    },
    orderBy: {
      _count: {
        userId: "desc",
      },
    },
    take: 5,
  });

  // find user from userId
  const users = await db.user.findMany({
    where: {
      id: {
        in: leaderboard.map((l) => l.userId),
      },
    },
  });

  const result = leaderboard.map((l) => {
    const user = users.find((u) => u.id === l.userId);
    return {
      user: {
        id: user?.id,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
      },
      totalRent: l._count.userId,
    };
  });

  return success(res, "Leaderboard", result);
};

// ? masih bingung sih ini implement gimana
// export const history = async (req: Request, res: Response) => {

// };

export const userDashboardHistory = async (req: Request, res: Response) => {
  const userId = req.user.data.id;

  const rents = await db.renting.findMany({
    where: {
      userId,
    },
  });

  const totalRents = rents.length;

  const totalRentHours = rents
    .map((r) => {
      const start = new Date(r.startTime);
      const end = new Date(r.endTime);

      return Math.abs(end.getTime() - start.getTime()) / 36e5;
    })
    .reduce((acc, curr) => acc + curr, 0);

  const creditsIn = await db.transaction.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      userId,
      type: "IN",
      validatedAt: {
        not: null,
      },
    },
  });

  const creditsOut = await db.transaction.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      userId,
      type: "OUT",
    },
  });

  const availableCredits =
    (creditsIn._sum.amount ?? 0) - (creditsOut._sum.amount ?? 0);

  return success(res, "User dashboard history", {
    totalRents,
    totalRentHours,
    availableCredits,
  });
};

// [1,5,67,8,9]

export const rentTimeline = async (req: Request, res: Response) => {
  const { period } = req.query;

  const allowedPeriod = ["daily", "weekly", "monthly"];
  if (!allowedPeriod.includes(period as string)) {
    return badRequest(res, "Invalid period");
  }

  if (period === "daily") {
    const rentTimeline = await db.renting.groupBy({
      by: ["createdAt"],
      _count: {
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59)),
        },
      },
    });

    return success(res, "Rent Timeline daily", rentTimeline);
  }

  if (period === "weekly") {
    const rentTimeline = await db.renting.groupBy({
      by: ["createdAt"],
      _count: {
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 7)),
        },
      },
    });

    return success(res, "Rent Timeline weekly", rentTimeline);
  }

  // by default, monthly
  const rentTimeline = await db.renting.groupBy({
    by: ["createdAt"],
    _count: {
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    where: {
      createdAt: {
        gte: new Date(new Date().setDate(new Date().getDate() - 30)),
      },
    },
  });

  return success(res, "Rent Timeline monthly", rentTimeline);
};
