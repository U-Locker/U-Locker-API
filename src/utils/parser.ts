import { lockerUpdatableSchema } from "@/models/locker";

export type Payload = {
  machineId: string;
  command: string;
  data?: string;
};

export class InvalidPayload extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPayload";
  }
}

// payload is separated by #
export const parsePayload = (payload: string) => {
  const [machineId, command, data] = payload.split("#");

  const validateMachineId = lockerUpdatableSchema
    .pick({
      machineId: true,
    })
    .parseAsync({ machineId });

  if (!machineId || !command) {
    throw new InvalidPayload("Invalid payload");
  }

  if (!validateMachineId) {
    throw new InvalidPayload("Invalid machineId");
  }

  return { machineId, command, data } as Payload;
};
