export interface Kit {
  id: string;
  name: string;
  tagline: string;
  expectedPrice: string;
  contents: string[];
}

export const kits: Kit[] = [
  {
    id: 'hub-kit',
    name: 'Hub Kit',
    tagline: 'The brain, ready to plug in.',
    expectedPrice: '$199',
    contents: [
      'Raspberry Pi 4 with pre-flashed ExoPet SD card',
      '8-channel opto-isolated relay board, pre-wired to the GPIO header',
      'DS18B20 waterproof temperature sensor with pull-up fitted',
      '3D-printed hub case and relay mount',
      '12V 5A power supply with fused distribution harness',
    ],
  },
  {
    id: 'full-aquarium-kit',
    name: 'Full Aquarium Kit',
    tagline: 'Everything for automated water changes, dosing, and monitoring.',
    expectedPrice: '$449',
    contents: [
      'Everything in the Hub Kit',
      'Raspberry Pi 4 + official 7" touchscreen, pre-configured kiosk',
      '2× peristaltic dosing pumps with mounting bracket',
      '2× normally-closed solenoid valves with check valves',
      'Return pump, tubing set, and sensor probe holder',
      '3D-printed touchscreen stand',
    ],
  },
  {
    id: 'terrarium-kit',
    name: 'Terrarium Kit',
    tagline: 'Misting, humidity, and heat control for reptiles and amphibians.',
    expectedPrice: '$379',
    contents: [
      'Everything in the Hub Kit',
      'Raspberry Pi 4 + official 7" touchscreen, pre-configured kiosk',
      'Misting pump with nozzle set and tubing',
      'Temperature + humidity sensor pack',
      '3D-printed touchscreen stand and cable combs',
    ],
  },
];
