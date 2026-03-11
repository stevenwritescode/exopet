import express from "express";
import bodyParser from "body-parser";
import { DataManager, initGpio } from "./data/common.data";
import cors, { CorsOptions } from "cors";
import sudo from "sudo-prompt";
import Bonjour from "bonjour-service";
import tankController from "./controllers/Tank.controller";
import animalController from "./controllers/Animal.controller";
import maintenanceController from "./controllers/Maintenance.controller";
import logController from "./controllers/Log.controller";
import healthCheck from "./healthCheck";

const app = express();
const port = parseInt(process.env.API_PORT || "3001", 10);

const jsonParser = bodyParser.json({ limit: "5mb" });
const urlencodedParser = bodyParser.urlencoded({
  limit: "5mb",
  extended: true,
});

const corsOptions: CorsOptions = {
  origin: [
    /^http:\/\/\d+\.\d+\.\d+\.\d+:\d+$/,            // LAN IPs
    /^http:\/\/localhost:\d+$/,                     // localhost
    /^https?:\/\/exopet-ui\.local(?::\d+)?$/,       // any port on exopet-ui.local
    /^file:\/\/.+$/                                 // file:// URIs
  ],
  allowedHeaders: ["Content-Type"],
  credentials: true,
};

app.use(cors(corsOptions));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});
app.post('/network', (req, res) => {
  const ssid = req.body.ssid;
  const password = req.body.password;
  const cmd = `wpa_passphrase "${ssid}" "${password}" | sudo tee /etc/wpa_supplicant/wpa_supplicant.conf > /dev/null && sudo wpa_cli -i wlan0 reconfigure`;

  sudo.exec(cmd, {name: 'WiFi Settings Update'},
      function(error) {
          if (error) throw error;
          res.send("WiFi settings updated. Please reconnect if necessary.");
      });
});
app.use("/_health", healthCheck);
app.use("/tank", jsonParser, urlencodedParser, tankController);
app.use("/animal", jsonParser, urlencodedParser, animalController);
app.use("/maintenance", jsonParser, urlencodedParser, maintenanceController);
app.use("/log", jsonParser, urlencodedParser, logController);

// Start the Express server
export const server = app.listen(port, '0.0.0.0', async () => {
  console.log(`Exopet Server listening at http://localhost:${port}`);
  initGpio();
  await DataManager.initSocket(server);

  // Advertise via Bonjour/mDNS for iOS auto-discovery
  const bonjour = new Bonjour();
  bonjour.publish({
    name: "ExoPet Aquarium Controller",
    type: "exopet",
    port: port,
    txt: { version: "1.0" },
  });
  console.log(`Bonjour: advertising _exopet._tcp on port ${port}`);
});

