import ENV from "@/utils/env";
import mqtt from "mqtt";

const mqttSingleton = () => {
  const client = mqtt.connect(ENV.APP_MQTT_URL, {
    // username: ENV.APP_MQTT_USERNAME,
    // password: ENV.APP_MQTT_PASSWORD,

    port: ENV.APP_MQTT_PORT,
    clientId: "u-locker_mqtt",
    clean: true,
    connectTimeout: 4000,
    protocol: "mqtt",
  });

  client.on("connect", () => {
    console.log("[🐶]: Connected to MQTT broker");

    client.subscribe(ENV.APP_MQTT_TOPIC_RESPONSE, (err) => {
      if (err) {
        console.error("[🐶]: Error subscribing to topic", err);
        return;
      }

      console.log("[🐶]: Subscribed to topic");
    });
  });

  client.on("error", (err) => {
    console.error("[🐶]: MQTT error", err);
  });

  return client;
};

declare global {
  // eslint-disable-next-line no-var
  var mqttGlobal: undefined | ReturnType<typeof mqttSingleton>;
}

const mq =
  (globalThis.mqttGlobal as mqtt.MqttClient) ??
  (mqttSingleton() as mqtt.MqttClient);

export default mq;

globalThis.mqttGlobal = mq;
