export interface CodeSnippet {
  language: string;
  code: string;
}

export interface GuideStep {
  title: string;
  body: string[];
  code?: CodeSnippet[];
  partIds?: string[];
  imageAlt?: string;
}

export interface Walkthrough {
  slug: 'api-hub' | 'touchscreen';
  title: string;
  intro: string;
  duration: string;
  difficulty: string;
  steps: GuideStep[];
}

export const walkthroughs: Walkthrough[] = [
  {
    slug: 'api-hub',
    title: 'Build the ExoPet API Hub',
    intro:
      'The hub is the brain of your ExoPet: a Raspberry Pi that runs the API server, talks to sensors over GPIO, and switches pumps and valves through a relay board. Everything runs locally — no cloud account, no subscription.',
    duration: '2–3 hours',
    difficulty: 'Beginner-friendly',
    steps: [
      {
        title: 'Flash Raspberry Pi OS Lite',
        body: [
          'Download the Raspberry Pi Imager on your computer and flash Raspberry Pi OS Lite (64-bit) to one of the microSD cards. The hub runs headless — no desktop needed.',
          'Before writing, open the Imager’s settings (the gear icon) and enable SSH, set a username and password, and configure your Wi-Fi network. This lets you set up the Pi without ever plugging in a monitor.',
        ],
        partIds: ['raspberry-pi-4', 'microsd-32gb'],
        imageAlt: 'Raspberry Pi Imager with OS Lite selected and SSH enabled in advanced options',
      },
      {
        title: 'Boot the Pi and install Docker',
        body: [
          'Insert the card, power the Pi, and give it a minute to join your network. Find its IP address from your router’s device list, then SSH in.',
          'Install git and Docker using the official convenience script, and add your user to the docker group so you can run containers without sudo.',
        ],
        code: [
          {
            language: 'bash',
            code: 'ssh pi@<hub-ip-address>\nsudo apt update && sudo apt install -y git\ncurl -fsSL https://get.docker.com | sh\nsudo usermod -aG docker $USER\n# log out and back in for the group change to apply',
          },
        ],
        partIds: ['usbc-power-supply'],
        imageAlt: 'Terminal showing a successful SSH session into the hub Pi',
      },
      {
        title: 'Clone the ExoPet repository',
        body: [
          'The hub software, touchscreen UI, and shared data models all live in one repository. Clone it into your home directory.',
        ],
        code: [
          {
            language: 'bash',
            code: 'git clone https://github.com/exopet/exopet.git\ncd exopet',
          },
        ],
        imageAlt: 'Terminal showing the ExoPet repository cloned onto the Pi',
      },
      {
        title: 'Wire the relay board to the GPIO header',
        body: [
          'Power the Pi down first. Connect the relay board’s VCC to a 5V pin, GND to a ground pin, and each relay input channel (IN1–IN8) to a free GPIO pin using female-female jumper wires. Note which GPIO number drives which channel — you’ll map these in the ExoPet UI later.',
          'Opto-isolated relay boards keep the switching side electrically separate from the Pi, which is exactly what you want next to water.',
        ],
        partIds: ['relay-board-8ch', 'jumper-wires'],
        imageAlt: 'Relay board connected to Raspberry Pi GPIO header with labeled jumper wires',
      },
      {
        title: 'Connect pumps and valves through the relays',
        body: [
          'Each pump and valve gets its 12V positive lead routed through a relay’s COM and NO (normally-open) terminals. When ExoPet energizes the relay, the circuit closes and the device runs.',
          'Use normally-closed solenoid valves for anything holding back water: if power fails, they close and the water stays where it is. Add a check valve on every line that could siphon.',
          'Distribute 12V from the power supply with barrel-jack splitters, and put an inline fuse on the main 12V feed.',
        ],
        partIds: [
          'peristaltic-pump',
          'solenoid-valve',
          'return-pump',
          'psu-12v',
          'barrel-splitters',
          'inline-fuses',
          'check-valves',
          'tubing',
          'sump-container',
        ],
        imageAlt: 'Wiring diagram: 12V supply through relay contacts to dosing pumps and solenoid valves',
      },
      {
        title: 'Connect the temperature sensor',
        body: [
          'The DS18B20 uses the 1-Wire protocol: connect its red lead to 3.3V, black to ground, and yellow (data) to GPIO 4. Bridge the data and 3.3V lines with the 4.7kΩ pull-up resistor.',
          'Enable the 1-Wire interface, then reboot.',
        ],
        code: [
          {
            language: 'bash',
            code: "echo 'dtoverlay=w1-gpio' | sudo tee -a /boot/firmware/config.txt\nsudo reboot",
          },
        ],
        partIds: ['ds18b20-sensor', 'resistor-4k7'],
        imageAlt: 'DS18B20 probe wired to the GPIO header with a pull-up resistor between data and 3.3V',
      },
      {
        title: 'Start the hub',
        body: [
          'The repository ships with a Docker Compose file that builds and runs the API. It maps the Pi’s GPIO device (/dev/gpiomem) into the container and exposes the API on port 3001, restarting automatically on boot or crash.',
        ],
        code: [
          {
            language: 'bash',
            code: 'cd ~/exopet/api\ndocker compose up -d --build',
          },
        ],
        imageAlt: 'Terminal showing the exopet-api container up and healthy',
      },
      {
        title: 'Verify the hub is alive',
        body: [
          'From any computer on your network, hit the API. You should get a response from the health check.',
          'The hub also announces itself on your network with Bonjour/mDNS, so the touchscreen UI and the ExoPet iOS app can discover it automatically — no IP addresses to remember.',
        ],
        code: [
          {
            language: 'bash',
            code: 'curl http://<hub-ip-address>:3001/',
          },
        ],
        imageAlt: 'Health check response from the ExoPet API in a terminal',
      },
    ],
  },
  {
    slug: 'touchscreen',
    title: 'Build the Touchscreen Control Panel',
    intro:
      'A second Raspberry Pi drives the official 7-inch touchscreen and boots straight into the ExoPet control panel — a wall-mountable kiosk for day-to-day control of lights, pumps, feeding, and water changes.',
    duration: '1–2 hours',
    difficulty: 'Beginner-friendly',
    steps: [
      {
        title: 'Assemble the Pi and touchscreen',
        body: [
          'Mount the Pi to the back of the 7-inch touchscreen with the included standoffs and connect the DSI ribbon cable between the display board and the Pi’s DISPLAY port.',
          'Power the display board from the Pi’s GPIO 5V and ground pins with the included jumpers, or give each its own USB-C supply.',
          'A case or stand ties it all together — buy one, or print the stand from our Downloads page.',
        ],
        partIds: ['raspberry-pi-4', 'pi-touchscreen', 'touchscreen-case'],
        imageAlt: 'Raspberry Pi mounted on the back of the official 7-inch touchscreen',
      },
      {
        title: 'Flash Raspberry Pi OS (with desktop)',
        body: [
          'The kiosk needs a graphical session, so flash full Raspberry Pi OS (64-bit, with desktop) this time. As before, pre-configure SSH, a user (name it exopet to match the paths below), and Wi-Fi in the Imager settings.',
          'Boot the Pi and set the desktop to auto-login (it usually is by default on Raspberry Pi OS).',
        ],
        partIds: ['microsd-32gb', 'usbc-power-supply'],
        imageAlt: 'Raspberry Pi Imager flashing Raspberry Pi OS with desktop',
      },
      {
        title: 'Install the ExoPet UI',
        body: [
          'SSH in (or open a terminal on the desktop), install Node.js and git, and clone the repository. Then install the UI’s dependencies.',
        ],
        code: [
          {
            language: 'bash',
            code: 'sudo apt update && sudo apt install -y git nodejs npm\ngit clone https://github.com/exopet/exopet.git /home/exopet/exopet\ncd /home/exopet/exopet/ui\nnpm install',
          },
        ],
        imageAlt: 'Terminal showing npm install completing in the ui directory',
      },
      {
        title: 'Install the kiosk service',
        body: [
          'ExoPet ships a startup script (ui/start-kiosk.sh) that launches the interface and an Electron window in kiosk mode. A small systemd service runs it on every boot.',
          'Create the service file, then enable it:',
        ],
        code: [
          {
            language: 'ini',
            code: '# /etc/systemd/system/exopet-kiosk.service\n[Unit]\nDescription=ExoPet Kiosk UI\nAfter=graphical.target\n\n[Service]\nUser=exopet\nEnvironment=DISPLAY=:0\nExecStart=/home/exopet/exopet/ui/start-kiosk.sh\nRestart=on-failure\n\n[Install]\nWantedBy=graphical.target',
          },
          {
            language: 'bash',
            code: 'sudo systemctl daemon-reload\nsudo systemctl enable exopet-kiosk.service',
          },
        ],
        imageAlt: 'systemd unit file for the ExoPet kiosk service in a text editor',
      },
      {
        title: 'Reboot into kiosk mode',
        body: [
          'Reboot the Pi. The service waits for the interface to come up on port 3000, then opens it full-screen in Electron — no desktop, no browser chrome, just the ExoPet control panel.',
        ],
        code: [
          {
            language: 'bash',
            code: 'sudo reboot',
          },
        ],
        imageAlt: 'Touchscreen booted into the full-screen ExoPet control panel',
      },
      {
        title: 'Connect to your hub',
        body: [
          'On first launch the UI searches your network for ExoPet hubs via Bonjour and lists what it finds — tap yours to connect. If discovery is blocked on your network, enter the hub’s address manually as <hub-ip-address>:3001.',
          'That’s it. Set up your enclosure, map your relay channels to pumps and valves, and schedule your first automated water change.',
        ],
        imageAlt: 'Hub discovery screen on the touchscreen listing an ExoPet hub',
      },
    ],
  },
];

export function walkthroughBySlug(slug: string): Walkthrough {
  const w = walkthroughs.find((x) => x.slug === slug);
  if (!w) throw new Error(`Unknown walkthrough: ${slug}`);
  return w;
}
