const {Client} = require('tplink-smarthome-api');
const {InfluxDB, Point} = require('@influxdata/influxdb-client');

const influxToken = process.env.NODE_INFLUX_TOKEN;
const influxUrl = process.env.NODE_INFLUX_URL;
const influxOrg = process.env.NODE_INFLUX_ORG;
const influxBucket = process.env.NODE_INFLUX_BUCKET;
const tpLinkHost = process.env.NODE_TPLINK_IP;
const enableLog = ['1', 'true'].includes(process.env.NODE_ENABLE_LOG);
const scanInterval = process.env.NODE_INTERVAL_SECONDS ? Math.max(1, parseInt(process.env.NODE_INTERVAL_SECONDS, 10)) * 1000 : 10000;

async function init() {
  const client = new Client();
  const plug = await client.getDevice({host: tpLinkHost});

  const influxDB = new InfluxDB({url: influxUrl, token: influxToken})
  const writeClient = influxDB.getWriteApi(influxOrg, influxBucket, 'ns');
  const info = await plug.getInfo();
  writeClient.useDefaultTags({device_model: info.sysInfo.model, device_id: info.sysInfo.deviceId, alias: info.sysInfo.alias});

  async function writePowerUsage() {
    const info = await plug.getInfo();
    const point = new Point('power_meter')
      .floatField('current', info.emeter.realtime.current)
      .floatField('power', info.emeter.realtime.power)
      .floatField('total', info.emeter.realtime.total);

    if (enableLog) {
      console.log((new Date()).toISOString() + ' - Writing point power = ' + info.emeter.realtime.power + ', current = ' + info.emeter.realtime.current);
    }
    writeClient.writePoint(point);
    await writeClient.flush();
    // await writeClient.close();
  }

  writePowerUsage();
  setInterval(writePowerUsage, scanInterval);
}

init();