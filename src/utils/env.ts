const envs = [
  "NODE_ENV",
  "APP_PORT",
  "APP_FQDN",
  "APP_JWT_SECRET",
  "APP_DATABASE_URL",
  "APP_MQTT_URL",
  "APP_MQTT_USERNAME",
  "APP_MQTT_PASSWORD",
  "APP_MQTT_TOPIC",
];

envs.forEach((env) => {
  if (!Bun.env[env]) {
    console.error("[Error]: Environment variable not found: ", env);
    process.exit(-1);
  }
});

const ENV = {
  NODE_ENV: Bun.env.NODE_ENV || "development",
  APP_PORT: Number(Bun.env.APP_PORT) || 8080,
  APP_FQDN: Bun.env.APP_FQDN || "http://localhost:8080",
  APP_JWT_SECRET: Bun.env.APP_JWT_SECRET || "chipichipichapachapa",
  APP_DATABASE_URL:
    Bun.env.APP_DB_URL || "mysql://root@localhost:3306/mxm24_db",
  APP_MQTT_URL: Bun.env.APP_MQTT_URL || "mqtt://localhost:1883",
  APP_MQTT_USERNAME: Bun.env.APP_MQTT_USERNAME || "admin",
  APP_MQTT_PASSWORD: Bun.env.APP_MQTT_PASSWORD || "secret123!",
  APP_MQTT_TOPIC: Bun.env.APP_MQTT_TOPIC || "/u-locker",
};

export default ENV;
